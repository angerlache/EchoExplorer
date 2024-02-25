from flask import Flask, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
import shutil

app = Flask(__name__)

ALLOWED_EXTENSIONS = {'wav'}
UPLOAD_FOLDER = 'uploads'
ALTERNATE_UPLOAD_FOLDER = '../data/samples'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALTERNATE_UPLOAD_FOLDER'] = ALTERNATE_UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

 
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    if 'audio' not in request.files:
        return jsonify({'error': 'No file provided'})

    file = request.files['audio']

    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    if file and allowed_file(file.filename):

        filename = secure_filename(file.filename)

        file_content = file.read()

        # Save in the first directory
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            f.write(file_content)

        # Save in the second directory
        alternate_filepath = os.path.join(app.config['ALTERNATE_UPLOAD_FOLDER'], filename)
        with open(alternate_filepath, 'wb') as f:
            f.write(file_content)

        os.chdir('../')
        #file.save("data/samples/"+file.filename)
        os.system('{} {}'.format('python3', 'run_classifier.py'))
        os.chdir('app')


        # Process the file using your AI model function
        results = [[],[],[]]
        with open("../results/classification_result.csv") as resultfile:
            next(resultfile)
            for line in resultfile:
                line = line.strip().split(',')
                results[0].append(line[1])
                results[1].append(line[2])
                results[2].append(line[3])

        print(results)
        #result = 'ENVSP'
        #timestep = 1
        
        #empty by deleting then 
        shutil.rmtree(ALTERNATE_UPLOAD_FOLDER) # delete the folder where AI is applied
        os.makedirs(app.config['ALTERNATE_UPLOAD_FOLDER'])
        return jsonify({'result': results[1], 'timestep': results[0], 'probability':results[2]})

    return jsonify({'error': 'Invalid file format'})

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    if not os.path.exists(app.config['ALTERNATE_UPLOAD_FOLDER']):
        os.makedirs(app.config['ALTERNATE_UPLOAD_FOLDER'])
    app.run(debug=True)
