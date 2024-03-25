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


from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import InputRequired, Length, ValidationError
from flask_bcrypt import Bcrypt

from sqlalchemy.orm import DeclarativeBase,Mapped, mapped_column
from sqlalchemy import Integer, String
import os
from werkzeug.utils import secure_filename
import shutil
import json
import uuid
import requests

app = Flask(__name__)
sslify = SSLify(app)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://", # change storage for production
)

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
#with app.app_context():
#    db.create_all()

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

 
@app.route('/')
def index():
    
    if current_user.is_authenticated:
        # retrieve filenames from s3
        s3 = boto3.client('s3')

        # List objects in the bucket and filter by files with a .wav extension
        #response = s3.list_objects_v2(Bucket='BUCKET_NAME', Prefix='')
        #files = [obj['Key'] for obj in response.get('Contents', []) if obj['Key'].endswith('.wav')]
        files = [filename for filename in os.listdir(app.config['UPLOAD_FOLDER']) if filename.endswith('.wav')]       
        return render_template('index.html',username=current_user.username,isExpert=current_user.isExpert,files=files)
    
    return render_template('index.html')
        

@app.route('/login', methods=['GET', 'POST'])
def login():
    print(1)
    form = LoginForm()
    print(2)

    if form.validate_on_submit():
        print(3)
        user = User.query.filter_by(username=form.username.data).first()
        print(4)
        if user:
            if bcrypt.check_password_hash(user.password, form.password.data):
                print(5)

                login_user(user)
                print(6)

                session['is_logged_in'] = True

                return redirect(url_for('index'))
    return render_template('login.html', form=form)

@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/species', methods=['GET', 'POST'])
def species():
    return render_template('species.html')

@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    logout_user()
    session['is_logged_in'] = False
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()

    if form.validate_on_submit():
        hashed_password = bcrypt.generate_password_hash(form.password.data)
        new_user = User(username=form.username.data, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('register.html', form=form)

@app.route('/process', methods=['POST'])
def process():
    if 'audio' not in request.files:
        return jsonify({'error': 'No file provided'})

    file = request.files['audio']
    session['AI'] = request.form.get('chosenAI')

    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    if file and allowed_file(file.filename):
        # TODO : check if file already in server

        if not current_user.is_authenticated:
            return jsonify({'error': 'user not logged in'})
        
        #bucket_name = "bucket_name"
        #region = "region"
        query1 = File.query.filter_by(hashName=file.filename).first()
        query2 = File.query.filter_by(name=file.filename, username=current_user.username).first()
        if query1:
            print('HASHNAME FOUND')
            filename = query1.hashName
        elif query2:
            print('USERNAME AND NAME FOUND')
            filename = query2.hashName
        else:
            print('FILE NOT FOUND IN DB')
            filename = str(hash(file.filename))+".wav"
            new_file = File(name=file.filename, hashName=filename, username=current_user.username)
            db.session.add(new_file)
            db.session.commit()

            #s3 = boto3.client('s3')
            #s3.upload_fileobj(file, bucket_name, filename)
        

        file_content = file.read()

        # Save in the first directory
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            f.write(file_content)

        filepath = os.path.join("allAudios", filename)
        with open(filepath, 'wb') as f:
            f.write(file_content)

        # Save in the second directory
        alternate_filepath = os.path.join(app.config['ALTERNATE_UPLOAD_FOLDER'], filename)
        with open(alternate_filepath, 'wb') as f:
            f.write(file_content)


        # This is ZONE DE TEST removed AI pour le fun


        if session['AI'] == 'bats':
            result_path = "../AI/results/classification_result.csv"
            os.chdir('../AI')
            #os.system('{} {}'.format('python3', 'run_classifier.py'))
            os.remove("data/samples/" + filename)
            os.chdir('../app')
        elif session['AI'] == 'birds':
            result_path = "../BirdNET/results/classification_result.csv"
            alternate_filepath = os.path.join('../BirdNET/samples', filename)
            with open(alternate_filepath, 'wb') as f:
                f.write(file_content)
            os.chdir('../BirdNET')
            os.system('{} {} {} {} {} {} {} {}'.format("python3", "analyze.py", "--i", "samples/", '--o', 'results/', '--rtype', 'csv'))
            os.remove("samples/" + filename)
            os.remove("results/" + filename[:-3] + "BirdNET.results.csv")
            os.chdir('../app')
        elif session['AI'] == 'battybirds':
            result_path = "../BattyBirdNET/results/classification_result.csv"
            alternate_filepath = os.path.join('../BattyBirdNET/samples', filename)
            with open(alternate_filepath, 'wb') as f:
                f.write(file_content)
            os.chdir('../BattyBirdNET')
            os.system('{} {} {} {} {} {} {} {}'.format("python3", "analyze.py", "--i", "samples/", '--o', 'results/', '--rtype', 'csv'))
            os.remove("samples/" + filename)
            os.remove("results/" + filename[:-3] + "BirdNET.results.csv")
            os.chdir('../app')

        

        print(filepath)
        # Send a request to the second machine for processing (local testing)
        second_machine_url = 'http://localhost:5001/process_on_second_machine'
        #files = {'audio': open(filepath, 'rb')}  # Include the file in the request
        files = {'audio': ('testname.wav', open(filepath, 'rb'))}

        data = {'message': filename}
        #json_data = json.dumps(data)
        headers = {'Content-Type': 'multipart/form-data'}
        #response = requests.post('http://tfe-anthony-noam.info.ucl.ac.be/process_on_second_machine', files=files)
        #response = requests.post('https://gotham.inl.ovh/process_on_second_machine', files=files)
        #print("request posted !")

        # Process the response from the second machine (if needed)
        #result_data = response.json()
        #print(result_data)
        #print(response)

        #csv_response = requests.get('https://gotham.inl.ovh/send_csv')
        #print('request recieved !')

        # Save the received CSV file on the first machine
        #with open('received_classification_result.csv', 'wb') as f:
        #    f.write(csv_response.content)


        # Process the file using your AI model function
        results = [[],[],[],[]]
        
        #with open("received_classification_result.csv") as resultfile:
        with open(result_path) as resultfile:
            next(resultfile)
            for line in resultfile:
                line = line.strip().split(',')
                if float(line[4]) > 0.5: # keep label only if 80% sure
                    results[0].append(line[1])
                    results[1].append(line[2])
                    results[2].append(line[3])
                    results[3].append(line[4])
                
        if os.path.exists(result_path):
            #os.remove(result_path)
            pass

        print(results)
        
        #empty by deleting then 
        #shutil.rmtree(ALTERNATE_UPLOAD_FOLDER) # delete the folder where AI is applied
        #os.makedirs(app.config['ALTERNATE_UPLOAD_FOLDER'])
        return jsonify({'result': results[2], 'start': results[0], 'end': results[1], 'probability':results[3]})

    return jsonify({'error': 'Invalid file format'})

## FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
#@app.route('/annotation/<path:path>', methods=['GET', 'POST'])
@app.route('/users/<username>/annotation/<path:path>', methods=['GET', 'POST'])
def annotation(username,path):
    if request.method == 'GET':
        hash_name = get_hashname(path+'.wav')
        
        return send_from_directory(os.path.join(work_dir, 'users', username, 'annotation'), hash_name[:-3]+'json')
        #return send_from_directory(os.path.join(work_dir, 'annotation'), path)
    
    else:
        data = request.data
        hash_name = get_hashname(path+'.wav')
        
        #output_dir = os.path.join(work_dir, 'annotation')
        output_dir = os.path.join(work_dir, 'users', username, 'annotation')
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, hash_name[:-3]+'json'), 'w') as f:
            data = data.decode('utf-8')
            data = json.loads(data)
            json.dump(data, f, indent=2)
        return 'ok'
    
