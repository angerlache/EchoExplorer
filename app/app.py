from flask import Flask, render_template, request, jsonify,send_from_directory, url_for, redirect, flash, session, send_file, make_response
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.schema import PrimaryKeyConstraint
from flask_login import UserMixin, login_user, LoginManager, login_required, logout_user, current_user
from flask_wtf import FlaskForm
from flask_login import current_user
from flask_sslify import SSLify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import select,create_engine
from sqlalchemy.orm import Session
import sqlalchemy.orm.session
import sqlite3
from pydub import AudioSegment
import boto3
import urllib.parse
import urllib.request
import http.client
import subprocess

from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import InputRequired, Length, ValidationError
from flask_bcrypt import Bcrypt

from sqlalchemy.orm import DeclarativeBase,Mapped, mapped_column
from sqlalchemy import Integer, String
import os
import io
from werkzeug.utils import secure_filename
import shutil
import json
import uuid
import requests
# start mongodb : sudo systemctl start mongod
# stop mongodb : sudo systemctl stop mongod
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

os.environ['NO_PROXY'] = 'https://gotham.inl.ovh'

app = Flask(__name__)

client = MongoClient("localhost", 27017)
db = client.mymongodb
annotations = db.annotations
local_annotations = db.local_annotations

sslify = SSLify(app)
"""limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://", # change storage for production
)"""

work_dir = ""


ALLOWED_EXTENSIONS = {'wav'}
UPLOAD_FOLDER = 'uploads'
ALTERNATE_UPLOAD_FOLDER = '../AI/data/samples'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALTERNATE_UPLOAD_FOLDER'] = ALTERNATE_UPLOAD_FOLDER
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SECRET_KEY'] = uuid.uuid4().hex # good secret key



class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
#engine = create_engine('sqlite:///instance/database.db',echo=True)
#Base.metadata.create_all(engine)
#sess = Session(bind=engine)

class User(db.Model, UserMixin):
    id: Mapped[int] = mapped_column(primary_key=True) #  db.Column(db.Integer,primary_key=True)
    username: Mapped[str] = mapped_column(unique=True,nullable=False) # db.Column(db.String(20), nullable=False)
    password: Mapped[str] = mapped_column(nullable=False) # db.Column(db.String(80), nullable=False)
    isExpert: Mapped[bool] = mapped_column(default=False,nullable=False)

class File(db.Model):
    name: Mapped[str] = mapped_column(primary_key=True) # name on client's computer
    hashName: Mapped[str] = mapped_column(unique=True)
    username: Mapped[str] = mapped_column(primary_key=True)

    __table_args__ = (PrimaryKeyConstraint('name','username'), )


db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# executes this once to set up the database
with app.app_context():
    db.create_all()

bcrypt = Bcrypt(app)




class RegisterForm(FlaskForm): # FlaskForm/wtforms protects from CSRF attack thanks to StringField/PasswordField
    username = StringField(validators=[InputRequired(), Length(
        min=4, max=20)], render_kw={"placeholder": "Username"})
    
    password = PasswordField(validators=[InputRequired(), Length(
        min=4, max=20)], render_kw={"placeholder": "Password"})
    
    submit = SubmitField("Register")

    def validate_username(self, username):
        existing_user_username = User.query.filter_by(
            username=username.data).first()
        if existing_user_username:
            flash('Choose another username !')
            raise ValidationError(
                'That username already exists. Please choose a different one.')
        
class LoginForm(FlaskForm):
    username = StringField(validators=[InputRequired(), Length(
        min=4, max=20)], render_kw={"placeholder": "Username"})

    password = PasswordField(validators=[InputRequired(), Length(
        min=4, max=20)], render_kw={"placeholder": "Password"})

    submit = SubmitField('Login')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/retrieve_myfilenames', methods=['GET'])
