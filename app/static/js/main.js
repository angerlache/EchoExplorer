//import Regions from '../../node_modules/wavesurfer.js/dist/plugins/plugins/regions.cjs';
//import Regions from '../../node_modules/wavesurfer.js/dist/plugins/plugins/regions.esm.js';
//import Regions from '../../node_modules/wavesurfer.js/dist/plugins/plugins/regions.js';
//import Regions from '../../node_modules/wavesurfer.js/dist/plugins/plugins/regions.min.js';
//import RegionsPlugin from './wavesurfer.js/dist/plugins/regions.esm.js'

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('audioFile');
    const processButton = document.getElementById('processButton');
    const visualizeButton = document.getElementById('visualizeButton');
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const resultDiv = document.getElementById('result');
    const waveformDiv = document.getElementById('waveform');

    let wavesurfer;

    visualizeButton.addEventListener('click', function () {
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select an audio file first.');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            const arrayBuffer = event.target.result;

            const blob = new Blob([arrayBuffer]);
            const url = URL.createObjectURL(blob);

            if (wavesurfer) {
                wavesurfer.destroy();
            }

            wavesurfer = WaveSurfer.create({
                container: '#waveform',
                waveColor: 'black',
                progressColor: 'red',
                normalize: true
            });

            // Initialize the Regions plugin
            //const wsRegions = wavesurfer.registerPlugin(Regions.create())

            wavesurfer.load(url);
        };

        reader.readAsArrayBuffer(file);
    });

    playButton.addEventListener('click', function () {
        if (wavesurfer) {
            wavesurfer.play();
        }
    });

    pauseButton.addEventListener('click', function () {
        if (wavesurfer) {
            wavesurfer.pause();
        }
    });

    processButton.addEventListener('click', function () {
        const file = fileInput.files[0];
        

        if (!file) {
            alert('Please select an audio file first.');
            return;
        }

        const formData = new FormData();
        formData.append('audio', file);

        fetch('/process', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            resultDiv.innerHTML = 'Result: ' + data.result;
            // Additional processing or display logic can be added here
            
            /*if (wavesurfer && data.timestep) {

                wavesurfer.on('decode', () => {
                    wsRegions.addRegion({
                        start: data.timestep,
                        content: data.result,
                        color:'rgba(255, 0, 0, 0.3)',
                    })
                });

            }*/
        
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
});