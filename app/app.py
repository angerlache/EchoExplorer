from flask import Flask, render_template, request, jsonify,send_from_directory, url_for, redirect, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, login_user, LoginManager, login_required, logout_user, current_user
from flask_wtf import FlaskForm
from flask_login import current_user
from flask_sslify import SSLify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

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

class User(db.Model, UserMixin):
    id: Mapped[int] = mapped_column(primary_key=True) #  db.Column(db.Integer,primary_key=True)
    username: Mapped[str] = mapped_column(unique=True,nullable=False) # db.Column(db.String(20), nullable=False)
    password: Mapped[str] = mapped_column(nullable=False) # db.Column(db.String(80), nullable=False)
    isExpert: Mapped[bool] = mapped_column(default=False,nullable=False)

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
       print(current_user.username)
       print(current_user.isExpert)
       
       return render_template('index.html',username=current_user.username,isExpert=current_user.isExpert)
    
    return render_template('index.html')
        

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()

    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user:
            if bcrypt.check_password_hash(user.password, form.password.data):
                login_user(user)
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

    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    if file and allowed_file(file.filename):

        filename = secure_filename(file.filename) # protects from malicious input file

        file_content = file.read()

        # Save in the first directory
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            f.write(file_content)

        # Save in the second directory
        #alternate_filepath = os.path.join(app.config['ALTERNATE_UPLOAD_FOLDER'], filename)
        #with open(alternate_filepath, 'wb') as f:
        #    f.write(file_content)


        # This is ZONE DE TEST removed AI pour le fun

        """   
        os.chdir('../AI')
        print(os.getcwd())
        os.system('{} {}'.format('python3', 'run_classifier.py'))
        os.chdir('../app')
        """

            # Send a request to the second machine for processing (local testing)
        second_machine_url = 'http://localhost:5001/process_on_second_machine'
        files = {'audio': open(filepath, 'rb')}  # Include the file in the request
        response = requests.post(second_machine_url, files=files)

        # Process the response from the second machine (if needed)
        result_data = response.json()
        print(result_data)
        print(response)

        csv_response = requests.get('http://localhost:5001/send_csv')

        # Save the received CSV file on the first machine
        with open('received_classification_result.csv', 'wb') as f:
            f.write(csv_response.content)


        # Process the file using your AI model function
        results = [[],[],[]]
        #with open("../AI/results/classification_result.csv") as resultfile:
        with open("received_classification_result.csv") as resultfile:
            next(resultfile)
            for line in resultfile:
                line = line.strip().split(',')
                if float(line[3]) > 0.8: # keep label only if 80% sure
                    results[0].append(line[1])
                    results[1].append(line[2])
                    results[2].append(line[3])
                
        if os.path.exists("../AI/results/classification_result.csv"):
            os.remove("../AI/results/classification_result.csv")

        print(results)
        
        #empty by deleting then 
        #shutil.rmtree(ALTERNATE_UPLOAD_FOLDER) # delete the folder where AI is applied
        #os.makedirs(app.config['ALTERNATE_UPLOAD_FOLDER'])
        return jsonify({'result': results[1], 'timestep': results[0], 'probability':results[2]})

    return jsonify({'error': 'Invalid file format'})

## FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
#@app.route('/annotation/<path:path>', methods=['GET', 'POST'])
@app.route('/users/<username>/annotation/<path:path>', methods=['GET', 'POST'])
def annotation(username,path):
    if request.method == 'GET':
        return send_from_directory(os.path.join(work_dir, 'users', username, 'annotation'), path)
        #return send_from_directory(os.path.join(work_dir, 'annotation'), path)
    
    else:
        data = request.data
        filename = path
        #output_dir = os.path.join(work_dir, 'annotation')
        output_dir = os.path.join(work_dir, 'users', username, 'annotation')
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, filename), 'w') as f:
            data = data.decode('utf-8')
            data = json.loads(data)
            json.dump(data, f, indent=2)
        return 'ok'
    
@app.route('/allAudios', methods=['GET', 'POST'])
@login_required
def allAudios():
    files = os.listdir(app.config['UPLOAD_FOLDER'])
    return render_template('allAudios.html',files=files)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)



if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    if not os.path.exists(app.config['ALTERNATE_UPLOAD_FOLDER']):
        os.makedirs(app.config['ALTERNATE_UPLOAD_FOLDER'])
    app.run(debug=True,host="0.0.0.0")