def retrieve_myfilenames():
    which_species = request.args.get('arg')
    userfiles = []
    durations = []
    if which_species == 'all':
        documents = local_annotations.find({}, {"_id":1, "old_name": 1, "username":1, "duration":1})
    else:
        documents = local_annotations.find(
                    {"annotations": {"$elemMatch": {"label": which_species}}},
                    {"_id": 1, "old_name": 1, "username": 1, "duration": 1})

    for doc in documents:
        if doc.get('username') == current_user.username:
            durations.append(doc.get("duration"))
            userfiles.append(current_user.username+'/'+doc.get("_id")+'/'+doc.get("old_name"))

    print(userfiles)
    return jsonify({'audios':userfiles, 'durations': durations})

@app.route('/retrieve_allfilenames', methods=['GET'])
def retrieve_allfilenames():
    which_species = request.args.get('arg')
    files = []
    durations = []
    if which_species == 'all':
        documents = annotations.find({}, {"_id":1, "username":1, "duration":1})
    else:
        documents = annotations.find(
                    {"annotations": {"$elemMatch": {"label": which_species}}},
                    {"_id": 1, "username": 1, "duration": 1})
    for doc in documents:
        durations.append(doc.get("duration"))
        files.append(doc.get('username')+'/'+doc.get("_id")+'/'+doc.get("_id"))

    print(files)

    return jsonify({'audios':files, 'durations': durations})

@app.route('/main')
@login_required
def index():
    
    if current_user.is_authenticated:

        #files = [filename for filename in os.listdir(app.config['UPLOAD_FOLDER']) if filename.endswith('.wav')]       
        return render_template('index.html',username=current_user.username,isExpert=current_user.isExpert,is_logged_in=True)
    
    return render_template('index.html',is_logged_in=False)
        

@app.route('/login', methods=['GET', 'POST'])
def login():
    log_form = LoginForm()
    reg_form = RegisterForm()
    if log_form.validate_on_submit():
        user = User.query.filter_by(username=log_form.username.data).first()
        if user:
            if bcrypt.check_password_hash(user.password, log_form.password.data):
                login_user(user)
                session['is_logged_in'] = True
                return redirect(url_for('index'))
    return render_template('login_register.html', logForm=log_form, regForm=reg_form)


@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/species', methods=['GET', 'POST'])
def species():
    return render_template('species.html')

@app.route('/tips', methods=['GET', 'POST'])
def tips():
    return render_template('tips.html')

@app.route('/about', methods=['GET', 'POST'])
def about():
    return render_template('about.html',is_logged_in=current_user.is_authenticated)

@app.route('/', methods=['GET', 'POST'])
def login_register():
    log_form = LoginForm()
    reg_form = RegisterForm()
    return render_template('login_register.html', logForm=log_form, regForm=reg_form)


