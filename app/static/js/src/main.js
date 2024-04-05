import { generateColorMap,appendBuffer,renderRegions,saveAnnotationToServer,createRegionContent } from './utils.js';
'use strict';



document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('audioFile');
    const processButton = document.getElementById('processButton');
    const processButton2 = document.getElementById('processButton2');
    const processButton3 = document.getElementById('processButton3');
    const startAI = document.getElementById('startAI');
    const visualizeButton = document.getElementById('visualizeButton');
    const playButton = document.getElementById('playButton');
   
    const customOption = document.getElementById('customOption');
    //const slider = document.querySelector('input[type="range"]');
    const slider = document.getElementById('slider'); slider.disabled = true;
    const sliderContainer = document.getElementById('slider-container'); sliderContainer.disabled = true;
    const sliderFreq = document.getElementById('maxFreq'); 
    const sliderProba = document.getElementById('proba-slider');
    const next = document.getElementById('next'); next.disabled = true;
    const prec = document.getElementById('prec'); prec.disabled = true;
    const save = document.getElementById('save');
    const csv = document.getElementById('csv');
    const loadLabels = document.getElementById('loadLabels');
    const validateButton = document.getElementById('validateButton');
    const uploadButton = document.getElementById('uploadButton'); uploadButton.disabled = true;
    const chunkLengthSelector = document.getElementById('chunkLengthSelector');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const applySpecies = document.getElementById('applySpecies')
    const applyAI = document.getElementById('applyAI')


    let chunkLength = 20;
    chunkLengthSelector.value = chunkLength;

    let currentPosition = 0;
    let audioLength;
    //let minProba = 80;
    let sR = 44100; 
    
    //const checkBoxes = document.querySelectorAll('.dropdown-menu input[type="checkbox"]'); 
    const checkBoxes = document.querySelectorAll('#specyBoxes input[type="checkbox"]');
    const AIcheckBoxes = document.querySelectorAll('#aiBoxes input[type="checkbox"]');
    let SelectedSpecies = ['Barbarg', 'Envsp', 'Myosp', 'Pip35', 'Pip50', 'Plesp', 'Rhisp','Region','other']; 
    let SpeciesList = ['Barbarg', 'Envsp', 'Myosp', 'Pip35', 'Pip50', 'Plesp', 'Rhisp','Region','other']; 
    let battyBirdList = {'Barbastella':'Barbarg', 'Eptesicus':'Envsp', 'Myotis':'Myosp', 'Nyctalus':'Envsp','Plecotus':'Plesp','Rhinolophus':'Rhisp','Vespertilio':'Envsp',
                        'Pipistrellus kuhlii':'Pip35', 'Pipistrellus nathusii':'Pip35', 'Pipistrellus pipistrellus':'Pip50', 'Pipistrellus pygmaeus':'Pip50',
                        'Hypsugo savii_Alpenfledermaus':'Pip35', //see https://de.wikipedia.org/wiki/Alpenfledermaus for pip35
                        'Miniopterus schreibersii_Langflügelfledermaus':'Rhisp'} 

    let SelectedAI = ['Human', 'BatML', 'BirdNET', 'BattyBirdNET'];
    let AIlist = ['Human', 'BatML', 'BirdNET', 'BattyBirdNET'];

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
    Dtable.column(4).visible(false); // 3
    Dtable.search.fixed('range', function (searchStr, data, index) {
        var proba = parseFloat(data[2]) || 1; // use data for the age column
        if ((sliderProba.value <= (proba*100))) {
            return true;
        }
        return false;
    });

    Dtable.search.fixed('spec', function (searchStr, data, index) {
        var spec = data[0];
        //if (SelectedSpecies.includes("Region")){
        if (SelectedSpecies.includes("other")){
            return SelectedSpecies.includes(spec) || !(SpeciesList.includes(spec));
        }
        else{
            return SelectedSpecies.includes(spec)
        }
    }); 

    ////
    Dtable.search.fixed('ai', function (searchStr, data, index) {
        var ai = data[3];
        return SelectedAI.includes(ai)
    }); 
    ////




    Dtable.on('click', 'tbody tr', function () {
        let data = Dtable.row(this).data();
        var time = data[1];
        currentPosition = Math.floor(Math.max(0,time-chunkLength/2));
        slider.value = currentPosition
        document.getElementById('secout').value = currentPosition + ' seconds'

        const reader = new FileReader();
        reader.onload = function (event) {
            loadNextChunk(event,data[4]) //3
        }
        var file = fileInput.files[0];
        reader.readAsArrayBuffer(file);
        // Example: Log values to console
        console.log('Clicked Row:', time);
    });

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
                    drag: region.drag,
                    ai: region.ai,
                });
            } else {
                regions.push({
                    start: region.start,
                    end: region.end,
                    id: region.id,
                    content: createRegionContent(document,region.label,region.note,true),
                    drag: region.drag,
                    ai: region.ai
                });
            }

            if (addRow && region.proba !== undefined) {
                var row = Dtable.row.add([
                    region.label,
                    region.start,
                    region.proba,
                    region.ai,
                    region.id
                ]).draw().node();
            } else if (addRow) {
                var row = Dtable.row.add([
                    region.label,
                    region.start,
                    "-",
                    region.ai,
                    region.id
                ]).draw().node();
            }
            
        });
    
    
    }

    
    let customChoice = null;
    customOption.addEventListener('click', function() {
        // Show a prompt to the user to enter their custom choice
        customChoice = prompt('Enter your custom choice:');
        customOption.textContent = customChoice + " (click to modify)";
    });


    // FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
    function editAnnotation(region) {
        let form = document.forms.edit;
        form.style.opacity = 1;
        ////////////////////////////////////////////////

        ////////////////////////////////////////////////
        form.onsubmit = function (e) {
            e.preventDefault();
            if (customChoice !== null) {
                var regionContent = createRegionContent(document,customChoice, form.elements.note.value,true)
                customChoice = null;
            } else {
                console.log('iiii, ', form.elements.choiceSelector.value);

                if (form.elements.choiceSelector.value === "") {
                    var regionContent = createRegionContent(document,region.content.querySelector('h3').textContent, form.elements.note.value,true)
                } else {
                    var regionContent = createRegionContent(document,form.elements.choiceSelector.value, form.elements.note.value,true)
                }

            }
            region.setContent(regionContent);
            //region.setContent(form.elements.choiceSelector.value);
            console.log('eeefff',region)
            //console.log(region.content.querySelector('p').textContent,region.content.innerText)

            let toRemove = regions.filter(item => item.id === region.id)[0]
            regions = regions.filter(item => item.id !== region.id);
            let r = Object.assign({}, region);
            r.start = r.start + currentPosition;
            r.end = r.end + currentPosition;
            r.ai = toRemove.ai;
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

            var rowid = Dtable.column(4).data().indexOf(region.id) //3
            var row = Dtable.row(rowid);
            var d = row.data()
            d[0] = regionContent.innerText;
            row.data(d);
            Dtable.draw();


            
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


    // close the form if user click anywhere except on the form itself
    document.addEventListener('click', function(event) {
        var form = document.getElementById('myForm');
        var closeBtn = document.getElementById('closeForm');
        
        // Check if the clicked element is not within the form or is not the close button
        if (event.target !== form && event.target !== closeBtn && !form.contains(event.target)) {
            form.style.opacity = 0;
            form.style.display = 'none';
        }
    });



    function setupRegionEventListener(wr, ws, clickedrowId){
        clickedrowId = clickedrowId || null;
        let activeRegion = null

        wr.enableDragSelection({
            color: 'rgba(255, 0, 0, 0.1)',
        })
        wr.on("region-created", (region) => {

            

            //If created region is new, add it to the list.
            if(!regions.some(item => item.id === region.id)){
                region.content = createRegionContent(document,"Region", "",true);
                let r = Object.assign({}, region);
                r.start = r.start + currentPosition;
                r.end = r.end + currentPosition;
                r.ai = 'Human'
                console.log(r.id);
                

                if (r.content == undefined) {
                    console.log("crealed")
                }
                else{
                    regions.push(r);
                    unremovableRegions.push(r);
                    var row = Dtable.row.add([
                        //"hand-added Region",
                        "Region",
                        r.start,
                        "-",
                        "Human",
                        r.id
                    ]).draw().node();
                }
                
                
            }
            
            if (clickedrowId === null) {
                region.setOptions({ color: randomColor(), contentEditable:true});
            }
            
            else{
                if (region.id === clickedrowId) {
                    console.log(region.id);
                    region.setOptions({ color: 'rgba(255, 0, 0, 0.5)', contentEditable:true});
                    region.setContent(createRegionContent(document,region.content.querySelector('h3').textContent,
                                        region.content.querySelector('p').textContent,true))
                }
                else{
                    console.log(region.id);
                    region.setOptions({ color: 'rgba(128, 128, 128, 0.5)', contentEditable:true})
                    region.setContent(createRegionContent(document,region.content.querySelector('h3').textContent,
                                        region.content.querySelector('p').textContent,false));
                }
            }
            console.log("new region : ",region);

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
                                    region.content.querySelector('p').textContent,((clickedrowId === null) | (region.id === clickedrowId))))
            });


        })



        wr.on("region-removed", (region) => {

            var r = null;
            Dtable.rows().every(function() {
                var rowData = this.data();
                if (rowData[4] === region.id) { //3
                    r = this;
                }
            });
            if(!(r==null)){
                r.remove(); // Remove the row
                Dtable.draw();
            }
            

            regions = regions.filter(item => item.id !== region.id);
            // if drag==true => region does not come from AI, so user can delete it
            // isExpert is a string because comes from index.html
            if (isExpert=='True' || region.drag) {
                console.log("expert and drag = ", isExpert, region.drag);
                unremovableRegions = unremovableRegions.filter(item => item.id !== region.id);
            }
            
        })
        

        wr.on("region-updated", (region) => {

            console.log('region-updated', region)
            let toRemove = regions.filter(item => item.id === region.id)[0]
            regions = regions.filter(item => item.id !== region.id);
            
            let r = Object.assign({}, region);
            r.start = r.start + currentPosition;
            r.end = r.end + currentPosition;
            r.content = region.content;
            r.ai = toRemove.ai;
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
                if (rowData[4] === region.id) { //3
                    rowData[1] = r.start;
                    this.data(rowData);

                }
            });


        })
                
        wr.on('region-out', (region) => {
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
                region.play();
            } else {
                document.getElementById('myForm').style.display = 'block'
                customOption.textContent = "Custom name (type your own...)";

                if (region.content !== undefined) {
                    //document.forms.edit.elements.note.value = region.content.textContent
                    document.forms.edit.elements.note.value = region.content.querySelector('p').textContent;
                    document.forms.edit.elements.choiceSelector.value = region.content.querySelector('h3').textContent;
                }
                editAnnotation(region)
            }
        })

        
        // Reset the active region when the user clicks anywhere in the waveform
        ws.on('interaction', () => {
            activeRegion = null
            
        })
        
    }



    // Function to load the next chunk
    function loadNextChunk(event,clickedId) {
        clickedId = clickedId || null;
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

        var j = new Uint16Array(arrayBuffer.slice(22,24));
        var nbChannels = (j[0] << 0) | (j[1] << 8)

        if (start == 0) {
            data = arrayBuffer.slice(90, end * sR * 4 * nbChannels/2);
        } else {
            data = arrayBuffer.slice(start * sR * 4 * nbChannels/2, end * sR * 4 * nbChannels/2);
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
            setupRegionEventListener(wsRegions, wavesurfer, clickedId);
            renderRegions(chunkLength,currentPosition,wsRegions,regions,SelectedSpecies,SpeciesList,SelectedAI);
            
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


    // button to load saved regions
    // for now, need to push on "visualize audio", "prec" or "next" or "iteartion" slider, because
    // it does not "reload" the waveform
    loadLabels.addEventListener('click', async (event) => {
        try {
            const response = await fetch('users/' + userName + '/annotation/' + annotation_name);
            const data = await response.json();
            loadRegions(document,data,regions,true);
            loadRegions(document,data,unremovableRegions,false);

            updateWaveform()

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
        
        if (selectedFile) {
            uploadButton.disabled = true;

            chunkLength = 20;
            chunkLengthSelector.value = 20;
            
            currentPosition = 0;
            maxFreq = 96000;
            //const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioElement = new Audio();
            audioElement.src = URL.createObjectURL(selectedFile);

            // if another file, let access to the button
            if (isLoggedIn) {loadLabels.disabled = false; save.disabled = false; csv.disabled = false;}
        
            audioElement.addEventListener('loadedmetadata', () => {
                const durationInSeconds = audioElement.duration;

                audioLength = durationInSeconds;
                slider.max = Math.ceil(durationInSeconds);
                slider.value = 0;
                sliderFreq.value = 96000;

                if (durationInSeconds > 3603) {
                    alert("WARNING : audio too long, you won't be able to process it with any AI\n Max length is 1 hour");
                    //return;
                }

                console.log('Audio duration:', durationInSeconds, 'seconds');
                if (durationInSeconds < chunkLength) {
                    prec.disabled = true;
                    next.disabled = true;
                    slider.disabled = true;
                    sliderContainer.disabled = true
                    document.getElementById('secout').value = currentPosition + '/' + `${audioLength}` + ' seconds'
                } else {
                    prec.disabled = false;
                    next.disabled = false;
                    slider.disabled = false;
                    sliderContainer.disabled = false
                    document.getElementById('secout').value = currentPosition + '/' + `${audioLength}` + ' seconds'
                }
            });

            
        }
        //updateWaveform()

        // avoid bug, sometimes the updateWaveform() seems to be executed before audioLength is updated, so waveform has wrong length
        setTimeout(() => {
            updateWaveform();
        }, 50);
        

    });

    
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

    sliderProba.addEventListener('change', (e) => {
        const val = e.target.valueAsNumber;
        //minProba = val;
        Dtable.draw();


    });

    slider.addEventListener('change', (e) => {
        const val = e.target.valueAsNumber
        currentPosition = val
        updateWaveform()

    })

    next.addEventListener('click' ,function () {
        currentPosition += chunkLength;
        slider.value = currentPosition;
        document.getElementById('secout').value = currentPosition + '/' + `${audioLength}` + ' seconds'

        updateWaveform()
    });

    prec.addEventListener('click' ,function () {
        currentPosition = Math.max(currentPosition - chunkLength, 0);
        const file = fileInput.files[0];
        slider.value = currentPosition;
        document.getElementById('secout').value = currentPosition + '/' + `${audioLength}` + ' seconds'
        updateWaveform()
    });
    

    playButton.addEventListener('click', function () {
        if (wavesurfer) {
            wavesurfer.playPause();
        }
    });


    chunkLengthSelector.addEventListener('change',function () {
        var selectedNumber = document.getElementById("chunkLengthSelector").value;
        chunkLength = parseInt(selectedNumber);
        if (audioLength > chunkLength) {
            prec.disabled = false;
            next.disabled = false;
            slider.disabled = false;
            sliderContainer.disabled = false
        }
        updateWaveform()
    })

    zoomIn.addEventListener('click', () => {
        if (chunkLength == 5) {return;}
        chunkLength -= 10;
        if (chunkLength < 5) {
            chunkLength = 5
        }
        if (audioLength > chunkLength) {
            prec.disabled = false;
            next.disabled = false;
            slider.disabled = false;
            sliderContainer.disabled = false
        }
        updateWaveform()
    });

    zoomOut.addEventListener('click', () => {
        if (chunkLength == 60) {return;}
        chunkLength += 10;
        if (audioLength > chunkLength) {
            prec.disabled = false;
            next.disabled = false;
            slider.disabled = false;
            sliderContainer.disabled = false
        }
        updateWaveform()
    });

    save.addEventListener('click', function () {
        saveAnnotationToServer(audioLength,annotation_name,fileInput.files[0].name,regions,userName,'local');
    });
    
    function processRequest(formData) {
        let filename = fileInput.files[0].name
        fetch('/process', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);


            if (userName) {uploadButton.disabled = false;}
            //startAI.disabled = true;

            
            data.start.forEach((start, index) => {
                console.log('Adding region:', start);
                let note = ""
                let specy;
                /*
                if (data.AI == "BatML") {
                    note = ""
                    specy = data.result[index]
                }
                else if (data.AI == "BattyBirdNET") {
                    for (let key in battyBirdList) {
                        if (data.result[index].includes(key)) {
                            specy = battyBirdList[key]
                            note = data.result[key]
                            console.log(specy,note);
                            break;
                        }
                    }
                    note = ""
                    specy = data.result[index]
                }
                else if (data.AI == "BirdNET") {
                    note = ""
                    specy = data.result[index]
                }*/
                note = ""
                specy = data.result[index]
                var idn = `bat-${Math.random().toString(32).slice(2)}`
                regions.push({
                    id: idn,
                    start: start, //timestamp-currentPosition,
                    end: data.end[index], //timestamp-currentPosition,
                    //content: createRegionContent(document,`${data.result[index]}` , "note here",true),
                    content: createRegionContent(document,`${specy}`, note, true),
                    //color: randomColor(), 
                    drag: false,
                    resize: false,
                    proba: data.probability[index],
                    ai: data.AI,
                })
                unremovableRegions.push({
                    id: idn,
                    start: start,
                    end: data.end[index], //timestamp-currentPosition,
                    //content: createRegionContent(document,`${data.result[index]}` , "note here",true),
                    content: createRegionContent(document,`${specy}`, note, true),
                    //color: randomColor(), 
                    drag: false,
                    resize: false,
                    proba: data.probability[index],
                    ai: data.AI,
                })
                //Populate DataTable
                
                var row = Dtable.row.add([
                    //data.result[index],
                    specy,
                    data.start[index],
                    data.probability[index],
                    data.AI,
                    idn,
                ]).draw().node();

                
            })
            saveAnnotationToServer(audioLength,annotation_name,filename,regions,userName,'local');
            saveAnnotationToServer(audioLength,annotation_name,filename,unremovableRegions,userName,'other'); 
            
            alert("Your file has been processed")
            updateWaveform()

        })
        .catch(error => {
            alert("ERROR: if you are using firefox, please try chrome")
            console.error('Error:', error);
        });
    }

    function predictedTime(duration,ai) {
        fetch('/predicted_time', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({'time':duration,'AI':ai,'bytes':fileInput.files[0].size}) 
        })
        .then(response => response.json())
        .then(data => {
            let seconds = data.predicted_time;
            let minutes = Math.floor(seconds / 60)
            seconds = Math.round(seconds % 60)
            let paddedSeconds = `${seconds < 10 ? '0' : ''}${seconds}`

            alert(`The predicted time for the task is ${minutes} min ${paddedSeconds} sec.`);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function checkAudio(file) {
        if (!file) {
            alert('Please select an audio file first.');
            return;
        }
        if (audioLength > 3603) {
            alert('ERROR : cannot process audio; audio too long\nMax length is 1 hour');
            return;
        }
    }

    // if user not logged in show error message when try to run AI
    const tooltip = document.getElementById('tooltip');
    document.getElementById('AIbuttons').addEventListener('mouseover', () => {
        if (startAI.disabled) {
            tooltip.style.display = 'block';
        } 
    });
    document.getElementById('AIbuttons').addEventListener('mouseout', () => {
        tooltip.style.display = 'none';
    });

    processButton.addEventListener('click', function () {
        const file = fileInput.files[0];

        checkAudio(file)

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('chosenAI', 'BatML');

        predictedTime(audioLength,'BatML')

        processRequest(formData)

    });

    processButton2.addEventListener('click', function () {
        const file = fileInput.files[0];

        checkAudio(file)

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('chosenAI', 'BirdNET');

        predictedTime(audioLength,'BirdNET')

        processRequest(formData);
    });


    processButton3.addEventListener('click', function () {
        const file = fileInput.files[0];

        checkAudio(file)

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('chosenAI', 'BattyBirdNET');

        predictedTime(audioLength,'BattyBirdNET')

        processRequest(formData);
    });

    validateButton.addEventListener('click', function () {
        //saveAnnotationToServer(audioLength,annotation_name,fileInput,regions,userName,'validated');
        // in isExpert case : regions==unremovableRegions
        saveAnnotationToServer(audioLength,annotation_name,fileInput.files[0].name,unremovableRegions,userName,'validated');

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
        saveAnnotationToServer(audioLength,annotation_name,fileInput.files[0].name,unremovableRegions,userName,"other");

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
                /*setTimeout(() => {
                    // Manually trigger the click event on the visualizeButton
                    updateWaveform()
                }, 200); // Adjust the delay (in milliseconds) as needed*/

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

    csv.addEventListener('click', function () {
        // Make a POST request to the server

        let data = JSON.stringify(
            Object.keys(regions).map(function (id) {
                var region = regions[id];
                if (region.proba !== undefined) {
                    return {
                        duration: audioLength,
                        file: fileInput.files[0].name,
                        start: region.start,
                        end: region.end,
                        //content: region.content,
                        label: region.content.querySelector('h3').textContent,
                        note: region.content.querySelector('p').textContent,
                        id: region.id,
                        proba: region.proba,
                        ai: region.ai
                    };
                } else {
                    return {
                        duration: audioLength,
                        file: fileInput.files[0].name,
                        start: region.start,
                        end: region.end,
                        //content: region.content,
                        label: region.content.querySelector('h3').textContent,
                        note: region.content.querySelector('p').textContent,
                        id: region.id,
                        proba: 0,
                        ai: region.ai
                    }
                }
            })
        );

        fetch('/download_csv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data) // Convert the data to JSON format
        }).then(response => response.blob())
                .then(blob => {
                    // Create a temporary link
                    const url = window.URL.createObjectURL(new Blob([blob]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'data.csv');

                    // Simulate click on the link to trigger download
                    document.body.appendChild(link);
                    link.click();

                    // Clean up
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                });
    });    


    function handleCB() { 
        SelectedSpecies = [];     
        SelectedAI = []
        checkBoxes.forEach((checkbox) => { 
            if (checkbox.checked) { 
                SelectedSpecies.push(checkbox.value); 
            } 
        }); 
        AIcheckBoxes.forEach((checkbox) => {
            if (checkbox.checked) { 
                SelectedAI.push(checkbox.value); 
            } 
        });
        console.log(SelectedSpecies)
        console.log(SelectedAI)
        Dtable.draw();
        //Dtable.columns(0).search(SelectedSpecies.join('|'), true, false).draw();
    } 
    
    checkBoxes.forEach((checkbox) => { 
        checkbox.addEventListener('change', handleCB); 
    }); 
    
    AIcheckBoxes.forEach((checkbox) => { 
        checkbox.addEventListener('change', handleCB); 
    }); 

    applySpecies.addEventListener('click', () => {
        updateWaveform();
    });

    applyAI.addEventListener('click', () => {
        updateWaveform();
    });

});
