from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os
import shutil
import json
import boto3
import time

app = Flask(__name__)
CORS(app, resources={r"/process_on_second_machine": {"origins": "http://tfe-anthony-noam.info.ucl.ac.be"}})
app.config['UPLOAD_FOLDER'] = '../AI/data/samples'
#app.config['ALTERNATE_UPLOAD_FOLDER'] = '/path/to/alternate/upload/folder'

@app.route('/send_csv', methods=['POST','GET'])
def send_csv():
    # Assuming the CSV file is saved in the same directory as run_classifier.py
    csv_filepath = '../AI/results/classification_result.csv'
    while not os.path.exists(csv_filepath):
        time.sleep(5)
        print('sleeping')

    # Send the CSV file as an attachment in the response
    return send_file(csv_filepath, as_attachment=True)


@app.route('/process_on_second_machine', methods=['POST','GET'])
def process_on_second_machine():
    print('hereeeeeeee')
    print(request.args)
    print(request.data)
    print(request.json)
    data = json.loads(request.data.decode('utf-8'))
    message = data.get('message', 'No message received')
    AI = data.get('AI')
    print('Received message:', message)

    filename = message.split('/')[1]
    username = message.split('/')[0]
    print(username)
    print(filename)
    #path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    #print(path)
    """with open(path, 'wb') as f:
        s3 = boto3.resource('s3', endpoint_url='https://ceph-gw1.info.ucl.ac.be')
        #s3.download_fileobj('biodiversity-lauzelle', filename, f)
        for obj in s3.Bucket('biodiversity-lauzelle').objects.all():
            key = obj.key"""

    s3 = boto3.resource('s3', endpoint_url='https://ceph-gw1.info.ucl.ac.be')
    if AI == 'bats':
        if not os.path.exists('../AI/data/samples/' + username):
            os.mkdir('../AI/data/samples/' + username)
        s3.Bucket('biodiversity-lauzelle').download_file(message,'../AI/data/samples/'+message) # has .wav
        os.chdir('../AI')
        print(os.getcwd())
        os.system('{} {} {}'.format('python3', 'run_classifier.py', username))
        os.system('rm -rf data/samples/'+username)
        print("---------------------------------------------------")
        os.chdir('../app')
        csv_filepath = '../AI/results/classification_result_' + username + '.csv'

    elif AI == 'birds':
        if not os.path.exists('../BirdNET/samples/' + username):
            os.mkdir('../BirdNET/samples/' + username)
        s3.Bucket('biodiversity-lauzelle').download_file(message,'../BirdNET/samples/'+message) # has .wav
        os.chdir('../BirdNET')
        os.system('{} {} {} {} {} {} {} {} {}'.format("python3", "analyze.py", username, "--i", "samples/"+username+'/', '--o', 'results/', '--rtype', 'csv'))
        os.system('rm -rf samples/'+username)
        #os.remove("results/" + filename[:-3] + "BirdNET.results.csv")
        os.chdir('../app')
        csv_filepath = '../BirdNET/results/classification_result_' + username + '.csv'



    #shutil.rmtree(app.config['ALTERNATE_UPLOAD_FOLDER']) # delete the folder where AI is applied
    #os.makedirs(app.config['ALTERNATE_UPLOAD_FOLDER'])

    #return jsonify({'success': True})
    #csv_filepath = '../AI/results/classification_result_' + username + '.csv'
    return send_file(
            csv_filepath,
            mimetype='text/csv',
            as_attachment=True,
            attachment_filename='resulte.csv')

if __name__ == '__main__':
    app.run(debug=True,host="0.0.0.0",threaded=True)
