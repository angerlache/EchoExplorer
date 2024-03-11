import { generateColorMap,appendBuffer,renderRegions,saveAnnotationToServer, createRegionContent, loadRegions } from './utils.js';
'use strict';

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('audioFile');
    const processButton = document.getElementById('processButton');
    const visualizeButton = document.getElementById('visualizeButton');
    const playButton = document.getElementById('playButton');
    
    //const slider = document.querySelector('input[type="range"]');
    const slider = document.getElementById('slider');
    const sliderContainer = document.getElementById('slider-container');
    const sliderFreq = document.getElementById('maxFreq');
    const next = document.getElementById('next');
    const prec = document.getElementById('prec');
    const save = document.getElementById('save');
    const note = document.getElementById('note');
    const loadLabels = document.getElementById('loadLabels');
    const chunkLength = 60;
    let currentPosition = 0;
    let audioLength;
    let sR = 44100; 
    const checkBoxes = document.querySelectorAll('.dropdown-menu input[type="checkbox"]'); 
    let SelectedSpecies = ['Barbarg', 'Envsp', 'Myosp', 'Pip35', 'Pip50', 'Plesp', 'Rhisp']; 

    let removefun;

    let wavesurfer;
    
    let wsRegions; // Define wsRegions here
    let regions = [];
    let annotation_name;
    let maxFreq = 96000;
    let arrayBuffer;


    //temporary init
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'black',
        progressColor: 'red',
        sampleRate: maxFreq * 2,
        //minPxPerSec: 500,
        dragToSeek: true,
    });





    // Give regions a random color when they are created
    const random = (min, max) => Math.random() * (max - min) + min
    const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`




    // FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
    function editAnnotation(region) {
        let form = document.forms.edit;
        form.style.opacity = 1;
        form.onsubmit = function (e) {
            e.preventDefault();
            
            //console.log('eeefff',region.content)
            var regionContent = createRegionContent(document,form.elements.choiceSelector.value, form.elements.note.value,true)
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
        };
        form.dataset.region = region.id;
    }

    /*
    function checkSpecies(region,r,wr,regions,SelectedSpecies){
        if (removefun == null) {
            console.log("ok");
            removefun= Array.from(region.listeners.remove)[0];
        }
        const value = region.content.querySelector('h3').textContent;
        if (!SelectedSpecies.includes(value)) {
            Array.from(region.listeners.remove).forEach(element => {
                if(element.toString() == removefun.toString()){
                    region.un('remove',element);
                }
            });

            region.remove();

        }
    }*/
    function setupRegionEventListener(wr, ws){

        let activeRegion = null

        wr.enableDragSelection({
            color: 'rgba(255, 0, 0, 0.1)',
        })
        wr.on("region-created", (region) => {
            
            // set last arg of setContent to true and the content will show up only when mouse over region
            region.on('over', (e) => {
                // todo show 
                if (region.content !== undefined)
                    region.setContent(createRegionContent(document,region.content.querySelector('h3').textContent,
                                        region.content.querySelector('p').textContent,true))
            });

            // set to false if you want to hide when mouse not over
            // if so, do it everywhere setContent is called
            region.on('leave', (e) => {
                // todo hide 
                if (region.content !== undefined)
                region.setContent(createRegionContent(document,region.content.querySelector('h3').textContent,
                                    region.content.querySelector('p').textContent,true))
            });
            region.setOptions({ color: randomColor(), contentEditable:true});
            //console.log('content = ', region.content);

            let r = Object.assign({}, region);
            r.start = r.start + currentPosition;
            r.end = r.end + currentPosition;
            regions.push(r);

            //checkSpecies(region,r,wr,regions,SelectedSpecies);



        })
        wr.on("region-removed", (region) => {
            console.log('region-removed', region)
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
        })

        
        // Reset the active region when the user clicks anywhere in the waveform
        ws.on('interaction', () => {
            activeRegion = null
            
        })
        
    }



    // Function to load the next chunk
    function loadNextChunk(event) {
        // Check if the entire audio has been processed
        if (currentPosition >= audioLength) {
            //alert('Audio fully processed.');
            return;
        }

        arrayBuffer = event.target.result;
        const metaData = arrayBuffer.slice(0,44); //44
        let start = currentPosition;
        const end = Math.min(currentPosition + chunkLength, audioLength);
        let data;

        // calculate the sample rate of the audio indicated in the WAV header
        var i = new Uint32Array(arrayBuffer.slice(24,28));
        sR = (i[0] << 0) | (i[1] << 8) | (i[2] << 16) | (i[3] << 24);


        if (start == 0) {
            data = arrayBuffer.slice(44, end * sR * 4);
        } else {
            data = arrayBuffer.slice(start * sR * 4, end * sR * 4);
        }

        const buff = appendBuffer(metaData,data);

        const blob = new Blob([buff])
        const url = URL.createObjectURL(blob);

        if (wavesurfer) {
            // ICI tu fait un truc pour que il fasse plus qqchs on-delete
            if(wsRegions){
            wsRegions.unAll();}
            
            wavesurfer.destroy();
        }

        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'black',
            progressColor: 'red',
            sampleRate: maxFreq * 2,
            //minPxPerSec: 500,
            dragToSeek: true,
        });

        // Load the next chunk into wavesurfer
        wavesurfer.load(url);

        // Initialize the Regions plugin
        wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create()) // Define wsRegions here

        wavesurfer.once('decode', async () => {
            setupRegionEventListener(wsRegions, wavesurfer);
            renderRegions(chunkLength,currentPosition,wsRegions,regions,SelectedSpecies);
            
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

        /*

        var sample = new Spectrogram(url, "#spectrovis", {
            width: 600,
            height: 300,
            colorScheme: ['#440154', '#472877', '#3e4a89', '#31688d', '#26838e', '#1f9e89', '#36b778', '#6dcd59', '#b4dd2c', '#fde725']
            });
        
        console.log("", sample);*/

        console.log('Current Position:', currentPosition);
    }


    // button to load saved regions
    // for now, need to push on "visualize audio", "prec" or "next" or "iteartion" slider, because
    // it does not "reload" the waveform
    loadLabels.addEventListener('click', async (event) => {
        try {
            const response = await fetch('users/' + userName + '/annotation/' + annotation_name);
            const data = await response.json();
            loadRegions(document,data,regions);

            // hide the button after user pushed it, so that cannot use it
            loadLabels.style.visibility = 'hidden';
        } catch (error) {
            console.error('Error fetching annotation:', error);
        }
    });

    function fileSelected(selectedFile) {
        regions = [];
        annotation_name = fileInput.files[0].name.split('.')[0] + '.json'
        
        if (selectedFile) {
            
            currentPosition = 0;
            maxFreq = 96000;
            //const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioElement = new Audio();
            audioElement.src = URL.createObjectURL(selectedFile);

            // if another file, let access to the button
            loadLabels.style.visibility = 'visible';
        
            audioElement.addEventListener('loadedmetadata', () => {
                const durationInSeconds = audioElement.duration;
                console.log(audioElement.sampleRate, "sample rate here")

                audioLength = durationInSeconds;
                slider.max = Math.ceil(durationInSeconds);
                slider.value = 0;
                sliderFreq.value = 96000;

                console.log('Audio duration:', durationInSeconds, 'seconds');
                if (durationInSeconds < chunkLength) {
                    prec.style.visibility = 'hidden';
                    next.style.visibility = 'hidden';
                    slider.style.visibility = 'hidden';
                    sliderContainer.style.visibility = 'hidden'
                } else {
                    prec.style.visibility = 'visible';
                    next.style.visibility = 'visible';
                    slider.style.visibility = 'visible';
                    sliderContainer.style.visibility = 'visible'
                }
            });

            
        }

    };


    document.addEventListener('DOMContentLoaded', function () {
        
    });

        
    

    fileInput.addEventListener('change', (event) => {
        const selectedFile = event.target.files[0];
        console.log("a",selectedFile)
        fileSelected(selectedFile);
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



    sliderFreq.addEventListener('change', (e) => {
        const val = e.target.valueAsNumber;
        maxFreq = val;

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

    slider.addEventListener('change', (e) => {
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
        document.getElementById('secout').value = currentPosition + ' seconds'

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
        document.getElementById('secout').value = currentPosition + ' seconds'


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
            wavesurfer.playPause();
        }
    });


    
  

    save.addEventListener('click', function () {
        saveAnnotationToServer(audioLength,annotation_name,fileInput,regions,userName);
    });
    
    /*document.getElementById('submitLabels').addEventListener('click', function () {

    });*/

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





            // start of interactive table with the results
             
            var tableBody = document.querySelector('#myTable tbody');
            // Populate the table
            for (var i = 0; i < data.result.length; i++) {
                var row = tableBody.insertRow();
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                var cell3 = row.insertCell(2);
            
                cell1.innerHTML = data.result[i];
                cell2.innerHTML = data.timestep[i];
                cell3.innerHTML = data.probability[i];
            
                // Add click event to each row
                row.addEventListener('click', function (event) {
                    // Handle the click event here
                    var clickedRow = event.currentTarget;
                    var cells = clickedRow.getElementsByTagName('td');
                    
                    // Access values in each cell
                    var value1 = cells[0].innerHTML;
                    var value2 = cells[1].innerHTML;
                    var value3 = cells[2].innerHTML;
                
                    // Example: Log values to console
                    console.log('Clicked Row:', value1, value2, value3);
                });
            }

            
            //console.log('ws1:', wsRegions);
            data.timestep.forEach((timestamp, index) => {
                //console.log('Adding region:', timestamp);
                
                /*
                if (timestamp-currentPosition > 0 && timestamp-currentPosition < chunkLength) {
                    wsRegions.addRegion({
                        //start: Math.max(timestamp-0.5,0),
                        start: timestamp-currentPosition,
                        //end: (timestamp + 0.5),
                        color: randomColor(), 
                        //content: `${data.result[index]} ${index+1}`,
                        content: createRegionContent(document,`${data.result[index]}` , "noteeee",true) ,
                        drag: false,
                        resize: false,
                        
                    });
                }
                else {
                    regions.push({
                        id: `bat-${Math.random().toString(32).slice(2)}`,
                        start: timestamp-currentPosition,
                        end: timestamp-currentPosition,
                        content: createRegionContent(document,`${data.result[index]}` , "noteeee",true),
                        color: randomColor(), 
                        drag: false,
                        resize: false,
                    })
                }
                */

                regions.push({
                    id: `bat-${Math.random().toString(32).slice(2)}`,
                    start: timestamp-currentPosition,
                    end: timestamp-currentPosition,
                    content: createRegionContent(document,`${data.result[index]}` , "noteeee",true),
                    color: randomColor(), 
                    drag: false,
                    resize: false,
                })

                
            });



            console.log(regions);

            //console.log('ws2:', wsRegions);
        
        })
        .catch(error => {
            console.error('Error:', error);
        });

    });

    


    function handleCB() { 
        SelectedSpecies = [];     
        checkBoxes.forEach((checkbox) => { 
            if (checkbox.checked) { 
                SelectedSpecies.push(checkbox.value); 
            } 
        }); 



        console.log(SelectedSpecies)
    } 
    
    checkBoxes.forEach((checkbox) => { 
        checkbox.addEventListener('change', handleCB); 
    }); 
});
