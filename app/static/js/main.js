import { generateColorMap } from './utils.js';

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('audioFile');
    const processButton = document.getElementById('processButton');
    const visualizeButton = document.getElementById('visualizeButton');
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const resultDiv = document.getElementById('result');
    const timestepDiv = document.getElementById('timestep');
    const probaDiv = document.getElementById('probability');
    const waveformDiv = document.getElementById('waveform');

    let wavesurfer;
    let wsRegions; // Define wsRegions here
    // Give regions a random color when they are created
    const random = (min, max) => Math.random() * (max - min) + min
    const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`


    /*function setupRegionEventListener(wr, ws){
        let activeRegion = null
        wr.on('region-in', (region) => {
            console.log('region-in', region)
        })
        wr.on('region-out', (region) => {
            console.log('region-out', region)
            if (activeRegion === region) {
                activeRegion = null;
                ws.playPause();
            }
        })
        wr.on('region-clicked', (region, e) => {
            e.stopPropagation() // prevent triggering a click on the waveform
            console.log('region-clicked', region)
            activeRegion = region
            region.play()
        })
        // Reset the active region when the user clicks anywhere in the waveform
        ws.on('interaction', () => {
            activeRegion = null
        })
    }*/


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
            wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create()) // Define wsRegions here

            wsRegions.enableDragSelection({
                color: 'rgba(255, 0, 0, 0.1)',
            })
              
            wsRegions.on('region-updated', (region) => {
                console.log('Updated region', region)
            })

            {
                let activeRegion = null
                
                wsRegions.on('region-out', (region) => {
                    console.log('region-out', region)
                    if (activeRegion === region) {
                        wavesurfer.stop()
                        activeRegion = null
                    }
                })
                wsRegions.on('region-clicked', (region, e) => {
                    e.stopPropagation() // prevent triggering a click on the waveform
                    activeRegion = region
                    //region.play()
                    region.setOptions({ color: randomColor() })
                    e.ctrlKey ? region.remove() : region.play();
                })
                
                // Reset the active region when the user clicks anywhere in the waveform
                wavesurfer.on('interaction', () => {
                    activeRegion = null
                })
            }

            console.log('ws0:', wsRegions);
            
            //setupRegionEventListener(wsRegions, wavesurfer);

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
