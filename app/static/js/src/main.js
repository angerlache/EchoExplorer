import { generateColorMap,appendBuffer,renderRegions,saveAnnotationToServer, createRegionContent, loadRegions } from './utils.js';
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
    const save = document.getElementById('save');
    const note = document.getElementById('note');
    const chunkLength = 60;
    let currentPosition = 0;
    let audioLength;
    const sR = 44100; // TODO : user can choose the sampleRate based on his audio


    let wavesurfer;
    let wsRegions; // Define wsRegions here
    let regions = [];
    let annotation_name;

    // Give regions a random color when they are created
    const random = (min, max) => Math.random() * (max - min) + min
    const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`



    /**
     * Save annotations to localStorage.
     */
    /*function saveRegions() {
        localStorage.regions = JSON.stringify(
            Object.keys(regions).map(function (id) {
                var region = regions[id];
                return {
                    //duration: audioLength,
                    //file: fileInput.files[0].name,
                    start: region.start,
                    end: region.end,
                    content: region.content,
                };
            })
        );
    }*/

    // FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
    function selectElement(id, valueToSelect) {
        let element = document.getElementById(id);
        element.value = valueToSelect;
    }

    // FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
    function editAnnotation(region) {
        let form = document.forms.edit;
        form.style.opacity = 1;
        //selectElement('choiceSelector', region.content.querySelector('h3') || '');
        //selectElement('choiceSelector', region.content || '');
        //selectElement('note', region.content.querySelector('p') || '');
        //selectElement('note', region.content.querySelector('p') || '');
        form.onsubmit = function (e) {
            e.preventDefault();
            
            //console.log('eeefff',region.content)
            var regionContent = createRegionContent(document,form.elements.choiceSelector.value, form.elements.note.value)
            region.setContent(regionContent);
            //region.setContent(form.elements.choiceSelector.value);
            console.log('eeefff',region.content)
            //console.log(region.content.querySelector('p').textContent,region.content.innerText)



            regions = regions.filter(item => item.id !== region.id);
            let r = Object.assign({}, region);
            r.start = r.start + currentPosition;
            r.end = r.end + currentPosition;
            regions.push(r);
            
            form.style.opacity = 0;
        };
        form.onreset = function () {
            form.style.opacity = 0;
            form.dataset.region = null;
            console.log('eeeee')
        };
        form.dataset.region = region.id;
    }

    
    function setupRegionEventListener(wr, ws){

        let activeRegion = null

        wr.enableDragSelection({
            color: 'rgba(255, 0, 0, 0.1)',
        })
        wr.on("region-created", (region) => {
            //region.setOptions({ color: randomColor(), contentEditable:true, content: createRegionContent(document,'','')});
            region.setOptions({ color: randomColor(), contentEditable:true});
            console.log('content = ', region.content);

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
            r.content = region.content
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
            //console.log('gerdved')
            //region.setOptions({ color: randomColor() })
            if (e.ctrlKey) {
                region.remove();
            } else if (e.shiftKey) {

                if (region.content !== undefined) {
                    document.forms.edit.elements.note.value = region.content.textContent
                    document.forms.edit.elements.note.value = region.content.querySelector('p').textContent;
                    document.forms.edit.elements.choiceSelector.value = region.content.querySelector('h3').textContent;
                }
                editAnnotation(region)
                

            } else {
                region.play();
            }
            //e.ctrlKey ? region.remove() : e.shiftKey ? showDropdown(region) : region.play();
        })

        
        // Reset the active region when the user clicks anywhere in the waveform
        ws.on('interaction', () => {
            activeRegion = null
            var apply = document.getElementById('apply');
            var dropdown = document.getElementById('choiceSelector');
            dropdown.style.display = 'none';
            apply.style.display = 'none';
        })
        
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
        const buff = appendBuffer(metaData,data);

        const blob = new Blob([buff])
        const url = URL.createObjectURL(blob);

        console.log('USERRRRRRRRR', typeof userName);
        if (wavesurfer) {
            // ICI tu fait un truc pour que il fasse plus qqchs on-delete
            wsRegions.unAll();
            
            wavesurfer.destroy();
        }

        wavesurfer = WaveSurfer.create({
            /** The width of the waveform in pixels or any CSS value; defaults to 100% */
            //width: 2000,
            /** Decoding sample rate. Doesn't affect the playback. Defaults to 8000 */
            container: '#waveform',
            waveColor: 'black',
            progressColor: 'red',
            sampleRate: 192000,
            //minPxPerSec: 500,
            dragToSeek: true,
        });

        // Load the next chunk into wavesurfer
        wavesurfer.load(url);

        // Initialize the Regions plugin
        wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create()) // Define wsRegions here
        
        wavesurfer.once('decode', async () => {
            renderRegions(chunkLength,currentPosition,wsRegions,regions);
            setupRegionEventListener(wsRegions, wavesurfer);
            //loadRegions(document,chunkLength,currentPosition,wsRegions,regions);
            
            //////
            wavesurfer.once('ready', async function () {
                try {
                    const response = await fetch('users/' + userName + '/annotation/' + annotation_name);
                    const data = await response.json();
                    //renderRegions(chunkLength,currentPosition,wsRegions,data);
                    loadRegions(document,chunkLength,currentPosition,wsRegions,data,regions);
                    
                    //saveRegions();
                } catch (error) {
                    console.error('Error fetching annotation:', error);
                }
            });
            

        });
        
        

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




    fileInput.addEventListener('change', (event) => {


        const selectedFile = event.target.files[0];
        const buff = event.target;
        console.log("buff",selectedFile);
        regions = [];
        annotation_name = fileInput.files[0].name.split('.')[0] + '.json'
    
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
        if (wavesurfer) {
            wavesurfer.play();
            console.log('play')
        }
    });


    
    pauseButton.addEventListener('click', function () {
        if (wavesurfer) {
            wavesurfer.pause();
        }
    });

    save.addEventListener('click', function () {
        saveAnnotationToServer(audioLength,annotation_name,fileInput,regions,userName);
        //saveRegions();
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

            wsRegions.addRegion({
                start: 20,
                end: 30,
                content: createRegionContent(document, "ENVSP","noteeeeee")
                //content: "biot",
            })

            
            console.log('ws1:', wsRegions);
            data.timestep.forEach((timestamp, index) => {
                console.log('Adding region:', timestamp);
                if (timestamp-currentPosition > 0 && timestamp-currentPosition < chunkLength) {
                    wsRegions.addRegion({
                        //start: Math.max(timestamp-0.5,0),
                        start: timestamp-currentPosition,
                        //end: (timestamp + 0.5),
                        color: randomColor(), 
                        //content: `${data.result[index]} ${index+1}`,
                        content: createRegionContent(document,`${data.result[index]} ${index+1}` , "noteeee") ,
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
        
        })
        .catch(error => {
            console.error('Error:', error);
        });

    });
});
