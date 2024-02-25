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
    const slider = document.querySelector('input[type="range"]');
    const next = document.getElementById('next');
    const prec = document.getElementById('prec');
    const chunkLength = 60;
    let currentPosition = 0;
    let audioLength;
    const sR = 44100;


    let wavesurfer;
    let wsRegions; // Define wsRegions here
    let regions = [];
    // Give regions a random color when they are created
    const random = (min, max) => Math.random() * (max - min) + min
    const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`

    function renderRegions(ws){
        getCurrRegions().forEach(reg => {
            //console.log("region added")
            //console.log(reg)
            ws.addRegion({
                start: reg.start - currentPosition,
                end: reg.end - currentPosition,
                color: randomColor(), 
                content: reg.content,
                drag: reg.drag,
                resize: reg.resize,
                id: reg.id,
            });
        });
    }

    function getCurrRegions(){
        if(wsRegions){
            //console.log("Regions list:")
            //console.log(regions)
            const regionsBetween = regions.filter(region => {
                const regionStart = region.start;
                return regionStart >= currentPosition && regionStart <= (currentPosition+60);
            });
            return regionsBetween;
        }
    }

    
    function setupRegionEventListener(wr, ws){

        let activeRegion = null

        wsRegions.enableDragSelection({
            color: 'rgba(255, 0, 0, 0.1)',
        })
        wr.on("region-created", (region) => {
            let r = Object.assign({}, region);
            r.start = r.start + currentPosition;
            r.end = r.end + currentPosition;
            regions.push(r);
        })

        wr.on("region-removed", (region) => {
            //console.log('region-removed', region)
            regions = regions.filter(item => item.id !== region.id);
        })

        wr.on("region-updated", (region) => {
            //console.log('region-updated', region)
            regions = regions.filter(item => item.id !== region.id);
            let r = Object.assign({}, region);
            r.start = r.start + currentPosition;
            r.end = r.end + currentPosition;
            regions.push(r);
        })
                
        wr.on('region-out', (region) => {
            //console.log('region-out', region)
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
            //alert('Audio fully processed.');
            return;
        }

        const arrayBuffer = event.target.result;
        const metaData = arrayBuffer.slice(0,44); 
        let start = currentPosition;
        const end = Math.min(currentPosition + chunkLength, audioLength);
        let data

        if (start == 0) {
            data = arrayBuffer.slice(44, end * sR * 4);
        } else {
            data = arrayBuffer.slice(start * sR * 4, end * sR * 4);
        }
        console.log(arrayBuffer);
        console.log(currentPosition);
        console.log(metaData,data);
        const buff = _appendBuffer(metaData,data);

        const blob = new Blob([buff])
        const url = URL.createObjectURL(blob);

        

        if (wavesurfer) {
            // ICI tu fait un truc pour que il fasse plus qqchs on-delete
            wsRegions.unAll();
            
            wavesurfer.destroy();
        }

        wavesurfer = WaveSurfer.create(options);

        // Load the next chunk into wavesurfer
        wavesurfer.load(url);

        // Initialize the Regions plugin
        wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create()) // Define wsRegions here
        
        wavesurfer.once('decode', () => {
            renderRegions(wsRegions);
            setupRegionEventListener(wsRegions, wavesurfer);
        })
        

        

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
        
        
        console.log('Current Position:', currentPosition);

    }

    var _appendBuffer = function(buffer1, buffer2) {
        var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
        tmp.set(new Uint8Array(buffer1), 0);
        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
        return tmp.buffer;
    };


    fileInput.addEventListener('change', (event) => {

        ////////////////////
        const selectedFile = event.target.files[0];
        const buff = event.target;
        console.log("buff",selectedFile);
    
        if (selectedFile) {
            //const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioElement = new Audio();
            audioElement.src = URL.createObjectURL(selectedFile);
        
            audioElement.addEventListener('loadedmetadata', () => {
                const durationInSeconds = audioElement.duration;
                console.log(audioElement.sampleRate, "sample rate here")

                audioLength = durationInSeconds;
                slider.max = Math.ceil(durationInSeconds);
                console.log('Audio duration:', durationInSeconds, 'seconds');
                if (durationInSeconds < chunkLength) {
                    prec.style.visibility = 'hidden';
                    next.style.visibility = 'hidden';
                    slider.style.visibility = 'hidden';
                } else {
                    prec.style.visibility = 'visible';
                    next.style.visibility = 'visible';
                    slider.style.visibility = 'visible';
                }
            });
            
        }
    });
    
    


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

        reader.readAsArrayBuffer(file);
    });

    slider.addEventListener('input', (e) => {
        const val = e.target.valueAsNumber
        currentPosition = val
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

    })

    next.addEventListener('click' ,function () {
        currentPosition += chunkLength;
        const file = fileInput.files[0];
        slider.value = currentPosition;

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
        currentPosition = Math.max(currentPosition - chunkLength, 0);
        const file = fileInput.files[0];
        slider.value = currentPosition;


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
                if (timestamp-currentPosition > 0 && timestamp-currentPosition < chunkLength) {
                    wsRegions.addRegion({
                        //start: Math.max(timestamp-0.5,0),
                        start: timestamp-currentPosition,
                        //end: (timestamp + 0.5),
                        color: randomColor(), 
                        content: `${data.result[index]} ${index+1}`,
                        drag: false,
                        resize: false,
                    });
                }
                else {
                    regions.push({
                        id: `bat-${Math.random().toString(32).slice(2)}`,
                        start: timestamp-currentPosition,
                        end: timestamp-currentPosition,
                        content: `${data.result[index]} ${index+1}`,
                        drag: false,
                        resize: false,
                    })
                }

                
            });
            console.log('ws2:', wsRegions);
            //setupRegionEventListener(wsRegions, wavesurfer);

            
        
        })
        .catch(error => {
            console.error('Error:', error);
        });

    });
});
