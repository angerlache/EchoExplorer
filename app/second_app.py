from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os
import shutil
import json
import boto3

app = Flask(__name__)
CORS(app, resources={r"/process_on_second_machine": {"origins": "http://tfe-anthony-noam.info.ucl.ac.be"}})
app.config['UPLOAD_FOLDER'] = '../AI/data/samples'
#app.config['ALTERNATE_UPLOAD_FOLDER'] = '/path/to/alternate/upload/folder'

@app.route('/send_csv', methods=['POST','GET'])
def send_csv():
    # Assuming the CSV file is saved in the same directory as run_classifier.py
    csv_filepath = '../AI/results/classification_result.csv'

    # Send the CSV file as an attachment in the response
    return send_file(csv_filepath, as_attachment=True)


@app.route('/process_on_second_machine', methods=['POST','GET'])
def process_on_second_machine():
    print('hereeeeeeee')
    print(request.args)
    #data = request.json
    #message = data.get('message', 'No message received')

    #print('Received message:', message)

    filename = json.loads(request.json)["message"]
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(path, 'wb') as f:
        s3 = boto3.client('s3')
        s3.download_fileobj('BUCKET_NAME', filename, f)

    #file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    os.chdir('../AI')
    print(os.getcwd())
    os.system('{} {}'.format('python3', 'run_classifier.py'))
    print("'''''''''''''''---------------------------------------------")
    os.chdir('../app')
    #run_classifier_task.apply_async(args=[filepath])

    #shutil.rmtree(app.config['ALTERNATE_UPLOAD_FOLDER']) # delete the folder where AI is applied
    #os.makedirs(app.config['ALTERNATE_UPLOAD_FOLDER'])

    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True,host="0.0.0.0")
