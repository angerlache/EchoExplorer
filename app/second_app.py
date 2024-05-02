from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os
import shutil
import json
import boto3
import time
import subprocess

app = Flask(__name__)
CORS(app, resources={r"/process_on_second_machine": {"origins": "http://tfe-anthony-noam.info.ucl.ac.be"}})
app.config['UPLOAD_FOLDER'] = '../AI/data/samples'
#app.config['ALTERNATE_UPLOAD_FOLDER'] = '/path/to/alternate/upload/folder'


@app.route('/process_on_second_machine', methods=['POST','GET'])
def process_on_second_machine():
    s = time.time()
    print(request.data)
    print(request.data.decode('utf-8'))
    print('hereeeeeeee')
    print(request.args)
    print(request.data)
    print(request.json)
    data = json.loads(request.data.decode('utf-8'))
    message = data.get('message', 'No message received')
    AI = data.get('AI')
    print('Received message:', message)

    #filename = message.split('/')[1]
    #username = message.split('/')[0]
    username = message[0].split('/')[0]
    print(username)
    #print(filename)


    s3 = boto3.resource('s3', endpoint_url='https://ceph-gw1.info.ucl.ac.be')
    if AI == 'BatML':
        if not os.path.exists('../AI/data/samples/' + username):
            os.mkdir('../AI/data/samples/' + username)
        for m in message:
            s3.Bucket('biodiversity-lauzelle').download_file(m,'../AI/data/samples/'+username+'/'+m.split('/')[1]) # has .wav
        print("file from s3")
        os.chdir('../AI')
        print(os.getcwd())
        subprocess.run('{} {} {}'.format('python3', 'run_classifier.py', username) + " && rm -rf data/samples/" + username,shell=True,check=True)
        print("---------------------------------------------------")
        os.chdir('../app')
        csv_filepath = '../AI/results/classification_result_' + username + '.csv'
        #csv_filepath = '../AI/results/classification_result_' + filename + '.csv'

    elif AI == 'BirdNET':
        if not os.path.exists('../BirdNET/samples/' + username):
            os.mkdir('../BirdNET/samples/' + username)
        if not os.path.exists('../BirdNET/results/' + username):
            os.mkdir('../BirdNET/results/' + username)
            
        for m in message:
            s3.Bucket('biodiversity-lauzelle').download_file(m,'../BirdNET/samples/'+username+'/'+m.split('/')[1]) # has .wav
        os.chdir('../BirdNET')
        subprocess.run("source /home/batmen/anthony/myenv/bin/activate && {} {} {} {} {} {} {} {} {} {} && rm -rf samples/{}/ && rm results/{}".format("python3", "analyze.py", "--i", "samples/"+username+'/', '--o', 'results/'+username+'/', '--user', username,'--rtype', 'csv',username,username + '/' + "BirdNET.results.csv"), shell=True, check=True)
        #os.system('{} {} {} {} {} {} {} {} {} {}'.format("python3", "analyze.py", "--user", username, "--i", "samples/"+username+'/', '--o', 'results/', '--rtype', 'csv'))
        #os.system('rm -rf samples/'+username)
        #os.remove("results/" + filename[:-3] + "BirdNET.results.csv")
        os.chdir('../app')
        csv_filepath = '../BirdNET/results/'+username+'/classification_result_' + username + '.csv'
        #csv_filepath = '../BirdNET/results/'+username+'/classification_result_' + filename + '.csv'

    elif AI == 'BattyBirdNET':
        if not os.path.exists('../BattyBirdNET/samples/' + username):
            os.mkdir('../BattyBirdNET/samples/' + username)
        if not os.path.exists('../BattyBirdNET/results/' + username):
            os.mkdir('../BattyBirdNET/results/' + username)

        for m in message:
            s3.Bucket('biodiversity-lauzelle').download_file(m,'../BattyBirdNET/samples/'+username+'/'+m.split('/')[1]) # has .wav
        os.chdir('../BattyBirdNET')
        subprocess.run("source /home/batmen/anthony/myenv/bin/activate && {} {} {} {} {} {} {} {} && rm -rf samples/{}/".format("python3", "bat_ident.py", "--i", "samples/"+username, '--o', 'results/'+username, '--user', username,username), shell=True, check=True)
        
        os.chdir('../app')
        csv_filepath = '../BattyBirdNET/results/'+username+'/classification_result_' + username + '.csv'
        #csv_filepath = '../BattyBirdNET/results/'+username+'/classification_result_' + filename + '.csv'

    elif AI == 'batdetect2':
        if not os.path.exists('../batdetect2/samples/' + username):
            os.mkdir('../batdetect2/samples/' + username)
        if not os.path.exists('../batdetect2/results/' + username):
            os.mkdir('../batdetect2/results/' + username)

        for m in message:
            s3.Bucket('biodiversity-lauzelle').download_file(m,'../batdetect2/samples/'+username+'/'+m.split('/')[1]) # has .wav
        os.chdir('../batdetect2')
        subprocess.run("source /home/batmen/anthony/myenv/bin/activate && {} {} {} {} {} {} && rm -rf samples/{}/ ".format("python3", "run_batdetect.py", "samples/"+username, "results/"+username, 0.5, username, username), shell=True, check=True)
        os.chdir('../app')
        csv_filepath = '../batdetect2/results/'+username+'/classification_result_' + username + '.csv'
        #csv_filepath = '../batdetect2/results/'+username+'/classification_result_' + filename + '.csv'
        
    results = [[],[],[],[],[]]
    with open(csv_filepath) as resultfile:
    #with open('fake_labels.csv') as resultfile:
        next(resultfile)
        for line in resultfile:
            line = line.strip().split(',')
            if float(line[4]) > 0.5: 
                results[0].append(line[0])
                results[1].append(line[1])
                results[2].append(line[2])
                results[3].append(line[3])
                results[4].append(line[4])


    print(results)
    return jsonify({'result': results[3], 'start': results[1], 'end': results[2], 'probability':results[4], 'AI':AI, 'files':results[0]})

if __name__ == '__main__':
    app.run(debug=True,host="0.0.0.0",threaded=True)