@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    logout_user()
    session['is_logged_in'] = False
    return redirect(url_for('login_register'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    log_form = LoginForm()
    reg_form = RegisterForm()
    if reg_form.validate_on_submit():
        hashed_password = bcrypt.generate_password_hash(reg_form.password.data)
        new_user = User(username=reg_form.username.data, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        user = User.query.filter_by(username=reg_form.username.data).first()
        login_user(user)
        session['is_logged_in'] = True
        return redirect(url_for('index'))
    return render_template('login_register.html', logForm=log_form, regForm=reg_form)


@app.route('/predicted_time', methods=['POST'])
def predicted_time():
    data = request.json

    print('Recieved data :', data)
    duration = int(data.get('time')) # used to predict time for the AI
    size = int(data.get('bytes')) # used to predict time for the server getting the uploaded file

    if data.get('AI') == 'BatML':
        response_data = {'predicted_time': duration/3 + size/1e6/1.15}

    elif data.get('AI') == 'BirdNET':
        response_data = {'predicted_time': duration/54 + size/1e6/1.15}

    elif data.get('AI') == 'BattyBirdNET':
        response_data = {'predicted_time': duration/5.5 + size/1e6/1.15}


    return jsonify(response_data)

@app.route('/process', methods=['POST'])
def process():
    if 'audio' not in request.files:
        return jsonify({'error': 'No file provided'})

    file = request.files['audio']
    session['AI'] = request.form.get('chosenAI')

    # use secure_filename (everywhere I read filename from a client) 
    secured_filename = secure_filename(file.filename)
    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    if file and allowed_file(file.filename):
        # TODO : check if file already in server

        if not current_user.is_authenticated:
            return jsonify({'error': 'user not logged in'})
        
        bucket_name = "biodiversity-lauzelle"
        print('filename = ' + secured_filename)
        query1 = File.query.filter_by(hashName=secured_filename).first()
        query2 = File.query.filter_by(name=secured_filename, username=current_user.username).first()
        print(query1)
        print(query2)
        if query1:
            print('HASHNAME FOUND')
            filename = query1.hashName
        elif query2:
            print('USERNAME AND NAME FOUND')
            filename = query2.hashName
        else:
            print('FILE NOT FOUND IN DB')
            filename = str(hash(secured_filename))+".wav"
            new_file = File(name=secured_filename, hashName=filename, username=current_user.username)
            db.session.add(new_file)
            db.session.commit()

        ## comment these lines for testing locally because s3 not available with localhost
        s3 = boto3.resource('s3', endpoint_url='https://ceph-gw1.info.ucl.ac.be')
        s3.Bucket(bucket_name).put_object(Key=current_user.username+'/'+filename,Body=file)


        data = {'message': current_user.username+'/'+filename, 'AI': session['AI']}
        json_data = json.dumps(data)
        print("request posted !")
        
        ###""" comment this block for testing locally because s3 not available with localhost
        ###### and use the csv fake_labels.csv with fake labels
        #response = requests.post('https://gotham.inl.ovh/process_on_second_machine', data=json_data, headers=headers)

        # Construct the curl command
        curl_command = ['curl', '-X', 'POST', '-H', 'Content-Type: application/json', '-d', json_data, 'https://gotham.inl.ovh/process_on_second_machine']

        # Execute the curl command
        try:
            response = subprocess.run(curl_command, capture_output=True, text=True, check=True)
            # Print the response
            res = json.loads(response.stdout)
            print("Response:", res)
            return jsonify(res)
        except subprocess.CalledProcessError as e:
            # Handle any errors
            print("Error:", e.stderr)

        #print(response)
        #print(response.json())
        print('request recieved !')
        # Save the received CSV file on the first machine
        #with open('received_classification_result_' + current_user.username + '.csv', 'wb') as f:
        #    f.write(response.content)
        ###"""

        # Process the file using your AI model function
        results = [[],[],[],[]]
        
        #with open('received_classification_result_' + current_user.username + '.csv') as resultfile:
        """with open('fake_labels.csv') as resultfile:
            next(resultfile)
            for line in resultfile:
                line = line.strip().split(',')
                if float(line[4]) > 0.5: 
                    results[0].append(line[1])
                    results[1].append(line[2])
                    results[2].append(line[3])
                    results[3].append(line[4])
                

        print(results)
        return jsonify({'result': results[2], 'start': results[0], 'end': results[1], 'probability':results[3], 'AI':session['AI']})
        """

        #return jsonify(response_data.json())

    return jsonify({'error': 'Invalid file format'})

## FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
#@app.route('/annotation/<path:path>', methods=['GET', 'POST'])
@app.route('/users/<username>/annotation/<path:path>', methods=['GET', 'POST'])
def annotation(username,path):
    path = secure_filename(path)
    print('annotation path = ' + path)
    if request.method == 'GET':
        # use secure_filename (everywhere I read filename from a client) 
        hash_name = get_hashname(path+'.wav')
        if hash_name is None:
            return
        doc = local_annotations.find_one({'filename': hash_name})
        if doc is None:
            return
        return jsonify(doc.get('annotations',{}))
        #return send_from_directory(os.path.join(work_dir, 'users', username, 'annotation'), hash_name[:-3]+'json')
        #return send_from_directory(os.path.join(work_dir, 'annotation'), path)
    
    else:
        data = request.data
        hash_name = get_hashname(path+'.wav')
        """if hash_name is None:
            hash_name = str(hash(path))#+".wav"
            new_file = File(name=path+'.wav', hashName=hash_name, username=current_user.username)
            db.session.add(new_file)
            db.session.commit()"""
        
        #output_dir = os.path.join(work_dir, 'annotation')
        output_dir = os.path.join(work_dir, 'users', username, 'annotation')
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, hash_name[:-3]+'json'), 'w') as f:
            data = data.decode('utf-8')
            data = json.loads(data)
            
            doc = {
                "_id": hash_name,
                "filename": hash_name,
                "old_name": path+'.wav',
                "username": current_user.username,
                "validated": False,
                "duration": data[0]["duration"],
                "annotations": data
            }
            local_annotations.replace_one({"_id": hash_name}, doc, upsert=True)
            
            json.dump(data, f, indent=2)
        return 'ok'
    
@app.route('/validated/<path:path>', methods=['POST'])
def validate(path):
    path = secure_filename(path)
    hash_name = get_hashname(path+'.wav')

    data = request.data
    filename = path
    #output_dir = os.path.join(work_dir, 'annotation')
    output_dir = os.path.join(work_dir, 'validated')
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, hash_name[:-3]+'json'), 'w') as f:
        data = data.decode('utf-8')
        data = json.loads(data)
        to_add = {
            "_id": hash_name,
            "filename": hash_name,
            "username": current_user.username,
            "validated": True,
            "duration": data[0]["duration"],
            "validated_by": current_user.username,
            "annotations": data,
        }
        doc = annotations.find_one({'filename': hash_name})
        if doc is None:
            annotations.insert_one(to_add)
        else:
            if doc.get('validated'):
                return
            doc["username"] = doc.get('username')
            annotations.replace_one({"_id": hash_name}, doc, upsert=True)
        json.dump(data, f, indent=2)
    return 'ok'

