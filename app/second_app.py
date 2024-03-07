from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import shutil

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = '../AI/data/samples'
#app.config['ALTERNATE_UPLOAD_FOLDER'] = '/path/to/alternate/upload/folder'

@app.route('/send_csv', methods=['POST','GET'])
def send_csv():
    # Assuming the CSV file is saved in the same directory as run_classifier.py
    csv_filepath = '../AI/results/classification_result.csv'

    # Send the CSV file as an attachment in the response
    return send_file(csv_filepath, as_attachment=True)


@app.route('/process_on_second_machine', methods=['POST'])
def process_on_second_machine():
    if 'audio' not in request.files:
        return jsonify({'error': 'No file provided'})

    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

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
    app.run(debug=True,host="0.0.0.0",port=5001)
