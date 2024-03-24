import { generateColorMap,appendBuffer,renderRegions,saveAnnotationToServer,createRegionContent } from './utils.js';
'use strict';



document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('audioFile');
    const processButton = document.getElementById('processButton');
    const processButton2 = document.getElementById('processButton2');
    const startAI = document.getElementById('startAI');
    const visualizeButton = document.getElementById('visualizeButton');
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const resultDiv = document.getElementById('result');
    const startDiv = document.getElementById('start');
    const endDiv = document.getElementById('end');
    const probaDiv = document.getElementById('probability');
    
    //const slider = document.querySelector('input[type="range"]');
    const slider = document.getElementById('slider'); slider.disabled = true;
    const sliderContainer = document.getElementById('slider-container'); sliderContainer.disabled = true;
    const sliderFreq = document.getElementById('maxFreq'); 
    const next = document.getElementById('next'); next.disabled = true;
    const prec = document.getElementById('prec'); prec.disabled = true;
    const save = document.getElementById('save');
    const note = document.getElementById('note');
    const loadLabels = document.getElementById('loadLabels');
    const validateButton = document.getElementById('validateButton');
    const uploadButton = document.getElementById('uploadButton');
    uploadButton.disabled = true;
    const chunkLength = 60;
    let currentPosition = 0;
    let audioLength;
    let sR = 44100; 
    
    const checkBoxes = document.querySelectorAll('.dropdown-menu input[type="checkbox"]'); 
    let SelectedSpecies = ['Barbarg', 'Envsp', 'Myosp', 'Pip35', 'Pip50', 'Plesp', 'Rhisp','Region','other']; 

    let removefun;

    let wavesurfer;
    
    let wsRegions; // Define wsRegions here
    let regions = [];
    let unremovableRegions = []
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
    wavesurfer.registerPlugin(WaveSurfer.Timeline.create());
    

    // add this in fileInput listener to have new table when new audio ?
    // or when audio chosen from allAudios
    const Dtable = new DataTable('#myTable',{order: [[1, 'asc']]});   
    Dtable.column(3).visible(false);


    // Give regions a random color when they are created
    const random = (min, max) => Math.random() * (max - min) + min
    const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`


    // same as renderRegions but with regions saved in the json of the file
    //export function loadRegions(document,chunkLength,currentPosition,wr,annotations,regions){
    function loadRegions(document,annotations,regions,addRow){

        // todo: check if the id is present in the list, so that
        // if user repush on the button, the regions are not duplicated
    
        annotations.forEach(region => {
            if (region.proba !== undefined) {
                regions.push({
                    start: region.start,
                    end: region.end,
                    id: region.id,
                    content: createRegionContent(document,region.label,region.note,true),
                    proba: region.proba,
                });
            } else {
                regions.push({
                    start: region.start,
                    end: region.end,
                    id: region.id,
                    content: createRegionContent(document,region.label,region.note,true),
                });
            }

            if (addRow && region.proba !== undefined) {
                var row = Dtable.row.add([
                    region.label,
                    region.start,
                    region.proba,
                    region.id
                ]).draw().node();
                addRowListener(row,fileInput.files[0]);
            } else if (addRow) {
                var row = Dtable.row.add([
                    region.label,
                    region.start,
                    "-",
                    region.id
                ]).draw().node();
                addRowListener(row,fileInput.files[0]);
            }
            
        });
    
    
    }
    function addRowListener(row, file) {
        // Add click event to each row
        row.addEventListener('click', function (event) {         
            // Handle the click event here
            var clickedRow = event.currentTarget;
            var cells = clickedRow.getElementsByTagName('td');
            
            var time = cells[1].innerHTML;

            currentPosition = Math.floor(Math.max(0,time-30));

            const reader = new FileReader();
            reader.onload = function (event) {
                loadNextChunk(event)
            }
            reader.readAsArrayBuffer(file);
            // Example: Log values to console
            console.log('Clicked Row:', time);
        });
    }

    // Get references to the select element and the custom option
    const customOption = document.getElementById('customOption');
    let customChoice = null;
    // Add event listener to the custom option
    customOption.addEventListener('click', function() {
        // Show a prompt to the user to enter their custom choice
        customChoice = prompt('Enter your custom choice:');

    });


    // FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
    function editAnnotation(region) {
        let form = document.forms.edit;
        form.style.opacity = 1;
        ////////////////////////////////////////////////

        ////////////////////////////////////////////////
        form.onsubmit = function (e) {
            e.preventDefault();
            console.log('lhtmrlthlhththm222 : ' + form.elements.choiceSelector.value);
            //console.log('eeefff',region.content)
            if (customChoice !== null) {
                var regionContent = createRegionContent(document,customChoice, form.elements.note.value,true)
                customChoice = null;
            } else {
                var regionContent = createRegionContent(document,form.elements.choiceSelector.value, form.elements.note.value,true)

            }
            region.setContent(regionContent);
            //region.setContent(form.elements.choiceSelector.value);
            console.log('eeefff',region)
            //console.log(region.content.querySelector('p').textContent,region.content.innerText)

            let toRemove = regions.filter(item => item.id === region.id)[0]
            console.log('toRemove = ', toRemove);
            regions = regions.filter(item => item.id !== region.id);
            let r = Object.assign({}, region);
            r.start = r.start + currentPosition;
            r.end = r.end + currentPosition;
            if (toRemove.proba !== undefined) {
                r.proba = toRemove.proba;
            }
            if (r.content == undefined) {
                console.log("edaled")
            }
            regions.push(r);
            if (isExpert=='True' || region.drag) {
                unremovableRegions = unremovableRegions.filter(item => item.id !== region.id);
                unremovableRegions.push(r);
            }

            

            
            form.style.opacity = 0;
            document.getElementById('myForm').style.display = 'none'
            //form.style.opacity = 0;
        };
        form.onreset = function () {
            form.style.opacity = 0;
            form.dataset.region = null;
        };
        form.dataset.region = region.id;
    }
    document.getElementById('closeForm').addEventListener('click', function() {
        document.getElementById('myForm').style.opacity = 0;
        document.getElementById('myForm').style.display = 'none';
    });





    function setupRegionEventListener(wr, ws){

        let activeRegion = null

        wr.enableDragSelection({
            color: 'rgba(255, 0, 0, 0.1)',
        })
        wr.on("region-created", (region) => {
            
            
            region.setOptions({ color: randomColor(), contentEditable:true});
            //console.log('content = ', region.content);

            /*let r = Object.assign({}, region);
            r.start = r.start + currentPosition;
            r.end = r.end + currentPosition;
            regions.push(r);
            unremovableRegions.push(r)*/

            //If created region is new, add it to the list.
            if(!regions.some(item => item.id === region.id)){
                region.content = createRegionContent(document,"Region", "",false);
                let r = Object.assign({}, region);
                r.start = r.start + currentPosition;
                r.end = r.end + currentPosition;
                

                if (r.content == undefined) {
                    console.log("crealed")
                }
                else{
                    regions.push(r);
                    unremovableRegions.push(r);
                    var row = Dtable.row.add([
                        "hand-added Region",
                        r.start,
                        "-",
                        r.id
                    ]).draw().node();
                    addRowListener(row,fileInput.files[0]);
                }
                
                
            }

            // set last arg of setContent to true and the content will show up only when mouse over region
            region.on('over', (e) => {
                if (region.content !== undefined)
                    region.setContent(createRegionContent(document,region.content.querySelector('h3').textContent,
                                        region.content.querySelector('p').textContent,true))
            });

            // set to false if you want to hide when mouse not over
            // if so, do it everywhere setContent is called
            region.on('leave', (e) => {
                if (region.content !== undefined) 
                region.setContent(createRegionContent(document,region.content.querySelector('h3').textContent,
                                    region.content.querySelector('p').textContent,true))
            });


        })



        wr.on("region-removed", (region) => {

            var r = null;
            Dtable.rows().every(function() {
                var rowData = this.data();
                if (rowData[3] === region.id) {
                    r = this;
                }
            });
            if(!(r==null)){
                r.remove(); // Remove the row
                Dtable.draw();
            }
            


            console.log('region-removed', region)
            regions = regions.filter(item => item.id !== region.id);
            // if drag==true => region does not come from AI, so user can delete it
            // isExpert is a string because comes from index.html
            if (isExpert=='True' || region.drag) {
                console.log("expert and drag = ", isExpert, region.drag);
                unremovableRegions = unremovableRegions.filter(item => item.id !== region.id);
            }
            
            console.log("new regions", regions);
            console.log("new regions", unremovableRegions);
        })
        

        wr.on("region-updated", (region) => {
            console.log('region-updated', region)
            regions = regions.filter(item => item.id !== region.id);
            
            let r = Object.assign({}, region);
            r.start = r.start + currentPosition;
            r.end = r.end + currentPosition;
            r.content = region.content;
            console.log('PROBA : ', region.proba);
            if (r.content == undefined) {
                console.log("updaled")
            }
            regions.push(r);
            if (isExpert=='True' || region.drag) {
                unremovableRegions = unremovableRegions.filter(item => item.id !== region.id);
                unremovableRegions.push(r);
            }

            Dtable.rows().every(function() {
                var rowData = this.data();
                if (rowData[3] === region.id) {
                    rowData[1] = r.start;
                    this.data(rowData);

                }
            });


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
                document.getElementById('myForm').style.display = 'block'

                if (region.content !== undefined) {
                    //document.forms.edit.elements.note.value = region.content.textContent
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
        console.log(regions);
        if (currentPosition >= audioLength) {
            //alert('Audio fully processed.');
            return;
        }
        arrayBuffer = event.target.result;
        const metaData = arrayBuffer.slice(0,90); //44
        let start = currentPosition;
        const end = Math.min(currentPosition + chunkLength, audioLength);
        let data;

        // calculate the sample rate of the audio indicated in the WAV header
        var i = new Uint32Array(arrayBuffer.slice(24,28));
        sR = (i[0] << 0) | (i[1] << 8) | (i[2] << 16) | (i[3] << 24);


        if (start == 0) {
            data = arrayBuffer.slice(90, end * sR * 4);
        } else {
            data = arrayBuffer.slice(start * sR * 4, end * sR * 4);
        }
        const buff = appendBuffer(metaData,data);

        const blob = new Blob([buff])
        const url = URL.createObjectURL(blob);

        //const slicedBlob = blob.slice(0, 10 * 44100 * 4);

        if (wavesurfer) {
            // ICI tu fait un truc pour que il fasse plus qqchs on-delete
            if(wsRegions){
                wsRegions.unAll();
            }
            
            wavesurfer.destroy();
        }

        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'black',
            progressColor: 'red',
            sampleRate: maxFreq * 2,
            //minPxPerSec: 500,
            dragToSeek: true,
            backend: 'MediaElement',
        });

        wavesurfer.registerPlugin(WaveSurfer.Timeline.create({
            formatTimeCallback: (seconds) => {
                seconds = seconds + currentPosition;
              if (seconds / 60 > 1) {
                // calculate minutes and seconds from seconds count
                const minutes = Math.floor(seconds / 60)
                seconds = Math.round(seconds % 60)
                const paddedSeconds = `${seconds < 10 ? '0' : ''}${seconds}`
                return `${minutes}:${paddedSeconds}`
              }
              const rounded = Math.round(seconds * 1000) / 1000
              return `${rounded}`
            },
        }));

        // Load the next chunk into wavesurfer
        wavesurfer.load(url);

        // Initialize the Regions plugin
        wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create()) // Define wsRegions here

        wavesurfer.once('decode', async () => {
            console.log('rendering DONE');
            //renderRegions(chunkLength,currentPosition,wsRegions,regions);
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
            loadRegions(document,data,regions,true);
            loadRegions(document,data,unremovableRegions,false);

            // hide the button after user pushed it, so that cannot use it
            //loadLabels.disabled = true;
        } catch (error) {
            console.error('Error fetching annotation:', error);
        }
    });

    fileInput.addEventListener('change', (event) => {

        const selectedFile = event.target.files[0];
        //function fileSelected(selectedFile) //{
        regions = [];
        unremovableRegions = [];
        Dtable.clear().draw();
        annotation_name = fileInput.files[0].name.split('.')[0] //+ '.json'
        startAI.disabled = false;
        
        if (selectedFile) {
            console.log('FILE = ', fileInput);
            console.log('FILEee = ', fileInput.files);
            uploadButton.disabled = true;
            
            currentPosition = 0;
            maxFreq = 96000;
            //const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioElement = new Audio();
            audioElement.src = URL.createObjectURL(selectedFile);

            // if another file, let access to the button
            if (isLoggedIn) {console.log('logged in'); loadLabels.disabled = false; save.disabled = false;}
            
        
            audioElement.addEventListener('loadedmetadata', () => {
                const durationInSeconds = audioElement.duration;

                audioLength = durationInSeconds;
                slider.max = Math.ceil(durationInSeconds);
                slider.value = 0;
                sliderFreq.value = 96000;

                console.log('Audio duration:', durationInSeconds, 'seconds');
                if (durationInSeconds < chunkLength) {
                    prec.disabled = true;
                    next.disabled = true;
                    slider.disabled = true;
                    sliderContainer.disabled = true
                } else {
                    prec.disabled = false;
                    next.disabled = false;
                    slider.disabled = false;
                    sliderContainer.disabled = false
                }
            });

            
        }

    });

        
    

    /*fileInput.addEventListener('change', (event) => {
        const selectedFile = event.target.files[0];
        console.log("a",selectedFile)
        fileSelected(selectedFile);
    });*/
    
    function updateWaveform() {
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
    }
    

    visualizeButton.addEventListener('click', function () {
        updateWaveform()
    });



    sliderFreq.addEventListener('change', (e) => {
        const val = e.target.valueAsNumber;
        maxFreq = val;

        updateWaveform()
    });

    slider.addEventListener('change', (e) => {
        const val = e.target.valueAsNumber
        currentPosition = val
        updateWaveform()

    })

    next.addEventListener('click' ,function () {
        currentPosition += chunkLength;
        slider.value = currentPosition;
        document.getElementById('secout').value = currentPosition + ' seconds'

        updateWaveform()
    });

    prec.addEventListener('click' ,function () {
        currentPosition = Math.max(currentPosition - chunkLength, 0);
        const file = fileInput.files[0];
        updateWaveform()
    });
    

    playButton.addEventListener('click', function () {
        if (wavesurfer) {
            wavesurfer.playPause();
        }
    });


    /*pauseButton.addEventListener('click', function () {
        if (wavesurfer) {
            wavesurfer.pause();
        }
    });*/

    save.addEventListener('click', function () {
        saveAnnotationToServer(audioLength,annotation_name,fileInput,regions,userName,'local');
    });
    
    function processRequest(formData) {
        fetch('/process', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);

            resultDiv.innerHTML = 'Result: ' + data.result;
            startDiv.innerHTML = "Start: " + data.start;
            endDiv.innerHTML = "End: " + data.end;
            probaDiv.innerHTML = "With probabilities: " + data.probability;
            if (userName) {uploadButton.disabled = false;}
            startAI.disabled = true;

            
            console.log('ws1:', wsRegions);
            data.start.forEach((start, index) => {
                console.log('Adding region:', start);
                
                /*if (start-currentPosition >= 0 && start-currentPosition <= chunkLength) {
                    wsRegions.addRegion({
                        start: start-currentPosition,
                        end: data.end[index]-currentPosition,
                        color: randomColor(), 
                        content: createRegionContent(document,`${data.result[index]}` , "Confidence : " + `${data.probability[index]}`,true),
                        drag: false,
                        resize: false,
                    });
                }
                else {
                    var id = `bat-${Math.random().toString(32).slice(2)}`
                    regions.push({
                        id: id,
                        start: start,
                        end: data.end[index],
                        content: createRegionContent(document,`${data.result[index]}` , "Confidence : " + `${data.probability[index]}`,true),
                        drag: false,
                        resize: false,
                    })
                    unremovableRegions.push({
                        id: id,
                        start: start,
                        end: data.end[index],
                        content: createRegionContent(document,`${data.result[index]}` , "Confidence : " + `${data.probability[index]}`,true),
                        drag: false,
                        resize: false,
                    })
            
                }*/

                var idn = `bat-${Math.random().toString(32).slice(2)}`
                regions.push({
                    id: idn,
                    start: start, //timestamp-currentPosition,
                    //end: start+1, //timestamp-currentPosition,
                    end: data.end[index], //timestamp-currentPosition,
                    content: createRegionContent(document,`${data.result[index]}` , "Confidence : " + `${data.probability[index]}`,true),
                    color: randomColor(), 
                    drag: false,
                    resize: false,
                    proba: data.probability[index],
                })
                unremovableRegions.push({
                    id: idn,
                    start: start,
                    //end: start+1, //timestamp-currentPosition,
                    end: data.end[index], //timestamp-currentPosition,
                    content: createRegionContent(document,`${data.result[index]}` , "Confidence : " + `${data.probability[index]}`,true),
                    color: randomColor(), 
                    drag: false,
                    resize: false,
                    proba: data.probability[index],
                })
                //Populate DataTable
                
                var row = Dtable.row.add([
                    data.result[index],
                    data.start[index],
                    data.probability[index],
                    idn,
                ]).draw().node();
                addRowListener(row,fileInput.files[0]);

                /*const reader = new FileReader();
                reader.onload = function (event) {
                    loadNextChunk(event)
                }
                reader.readAsArrayBuffer(fileInput.files[0]);*/
                
            })
            saveAnnotationToServer(audioLength,annotation_name,fileInput,regions,userName,'local');
            saveAnnotationToServer(audioLength,annotation_name,fileInput,unremovableRegions,userName,'other'); 
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    processButton.addEventListener('click', function () {
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select an audio file first.');
            return;
        }

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('chosenAI', 'bats');

        processRequest(formData)

    });

    processButton2.addEventListener('click', function () {
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select an audio file first.');
            return;
        }

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('chosenAI', 'birds');

        processRequest(formData);
    });

    validateButton.addEventListener('click', function () {
        //saveAnnotationToServer(audioLength,annotation_name,fileInput,regions,userName,'validated');
        // in isExpert case : regions==unremovableRegions
        saveAnnotationToServer(audioLength,annotation_name,fileInput,unremovableRegions,userName,'validated');

        const filenameToDelete = fileInput.files[0].name;  
    
        // Send a POST request to the Flask server to delete the file
        fetch('/delete_file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: filenameToDelete }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(data.message);
            } else {
                console.error(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    uploadButton.addEventListener('click', function () {
        //saveAnnotationToServer(audioLength,annotation_name,fileInput,regions,userName,"other");
        saveAnnotationToServer(audioLength,annotation_name,fileInput,unremovableRegions,userName,"other");

    });



    // Function to load waveform
    window.changeAudio = function(filename) {
        console.log("1111 ", '/reload/' + filename);
        
        fetch('/reload/' + filename)
            .then(response => response.arrayBuffer())
            .then(async arrayBuffer => {
                // Load audio file
                
                //const wavBlob = new Blob([arrayBuffer], { type: 'audio/x-wav' });
                //const f = new File([wavBlob], filename,{ type: 'audio/x-wav' })
                const f = new File([arrayBuffer], filename.split('/')[1],{ type: 'audio/x-wav' })
                console.log(f);
                const fileList = new DataTransfer();
                fileList.items.add(f);
                const fileInput = document.getElementById('audioFile')
                fileInput.files = fileList.files;
                
                // Manually dispatch an input event
                const inputEvent = new Event('change', {
                    bubbles: true,
                    cancelable: true,
                });
                
                fileInput.dispatchEvent(inputEvent);
                uploadButton.disabled = true;
                loadLabels.disabled = true;

                // Introduce a delay using setTimeout, because we need 'fileInput' listener has finished before starting
                // 'visualizeButton' listener
                setTimeout(() => {
                    // Manually trigger the click event on the visualizeButton
                    const clickEvent = new Event('click', {
                        bubbles: true,
                        cancelable: true,
                    });

                    document.getElementById('visualizeButton').dispatchEvent(clickEvent);
                }, 200); // Adjust the delay (in milliseconds) as needed

                try {
                    const response = await fetch('/uploads/' + annotation_name);
                    const data = await response.json();
                    loadRegions(document,data,regions,true);
                    loadRegions(document,data,unremovableRegions,false);
        
                } catch (error) {
                    console.error('Error fetching annotation:', error);
                }
            })
            .catch(error => console.error('Error loading waveform:', error));

    };

    


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