@app.route('/uploads/<path>', methods=['POST','GET'])
def pending_audio(path):
    path = secure_filename(path)
    print('path = '+path)
    if request.method == 'GET':
        hash_name = get_hashname(path+'.wav')
        if hash_name is None: return
        
        doc = annotations.find_one({'filename': hash_name})
        if doc is None: return
        return jsonify(doc.get('annotations',{}))
        #return send_from_directory(os.path.join(work_dir, 'uploads'), hash_name[:-3]+'json')
        #return send_from_directory(os.path.join(work_dir, 'annotation'), path)
    
    elif request.method == 'POST':
        hash_name = get_hashname(path+'.wav')

        data = request.data
        filename = path
        #output_dir = os.path.join(work_dir, 'annotation')
        output_dir = os.path.join(work_dir, 'uploads')
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, hash_name[:-3]+'json'), 'w') as f:
            data = data.decode('utf-8')
            data = json.loads(data)  
            to_add = {
                "_id": hash_name,
                "filename": hash_name,
                "username": current_user.username,
                "validated": False,
                "duration": data[0]["duration"],
                "annotations": data
            }
            doc = annotations.find_one({'filename': hash_name})
            if doc is None:
                annotations.insert_one(to_add)
            else:
                if doc.get('username') == current_user.username and not doc.get('validated'):
                    annotations.replace_one({"_id": hash_name}, doc, upsert=True)
            json.dump(data, f, indent=2)
        return 'ok'

