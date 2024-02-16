import { generateColorMap } from './utils.js';

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
                //normalize: true,
                sampleRate: 192000,
            });
            wavesurfer.load(url);

            // Initialize the Regions plugin
            const wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create())

            wavesurfer.on('decode', () => {
                // Regions
                wsRegions.addRegion({
                    start: 1,
                    end: 2,
                    content: 'Resize me',
                    drag: true,
                    resize: true,
                })
            });

            wavesurfer.registerPlugin(
                WaveSurfer.Spectrogram.create({
                    container: '#spectrogram',
                    //height: 500,
                    //splitChannels: true,
                    frequencyMax: 192000,
                    fftSamples: 1024,  // Adjust the number of FFT samples
                    labels: true,     // Show frequency labels
                    colorMap: generateColorMap(),  // Change the color map (viridis, plasma, inferno, etc.)
                    //windowFunc: 'hann',   // Change the window function (hann, hamming, blackman, etc.)
                    scrollParent: true    // Enable scrolling within the parent container
        
                }),
            )

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
            
        
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
});