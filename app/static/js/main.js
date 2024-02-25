import { generateColorMap } from './utils.js';
'use strict';

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('audioFile');
    const processButton = document.getElementById('processButton');
    const visualizeButton = document.getElementById('visualizeButton');
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const resultDiv = document.getElementById('result');
    const timestepDiv = document.getElementById('timestep');
    const probaDiv = document.getElementById('probability');
    const next = document.getElementById('next');
    const prec = document.getElementById('prec');
    const chunkLength = 60;
    let currentPosition = 0;
    const audioLength = 5*60;


    let wavesurfer;
    let wsRegions; // Define wsRegions here
    // Give regions a random color when they are created
    const random = (min, max) => Math.random() * (max - min) + min
    const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`


    function setupRegionEventListener(wr, ws){

        let activeRegion = null

        wsRegions.enableDragSelection({
            color: 'rgba(255, 0, 0, 0.1)',
        })
                
        wr.on('region-out', (region) => {
            console.log('region-out', region)
            if (activeRegion === region) {
                ws.stop()
                activeRegion = null
            }
        })
        wr.on('region-clicked', (region, e) => {
            e.stopPropagation() // prevent triggering a click on the waveform
            activeRegion = region
            region.setOptions({ color: randomColor() })
            e.ctrlKey ? region.remove() : region.play();
        })
        
        // Reset the active region when the user clicks anywhere in the waveform
        ws.on('interaction', () => {
            activeRegion = null
        })
        
    }

    let options = {
        /** The width of the waveform in pixels or any CSS value; defaults to 100% */
        //width: 2000,
        /** Decoding sample rate. Doesn't affect the playback. Defaults to 8000 */
        container: '#waveform',
        waveColor: 'black',
        progressColor: 'red',
        sampleRate: 192000,
        //minPxPerSec: 500,
        dragToSeek: true,
        
    }

    // Function to load the next chunk
    function loadNextChunk(event) {
        // Check if the entire audio has been processed
        if (currentPosition >= audioLength) {
            alert('Audio fully processed.');
            return;
        }

        const arrayBuffer = event.target.result;
        const metaData = arrayBuffer.slice(0,44); 
        let start = currentPosition;
        const end = Math.min(currentPosition + chunkLength, audioLength);

        const data = arrayBuffer.slice(start * 44100 * 4, end * 44100 * 4);
        console.log(arrayBuffer);
        console.log(currentPosition);
        console.log(metaData,data);
        const buff = _appendBuffer(metaData,data);

        const blob = new Blob([buff])
        const url = URL.createObjectURL(blob);

        if (wavesurfer) {
            wavesurfer.destroy();
        }

        wavesurfer = WaveSurfer.create(options);

        // Load the next chunk into wavesurfer
        wavesurfer.load(url);

        wavesurfer.once('decode', () => {
            const slider = document.querySelector('input[type="range"]')
        
            slider.addEventListener('input', (e) => {
                const val = e.target.valueAsNumber
                currentPosition = val
            })
        })

        // Initialize the Regions plugin
        wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create()) // Define wsRegions here

        wsRegions.enableDragSelection({
            color: 'rgba(255, 0, 0, 0.1)',
        })

        setupRegionEventListener(wsRegions, wavesurfer);

        wavesurfer.registerPlugin(
            WaveSurfer.Spectrogram.create({
                wavesurfer: wavesurfer,
                container: '#spectrogram',
                //height: 500,
                //splitChannels: true,
                //frequencyMax: 52000,
                fftSamples: 512,  // Adjust the number of FFT samples
                labels: true,     // Show frequency labels
                colorMap: generateColorMap(),  // Change the color map (viridis, plasma, inferno, etc.)
                //windowFunc: 'hann',   // Change the window function (hann, hamming, blackman, etc.)
                //scrollParent: true    // Enable scrolling within the parent container
                minPxPerSec: 1000,
            }),
        )

        

        // Print the current position (for testing purposes)
        console.log('Current Position:', currentPosition);

        // Allow the next iteration after user interaction
        //isProcessing = false;
    }

    var _appendBuffer = function(buffer1, buffer2) {
        var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
        tmp.set(new Uint8Array(buffer1), 0);
        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
        return tmp.buffer;
    };
    
    


    visualizeButton.addEventListener('click', function () {
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select an audio file first.');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            loadNextChunk(event)
        
        }

        
        //currentPosition += chunkLength;
        reader.readAsArrayBuffer(file);
    });

    next.addEventListener('click' ,function () {
        currentPosition += chunkLength;
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select an audio file first.');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            loadNextChunk(event)
        }
        reader.readAsArrayBuffer(file);
    });

    prec.addEventListener('click' ,function () {
        currentPosition -= chunkLength;
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select an audio file first.');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            loadNextChunk(event)
        }
        reader.readAsArrayBuffer(file);
    });
    

    playButton.addEventListener('click', function () {
        //wavesurfer.spectrogram.canvas.style.width = Math.max(wavesurfer.drawer.getWidth(), Math.round(wavesurfer.getDuration() * wavesurfer.params.minPxPerSec * wavesurfer.params.pixelRatio)) + "px"
        //wavesurfer.plugins[0].canvas.style.width = Math.max(wavesurfer.options['width'], Math.round(wavesurfer.getDuration() * wavesurfer.options['minPxPerSec'] * wavesurfer.options['pixelRatio'])) + "px"
        //wavesurfer.plugins[0].render()
        if (wavesurfer) {
            wavesurfer.play();
            //console.log("bbbbbbb : ", options["sampleRate"])
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
            timestepDiv.innerHTML = "Timestep: " + data.timestep;
            probaDiv.innerHTML = "With probabilities: " + data.probability;

            console.log('Result:', data.result);
            console.log('Timestep:', data.timestep);
            console.log("With probabilities:", data.probability);

            //wsRegions.clearRegions();
            //wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create()) // Define wsRegions here
            
            console.log('ws1:', wsRegions);
            data.timestep.forEach((timestamp, index) => {
                console.log('Adding region:', timestamp);
                wsRegions.addRegion({
                    //start: Math.max(timestamp-0.5,0),
                    start: timestamp,
                    //end: (timestamp + 0.5),
                    color: randomColor(), 
                    content: `${data.result[index]} ${index+1}`,
                    drag: false,
                    resize: false,
                });
            });
            console.log('ws2:', wsRegions);
            //setupRegionEventListener(wsRegions, wavesurfer);

            
        
        })
        .catch(error => {
            console.error('Error:', error);
        });

    });
});