@app.route('/delete_file', methods=['POST'])
def delete_file():
    try:
        filename = secure_filename(request.json['filename'])  # Assuming you send the filename in the request body
        hash_name = get_hashname(filename)

        # remove here for s3
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], hash_name[:-3])
        os.remove(file_path + 'wav')

        # TODO : handle if json file has not been saved in "uploads", currently, it logs an error in js.
        os.remove(file_path + 'json')
        return jsonify({'success': True, 'message': 'File deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    


@app.route('/reload/<user>/<filename>',methods=['POST','GET'])
def uploaded_file(filename,user):
    # no need to secure_filename because here it is the hashed filename
    
    # TODO : retrieve from s3 here
    s3 = boto3.client('s3', endpoint_url='https://ceph-gw1.info.ucl.ac.be')
     
    f = io.BytesIO()
    print('file to reload = ' + filename)
    s3.download_fileobj('biodiversity-lauzelle', user + '/' + filename, f)
    f.seek(0)
    return send_file(f, as_attachment=True,mimetype='audio/wav',download_name='file_send.wav')

    #return send_file(app.config['UPLOAD_FOLDER'] + '/' + filename, as_attachment=True)

def get_hashname(filename):
    query1 = File.query.filter_by(hashName=filename).first()
    query2 = File.query.filter_by(name=filename, username=current_user.username).first()
    if query2:
        hash_name = query2.hashName
    elif query1:
        hash_name = query1.hashName
    else:
        return None
        # TODO ?
        #hash_name = str(hash(filename))#+".wav"
        #new_file = File(name=filename, hashName=hash_name, username=current_user.username)
        #db.session.add(new_file)
        #db.session.commit()
    return hash_name

@app.route('/split')
def split():
    return render_template('split.html')

@app.route('/split_audio', methods=['POST'])
def split_audio():
    if 'wav_file' not in request.files:
        return 'No file part'

    file = request.files['wav_file']

    if file.filename == '':
        return 'No selected file'

    if file and file.filename.endswith('.wav'):
        # Save the uploaded file
        filename = file.filename
        file.save(filename)

        # Split the WAV file into 1-minute chunks
        audio = AudioSegment.from_wav(filename)
        chunk_length_ms = 60 * 1000  # 1 minute in milliseconds
        chunks = [audio[i:i+chunk_length_ms] for i in range(0, len(audio), chunk_length_ms)]

        # Save each chunk as a separate file
        output_files = []
        for i, chunk in enumerate(chunks):
            output_file = f'{os.path.splitext(filename)[0]}_chunk_{i+1}.wav'
            chunk.export(output_file, format='wav')
            output_files.append(output_file)

        # Clean up the original file
        os.remove(filename)

        # Zip the output files
        zip_filename = f'{os.path.splitext(filename)[0]}_chunks.zip'
        os.system(f'zip -j {zip_filename} {" ".join(output_files)}')

        # Clean up the individual chunk files
        for output_file in output_files:
            os.remove(output_file)

        # Send the zip file to the client for download
        return send_file(zip_filename, as_attachment=True)

    return 'Invalid file format'

@app.route('/download_csv', methods=['POST','GET'])
def download_csv():
    data = request.json
    print('Received data:', data)
    print('-----------')
    print(type(data))
    print(type(list(eval(data))))
    print(list(eval(data)))
    
    # Create a CSV string from the sample data
    #csv_content = generate_csv_string(list(eval(data)))
    to_csv = list(eval(data))
    keys = to_csv[0].keys()

    output = StringIO()

    #with open('people.csv', 'w') as output_file:
    dict_writer = csv.DictWriter(output, keys)
    dict_writer.writeheader()
    dict_writer.writerows(to_csv)
    
    csv_data = output.getvalue()

    # Create response with CSV data
    response = make_response(csv_data)
    response.headers['Content-Disposition'] = 'attachment; filename=data.csv'
    response.headers['Content-type'] = 'text/csv'

    return response


import csv
from io import StringIO

def generate_csv_string(data):
    # Create a CSV string using the csv module
    output = []
    csv_writer = csv.DictWriter(output, fieldnames=data[0].keys())
    csv_writer.writeheader()
    csv_writer.writerows(data)
    return ''.join(output)

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    if not os.path.exists(app.config['ALTERNATE_UPLOAD_FOLDER']):
        os.makedirs(app.config['ALTERNATE_UPLOAD_FOLDER'])
    #app.run(debug=True,threaded=False, processes=3)
    app.run(debug=True,threaded=True)

    #app.run(debug=True,host="0.0.0.0",port=5000,ssl_context='adhoc')