@app.route('/validated/<path:path>', methods=['POST'])
def validate(path):
    hash_name = get_hashname(path+'.wav')

    data = request.data
    filename = path
    #output_dir = os.path.join(work_dir, 'annotation')
    output_dir = os.path.join(work_dir, 'validated')
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, hash_name[:-3]+'json'), 'w') as f:
        data = data.decode('utf-8')
        data = json.loads(data)
        json.dump(data, f, indent=2)
    return 'ok'

@app.route('/uploads/<path:path>', methods=['POST','GET'])
def pending_audio(path):

    if request.method == 'GET':
        hash_name = get_hashname(path+'.wav')
        
        return send_from_directory(os.path.join(work_dir, 'uploads'), hash_name[:-3]+'json')
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
            json.dump(data, f, indent=2)
        return 'ok'

@app.route('/delete_file', methods=['POST'])
def delete_file():
    try:
        filename = request.json['filename']  # Assuming you send the filename in the request body
        hash_name = get_hashname(filename)

        # remove here for s3
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], hash_name[:-3])
        os.remove(file_path + 'wav')

        # TODO : handle if json file has not been saved in "uploads", currently, it logs an error in js.
        os.remove(file_path + 'json')
        return jsonify({'success': True, 'message': 'File deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    


@app.route('/reload/<filename>')
def uploaded_file(filename):
    #return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    # TODO : retrieve from s3 here
    """s3 = boto3.client('s3')
    with open(filename, "rb") as f:
        s3.download_fileobj('BUCKET_NAME', filename, f)
        f.seek(0)
        return send_file(f, as_attachment=True)"""

    return send_file(app.config['UPLOAD_FOLDER'] + '/' + filename, as_attachment=True)

def get_hashname(filename):
    query1 = File.query.filter_by(hashName=filename).first()
    query2 = File.query.filter_by(name=filename, username=current_user.username).first()
    if query2:
        hash_name = query2.hashName
    elif query1:
        hash_name = query1.hashName
    else:
        pass
        # TODO ?
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
    app.run(debug=True)
    #app.run(debug=True,host="0.0.0.0",port=5000,ssl_context='adhoc')
