import { appendBuffer,saveAnnotationToServer,createRegionContent,getBrowser} from './utils.js';
import { generateColorMap,renderRegions,addTaxonomy,containsRegion,reloadSpectrogram} from './visualisation_utils.js';
'use strict';



document.addEventListener('DOMContentLoaded', function () {

    const fileInput = document.getElementById('audioFile');
    const multipleAudioFile = document.getElementById('multipleAudioFile');
    const customOption = document.getElementById('customOption');

    const slider = document.getElementById('slider'); slider.disabled = true;
    const sliderContainer = document.getElementById('slider-container'); sliderContainer.disabled = true;
    const sliderFreq = document.getElementById('maxFreq'); 
    const sliderProba = document.getElementById('proba-slider');

    const next = document.getElementById('next'); next.disabled = true;
    const prec = document.getElementById('prec'); prec.disabled = true;
    const save = document.getElementById('save'); save.disabled = true;

    const csv = document.getElementById('csv');
    const loadLabels = document.getElementById('loadLabels');
    const validateButton = document.getElementById('validateButton');
    const uploadButton = document.getElementById('uploadButton'); uploadButton.disabled = true;
    const zoomButton = document.getElementById('zoomButton')
    const optionsButton = document.getElementById('optionsButton')
    const annotationsButton = document.getElementById('annotationsButton')
    const speciesButton = document.getElementById('speciesButton')
    const aiButton = document.getElementById('aiButton')

    const chunkLengthSelector = document.getElementById('chunkLengthSelector');
    const radiusSearchSelector = document.getElementById('radiusSearchSelector'); radiusSearchSelector.value=10000

    const redSlider = document.getElementById('red-slider');
    const blueSlider = document.getElementById('blue-slider');
    const greenSlider = document.getElementById('green-slider');
    const alphaSlider = document.getElementById('alpha-slider');

    let SelectedSpecies = ['Barbarg', 'Envsp', 'Myosp', 'Pip35', 'Pip50', 'Plesp', 'Rhisp','Region','other',"Barbastella barbastellus", "Eptesicus nilssonii", "Eptesicus serotinus", "Myotis alcathoe", "Myotis bechsteinii", "Myotis brandtii", "Myotis capaccinii", "Myotis dasycneme", "Myotis daubentonii", "Myotis emarginatus", "Myotis myotis", "Myotis mystacinus", "Myotis nattereri", "Nyctalus lasiopterus", "Nyctalus leisleri", "Nyctalus noctula", "Pipistrellus kuhlii", "Pipistrellus maderensis", "Pipistrellus nathusii", "Pipistrellus pipistrellus", "Pipistrellus pygmaeus", "Rhinolophus blasii", "Rhinolophus ferrumequinum", "Rhinolophus hipposideros", "Vespertilio murinus",'Plecotus auritus','Plecotus austriacus']; 
    let SpeciesList = ['Barbarg', 'Envsp', 'Myosp', 'Pip35', 'Pip50', 'Plesp', 'Rhisp','Region','other',"Barbastella barbastellus", "Eptesicus nilssonii", "Eptesicus serotinus", "Myotis alcathoe", "Myotis bechsteinii", "Myotis brandtii", "Myotis capaccinii", "Myotis dasycneme", "Myotis daubentonii", "Myotis emarginatus", "Myotis myotis", "Myotis mystacinus", "Myotis nattereri", "Nyctalus lasiopterus", "Nyctalus leisleri", "Nyctalus noctula", "Pipistrellus kuhlii", "Pipistrellus maderensis", "Pipistrellus nathusii", "Pipistrellus pipistrellus", "Pipistrellus pygmaeus", "Rhinolophus blasii", "Rhinolophus ferrumequinum", "Rhinolophus hipposideros", "Vespertilio murinus",'Plecotus auritus','Plecotus austriacus'];  
    let SelectedAI = ['Human', 'BatML', 'BirdNET', 'BattyBirdNET', 'batdetect2','AIVoting'];    
    
    const random = (min, max) => Math.random() * (max - min) + min
    const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`

//----------------------------------------------------------------------------------------------
//Initialization
    let wavesurfer;
    let wsRegions; // Define wsRegions here
    let regions = [];
    let unremovableRegions = []
    let annotation_name;
    let maxFreq = 96000;
    let arrayBuffer;
    let chunkLength = 20;
    chunkLengthSelector.value = chunkLength;
    let currentPosition = 0;
    let audioLength;
    let multipleAudioLength = [];
    let multipleAudio = false;
    let sR = 44100; 



    temporaryInit()


    //Creates a placeholder for the frontend to keep the shape of the website when no audio has been selected yet
    function temporaryInit() {
        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'black',
            progressColor: 'red',
            sampleRate: maxFreq * 2,
            dragToSeek: true,
        });
        wavesurfer.registerPlugin(WaveSurfer.Timeline.create());
    }
    

//----------------------------------------------------------------------------------------------
//Load File(s) and change waveform accordingly
    const playButton = document.getElementById('playButton');

    fileInput.addEventListener('change', (event) => {
        const selectedFile = event.target.files[0];
        regions = [];
        unremovableRegions = [];
        Dtable.clear().draw();
        annotation_name = fileInput.files[0].name.split('.')[0] //+ '.json'
        
        if (selectedFile) {
            multipleAudio = false;
            playButton.disabled = false;
            zoomButton.disabled = false;
            optionsButton.disabled = false;
            annotationsButton.disabled = false;
            speciesButton.disabled = false;
            aiButton.disabled = false;
            uploadButton.disabled = true;
            save.disabled = true;

            chunkLength = 20;
            chunkLengthSelector.value = 20;
            
            currentPosition = 0;
            maxFreq = 96000;
            const audioElement = new Audio();
            audioElement.src = URL.createObjectURL(selectedFile);

            // if another file, let access to the button
            if (isLoggedIn) {loadLabels.disabled = false; csv.disabled = false;}
        
            audioElement.addEventListener('loadedmetadata', () => {
                const durationInSeconds = audioElement.duration;

                audioLength = durationInSeconds;
                slider.max = Math.ceil(durationInSeconds);
                slider.value = 0;
                sliderFreq.value = 96000;
                if (getBrowser() == 'Firefox') {sliderFreq.max = 96000;}
                
                if (durationInSeconds > 3603) {
                    alert("WARNING : audio too long, you won't be able to process it with any AI\n Max length is 1 hour");
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
        // avoids bug, sometimes the updateWaveform() seems to be executed before audioLength is updated, so waveform has wrong length
        setTimeout(() => {
            updateWaveform();
        }, 50);
        

    });


    multipleAudioFile.addEventListener('change', (event) => {
        if (wavesurfer) {
            if(wsRegions){
                wsRegions.unAll();
            }
            wavesurfer.destroy();
        }
        multipleAudioLength = [];
        temporaryInit()
        const selectedFiles = event.target.files;
        console.log(selectedFiles);
        Dtable.clear().draw();
        if (selectedFiles) {
            multipleAudio = true;
            uploadButton.disabled = true;
            save.disabled = true;
            loadLabels.disabled = true; 
            csv.disabled = true;
            validateButton.disabled = true;
            playButton.disabled = true;
            zoomButton.disabled = true;
            optionsButton.disabled = true;
            annotationsButton.disabled = true;
            speciesButton.disabled = true;
            aiButton.disabled = true;
            prec.disabled = true;
            next.disabled = true;
            slider.disabled = true;
            sliderContainer.disabled = true
            document.getElementById('secout').value = ''

            Array.from(selectedFiles).forEach((file) => {
                const audioElement = new Audio();
                audioElement.src = URL.createObjectURL(file);
                audioElement.addEventListener('loadedmetadata', () => {
                    const durationInSeconds = audioElement.duration;
                    multipleAudioLength.push(durationInSeconds)

                    if (durationInSeconds > 3603) {
                        alert("WARNING : " + file.name + " too long, you won't be able to process it with any AI\n Max length is 1 hour");
                        //return;
                    }
                    console.log('Audio duration:', durationInSeconds, 'seconds');
                });
            })
        }
    });

    document.getElementById('visualizeButton').addEventListener('click', function () {
        updateWaveform()
    });

    // not exactly sure about the diff between 'shown.bs.modal' and 'show.bs.modal' but in the latter the map is not rendered well
    document.getElementById('modalNewObservation').addEventListener('shown.bs.modal', (event) => {
        map.invalidateSize();
    });


//----------------------------------------------------------------------------------------------
//setup Regions plugin and listeners

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
                        "Region",
                        r.start,
                        "-",
                        "Human",
                        r.id,
                        "<button class='btn btn-sm delete-btn'><i class='fa fa-trash'></i></button>"
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

//----------------------------------------------------------------------------------------------
// Function to load the next chunk
    function loadNextChunk(event,clickedId) {
        clickedId = clickedId || null;
        // Check if the entire audio has been processed
        console.log(regions);
        if (currentPosition >= audioLength) {
            return;
        }
        arrayBuffer = event.target.result;
        const metaData = arrayBuffer.slice(0,90);
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
        if (wavesurfer) {
            // Stops regions to react on delete by removing listeners before deleting them
            if(wsRegions){
                wsRegions.unAll();
            }
            console.log(wavesurfer)
            wavesurfer.destroy();
        }

        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'black',
            progressColor: 'red',
            sampleRate: maxFreq * 2,
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
            setupRegionEventListener(wsRegions, wavesurfer, clickedId);
            renderRegions(chunkLength,currentPosition,wsRegions,regions,SelectedSpecies,SpeciesList,SelectedAI,sliderProba.value);
            
        });
        
        wavesurfer.registerPlugin(
            WaveSurfer.Spectrogram.create({
                wavesurfer: wavesurfer,
                container: '#spectrogram',
                fftSamples: 512,  // Adjust the number of FFT samples
                labels: true,     // Show frequency labels
                colorMap: generateColorMap(redSlider.value,greenSlider.value,blueSlider.value,alphaSlider.value),  // Change the color map 
                minPxPerSec: 1000,
            }),
        )
        console.log('Current Position:', currentPosition);
    }

//----------------------------------------------------------------------------------------------
//Label Regions
    
    let customChoice = null;
    customOption.addEventListener('click', function() {
        // Show a prompt to the user to enter their custom choice
        customChoice = prompt('Enter your custom choice:');
        customOption.textContent = customChoice + " (click to modify)";
    });


    // partly from : https://github.com/smart-audio/audio_diarization_annotation/tree/master
    function editAnnotation(region) {
        let form = document.forms.edit;
        form.style.opacity = 1;
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
            console.log('eeefff',region)
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

            Dtable.rows().every(function() {
                var rowData = this.data();
                if (rowData[4] === region.id) { //3
                    rowData[1] = r.start;
                    rowData[0] = regionContent.innerText
                    this.data(rowData);

                }
            });            
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

//----------------------------------------------------------------------------------------------
//Load Saved regions from the application and to the waveform

    // button to load saved regions
    loadLabels.addEventListener('click', async (event) => {
        try {
            const response = await fetch('users/' + userName + '/annotation/' + annotation_name);
            const data = await response.json();
            loadRegions(document,data,regions,true);
            loadRegions(document,data,unremovableRegions,false);

            updateWaveform()
            save.disabled = false;
            uploadButton.disabled = false;
        } catch (error) {
            console.error('Error fetching annotation:', error);
        }
    });

    // same as renderRegions but with regions saved in the json file
    function loadRegions(document,annotations,regions,addRow){
        if (!Array.isArray(annotations)) {
            return
        }
        annotations.forEach(region => {
            if (!containsRegion(region, regions)) {    
                regions.push({
                    start: region.start,
                    end: region.end,
                    id: region.id,
                    content: createRegionContent(document,region.label,region.note,true),
                    ...(region.proba !== undefined && { proba: region.proba }),
                    drag: region.drag,
                    ai: region.ai,
                    resize: region.resize,
                });

                var proba = (region.proba !== undefined) ? region.proba : "-";

                if (addRow) {
                    var row = Dtable.row.add([
                        region.label,
                        region.start,
                        proba,
                        region.ai,
                        region.id,
                        "<button class='btn btn-sm delete-btn'><i class='fa fa-trash'></i></button>"
                    ]).draw().node();
                } 
            } 
        });
    }


//----------------------------------------------------------------------------------------------
//Listeners for buttons that save to database

    validateButton.addEventListener('click', function () {
        saveAnnotationToServer(annotation_name,fileInput.files[0].name,unremovableRegions,userName,'validated',false);
    });

    uploadButton.addEventListener('click', function () {
        saveAnnotationToServer(annotation_name,fileInput.files[0].name,unremovableRegions,userName,"other",false);
    });

    save.addEventListener('click', function () {
        saveAnnotationToServer(annotation_name,fileInput.files[0].name,regions,userName,'local',false);
    });

   
//----------------------------------------------------------------------------------------------
//Listeners for function that need to fetch from the Application
    const csrfToken = document.getElementById('csrf_token').value;

    const audioVisibleBox = document.getElementById('audioVisible'); audioVisibleBox.checked = audioVisible=='True'

    //Updates flag for sharing audios or not
    audioVisibleBox.addEventListener('change', () => {
        fetch(`/update_audioVisible?arg=${audioVisibleBox.checked}`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => response.json())
        .then(res => {

        }).catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
    });



    //Ask app to return the csv containing the user's annotations
    function download_csv(file) {
        fetch(`/download_csv?file=${file}`, {
            method: 'GET',
        })
        .then(response => response.blob())
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
    }

    csv.addEventListener('click', function () {
        download_csv(fileInput.files[0].name)
    });    



    // Function to load the waveform
    window.changeAudio = function(filename,whichFiles) {
        console.log("1111 ", '/reload/' + filename);
        document.getElementById("spinner2").style.display = "inline-block";

        fetch('/reload/' + filename)
            .then(response => response.arrayBuffer())
            .then(async arrayBuffer => {
                // Load audio file
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
                uploadButton.disabled = false;
                loadLabels.disabled = true;
                save.disabled = false;
                try {
                    const response = await fetch(`/uploads/` + annotation_name + `?arg=${whichFiles}`);
                    const data = await response.json();
                    loadRegions(document,data,regions,true);
                    loadRegions(document,data,unremovableRegions,false);
        
                } catch (error) {
                    console.error('Error fetching annotation:', error);
                }
                document.getElementById("spinner2").style.display = "none";

            })
            .catch(error => console.error('Error loading waveform:', error));
    };


//----------------------------------------------------------------------------------------------
//Listeners and utils related to the waveform's datatable

    const Dtable = new DataTable('#myTable',{order: [[1, 'asc']]});   
    Dtable.column(4).visible(false); // 3
    Dtable.search.fixed('range', function (searchStr, data, index) {
        var proba = parseFloat(data[2]) || 1; // use data for the age column
        if ((sliderProba.value <= (proba*100))) {
            return true;
        }
        return false;
    });

    //Ensures table only shows unfiltered species and sources (ais and human)
    Dtable.search.fixed('spec', function (searchStr, data, index) {
        var spec = data[0];
        if (SelectedSpecies.includes("other")){
            return SelectedSpecies.includes(spec) || !(SpeciesList.includes(spec));
        }
        else{
            return SelectedSpecies.includes(spec)
        }
    }); 

    Dtable.search.fixed('ai', function (searchStr, data, index) {
        var ai = data[3];
        return SelectedAI.includes(ai)
    }); 

    //Loads the chunck containing the clicked region, and highlights it
    Dtable.on('click', 'tbody tr', function (e) {
        // check if the delete button is not clicked
        if (!$(e.target).closest('.delete-btn').length) {
            let data = Dtable.row(this).data();
            var time = data[1];
            currentPosition = Math.floor(Math.max(0,time-chunkLength/2));
            slider.value = currentPosition
            document.getElementById('secout').value = currentPosition + ' seconds'

            const reader = new FileReader();
            reader.onload = function (event) {
                loadNextChunk(event,data[4])
            }
            var file = fileInput.files[0];
            reader.readAsArrayBuffer(file);
            console.log('Clicked Row:', time);
        }
    });


    //Removes region when clicking delete button
    Dtable.on('click', 'button.delete-btn', function () {
        var row = $(this).closest('tr');
        var rowData = Dtable.row(row).data();

        Dtable.row(row).remove().draw(false);
        let toRemove = wsRegions.regions.filter(item => item.id === rowData[4])[0]
        regions = regions.filter(item => item.id !== rowData[4]);
        if (isExpert=='True' || toRemove.drag) {
            unremovableRegions = unremovableRegions.filter(item => item.id !== rowData[4]);
        }
        toRemove.remove()

    });

    sliderProba.addEventListener('change', (e) => {
        Dtable.draw();
        updateWaveform()

    });


//----------------------------------------------------------------------------------------------
//Listeners and utils for navigating the waveform and spectrogram
    
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

    document.getElementById('zoomIn').addEventListener('click', () => {
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

    document.getElementById('zoomOut').addEventListener('click', () => {
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

    sliderFreq.addEventListener('change', (e) => {
        const val = e.target.valueAsNumber;
        maxFreq = val;
        document.getElementById('freqout').value = `${maxFreq}` + ' Hz'

        updateWaveform()
    });


//----------------------------------------------------------------------------------------------
//Filter sliders listeners and utils

    const speciesCheckBoxes = document.querySelectorAll('#speciesBoxes input[type="checkbox"]');
    const AIcheckBoxes = document.querySelectorAll('#aiBoxes input[type="checkbox"]');



    //Species Dropdown in filters
    for (var i = 1; i <= 7; i++) {    //<-- HardCoded pas tip top, create table in the same way as my/all Audio modal with taxonomy
        var showSubOptions = document.getElementById('showSubOptions' + i);
        var subOptions = document.querySelector('.subOptions' + i);
      
        showSubOptions.onclick = function(subOptions) {
            return function() {
                subOptions.style.display = subOptions.style.display == 'none' ? 'block' : 'none';
            };
        }(subOptions);
    }
    speciesCheckBoxes.forEach((checkbox) => { 
        checkbox.addEventListener('change', handleCB); 
    }); 
    document.getElementById('applySpecies').addEventListener('click', () => {
        updateWaveform();
    });

    AIcheckBoxes.forEach((checkbox) => { 
        checkbox.addEventListener('change', handleCB); 
    }); 
    document.getElementById('applyAI').addEventListener('click', () => {
        updateWaveform();
    });

    function handleCB() { 
        //updates filtered specie and AI list on checkbox event
        SelectedSpecies = [];     
        SelectedAI = []
        speciesCheckBoxes.forEach((checkbox) => { 
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
    } 

//----------------------------------------------------------------------------------------------
//RGB Listeners, check events on parameters to reload spectrogram
    redSlider.addEventListener('change', (e) => {
        reloadSpectrogram(wavesurfer,redSlider,greenSlider,blueSlider,alphaSlider)     
    });
    greenSlider.addEventListener('change', (e) => {
        reloadSpectrogram(wavesurfer,redSlider,greenSlider,blueSlider,alphaSlider)
    });
    blueSlider.addEventListener('change', (e) => {
        reloadSpectrogram(wavesurfer,redSlider,greenSlider,blueSlider,alphaSlider)
    });
    alphaSlider.addEventListener('change', (e) => {
        reloadSpectrogram(wavesurfer,redSlider,greenSlider,blueSlider,alphaSlider)
    });
    document.getElementById("baseColorMap").addEventListener('click', () => {
        setRgbSliders(0,0.66,-0.66,1)
    });
    document.getElementById("bwColorMap").addEventListener('click', () => {
        setRgbSliders(1,1,1,1)
    });
    function setRgbSliders(r,g,b,a){
        redSlider.value = r;
        document.getElementById("redout").value = r;

        greenSlider.value = g;
        document.getElementById("greenout").value = g;

        blueSlider.value = b;
        document.getElementById("blueout").value = b;

        alphaSlider.value = a;
        document.getElementById("alphaout").value = a;

        reloadSpectrogram(wavesurfer,redSlider,greenSlider,blueSlider,alphaSlider)
    }


//------------------------------------------------------------------
//Listeners and utils for My/All audios modals 


    const validatedFilesSwitch = document.getElementById('validatedFilesSwitch')
    const myFilesSwitch = document.getElementById('myFilesSwitch')
    var whichFiles = 'all'
    var myModalEl = document.getElementById('modalAudios')

    const FilesDtable = new DataTable('#FilesTable',{order: [[1, 'asc']]}); 
    FilesDtable.column(0).visible(false);

    var map = L.map('map').setView([50.8503, 4.3517], 8);
    var mapFiles = L.map('mapFiles').setView([50.8503, 4.3517], 8);
    var markers = L.layerGroup()
    let marker = null;
    let markerQuery = null;


    //Get all files containing specific species from either all files or the user's
    function getFiles(whichSpecies) {
        var geoCoord = ""
        if (markerQuery != null) {
            geoCoord = `${markerQuery._latlng.lng},${markerQuery._latlng.lat}`
        }
        if (!Array.isArray(whichSpecies)) {
            whichSpecies = [whichSpecies]
        }
        whichSpecies = JSON.stringify(whichSpecies);
        fetch(`/retrieve_${whichFiles}filenames?arg=${whichSpecies}&arg2=${geoCoord}&radius=${radiusSearchSelector.value}&validated=${validatedFilesSwitch.checked}&myfiles=${myFilesSwitch.checked}`, {
            method: "GET"
        })
        .then(response => response.json())
        .then(res => {
            setAllSpecies(whichFiles)
            markers.clearLayers();
            console.log(res);

            res.audios.forEach((file,i) => {
                let splitFile = file.split('/')
                let delButton = `<button class='btn btn-sm excel-btn'><i class='fa fa-file-excel-o'></i></button> <a href='/download/${splitFile[0]}/${splitFile[1]}' download> <button class='btn btn-sm audio-btn'><i class='fa fa-file-audio-o'></i></button> </a>`
                if (whichFiles == 'my') {delButton = `<button class='btn btn-sm delete-btn'><i class='fa fa-trash'></i></button> <button class='btn btn-sm modify-btn'><i class='fa fa-pencil'></i></button> <button class='btn btn-sm excel-btn'><i class='fa fa-file-excel-o'></i></button> <a href='/download/${splitFile[0]}/${splitFile[1]}' download> <button class='btn btn-sm audio-btn'><i class='fa fa-file-audio-o'></i></button> </a>`}
                var row = FilesDtable.row.add([
                    splitFile[1],
                    splitFile[2],
                    splitFile[0],
                    res.durations[i],
                    res.validated_by[i],
                    delButton
                ]).draw().node();
                if (res.lat[i] != null) {
                    var color = 'orange'
                    var circleMarker = L.rectangle([[Math.trunc(res.lat[i]*10)/10, Math.trunc(res.lng[i]*10)/10],
                                                    [Math.trunc(res.lat[i]*10)/10 + 0.1, Math.trunc(res.lng[i]*10)/10 + 0.1]],{
                        color: color
                    }).bindTooltip(file.split('/')[2])
                    circleMarker._id = file.split('/')[1]
                    markers.addLayer(circleMarker)
                    
                }
            })
            markers.addTo(mapFiles)
        }).catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
    }

    //Gets exhaustive list of species from application for either all or a specific user's files
    function setAllSpecies(whichFiles){
        fetch(`/retrieve_allspecies?arg=${whichFiles}&arg2=${userName}`, {
            method: "GET"
        })
        .then(response => response.json())
        .then(res => {
            let species = res.species
            set_autocomplete('autoSearch', 'autoSearchComplete', species, start_at_letters=1, count_results=10);
        }).catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
    }

    document.getElementById('myAudios').addEventListener('click', () => {
        mapFiles.invalidateSize();
        whichFiles = 'my'
        getFiles('all')
    })

    document.getElementById('resetSearch').addEventListener('click', () => {
        FilesDtable.clear().draw();
        getFiles('all')
    })

    
    document.getElementById('autoSearchButton').addEventListener('click', () => {
        FilesDtable.clear().draw();
        getFiles(document.getElementById('autoSearch').value)
    });


    document.getElementById('allAudios').addEventListener('click', () => {
        mapFiles.invalidateSize();
        whichFiles = 'all'
        getFiles('all')
    })

    document.getElementById('closeModalAudios').addEventListener('click', () => {
        FilesDtable.clear().draw();
    });


//----------------------------------------------------------------------------------------------
//Listeners related to the my/all audios modal's datatable

    //loads audio file clicked in the table 
    FilesDtable.on('click', 'tbody tr', function (e) {
        // Check if the click event originated from the delete button or edit button
        if (!$(e.target).closest('.delete-btn').length && !$(e.target).closest('.modify-btn').length && 
            !$(e.target).closest('.excel-btn').length && !$(e.target).closest('.audio-btn').length) {
            let data = FilesDtable.row(this).data();
            var filename = data[0];
            var user = data[2];
            cleanBeforeLoad(myModalEl)
            changeAudio(user + '/' + filename, whichFiles);  
        }  
    });

    //removes specific audio
    FilesDtable.on('click', 'button.delete-btn', function () {
        var row = $(this).closest('tr');
        var rowData = FilesDtable.row(row).data();
        console.log(rowData);
        fetch(`/delete_annotation?file=${rowData[0]}&user=${rowData[2]}`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => response.json())
        .then(res => {

        }).catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
        FilesDtable.row(row).remove().draw(false);

        var new_markers = L.layerGroup()
        markers.eachLayer(function(marker) {
            if (marker._id !== rowData[0]) {
                new_markers.addLayer(marker)
            }
        })
        markers.clearLayers();
        markers = new_markers
        markers.addTo(mapFiles)
    });

    //Renames file
    FilesDtable.on('click', 'button.modify-btn', function () {
        var row = $(this).closest('tr');
        var rowData = FilesDtable.row(row).data();
        var rowIdx = FilesDtable.row(row).index();
        var newName = prompt("Enter the new name:");
        var forbiddenChar = /[\/.\\]/;
        if (forbiddenChar.test(newName)) {
            alert("ERROR : " + "forbidden chars")
            return
        }
        newName = newName + '.wav'
        rowData[1] = newName;
        FilesDtable.row(rowIdx).data(rowData).invalidate();

        fetch(`/rename_annotation?file=${rowData[0]}&newname=${newName}`, {
            method: 'POST',
            headers: {
            'X-CSRFToken': csrfToken
        }
        })
        .then(response => response.json())
        .then(res => {

        }).catch(function (err) {
            console.log('Fetch Error :-S', err);
        });

    });

    //Returns csv of specific file
    FilesDtable.on('click', 'button.excel-btn', function () {
        var row = $(this).closest('tr');
        var rowData = FilesDtable.row(row).data();
        var rowIdx = FilesDtable.row(row).index();
        download_csv(rowData[0])

    });


    function cleanBeforeLoad(modal) {
        //Deletes extentions of wavesurfer and empties datatables.
        if (wavesurfer) {
            if(wsRegions){
                wsRegions.unAll();
            }
            wavesurfer.destroy();
            temporaryInit();
        }
        bootstrap.Modal.getInstance(modal).hide() 
        FilesDtable.clear().draw();
        Dtable.clear().draw();
    }
    
    


//----------------------------------------------------------------------------------------------
//Listeners related to the my/all audios modal's map

    

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapFiles);

    function onMapClick(e) {    
        if (marker != null) {
            map.removeLayer(marker)
        }
        marker = L.marker(e.latlng).addTo(map).on('click', e => {e.target.remove();marker=null});
        console.log(marker);
        console.log(marker._latlng);
    }
    function showFilesFromDistance(e) {
        if (markerQuery != null) {
            mapFiles.removeLayer(markerQuery)
        }
        markerQuery = L.marker(e.latlng).addTo(mapFiles).on('click', e => {e.target.remove();markerQuery=null});
        FilesDtable.clear().draw();
        getFiles('all')
    }
    
    map.on('click', onMapClick);
    mapFiles.on('click', showFilesFromDistance)



//----------------------------------------------------------------------------------------------
//Creating Taxonomy Dropdown for My/All audio Modals

    let modalCheckedBoxes = []; 


    const TaxonomyList = [
        'Bird',
        ['Bat', [['Barbarg',['Barbastella barbastellus']], ['Pip35',['Pipistrellus kuhlii','Pipistrellus nathusii']], ['Pip50',['Pipistrellus maderensis','Pipistrellus pipistrellus','Pipistrellus pygmaeus']], ['Envsp',['Eptesicus nilssonii','Eptesicus serotinus','Nyctalus lasiopterus','Nyctalus leisleri','Nyctalus noctula','Vespertilio murinus']],['Myosp',['Myotis alcathoe','Myotis bechsteinii','Myotis brandtii','Myotis capaccinii','Myotis dasycneme','Myotis daubentonii','Myotis emarginatus','Myotis myotis','Myotis mystacinus','Myotis nattereri']],['Plesp',['Plecotus austriacus','Plecotus auritus']],['Rhisp',['Rhinolophus blasii','Rhinolophus ferrumequinum','Rhinolophus hipposideros']]]]
    ];
    const taxDiv = document.getElementById('taxDiv')
    const ul = addTaxonomy(TaxonomyList)

    ul.querySelectorAll('input[type="checkbox"]').forEach(input => {
        if (!input.classList.contains("Allcheckbox")) {
            input.addEventListener('change', (event) => {
                if(input.checked){modalCheckedBoxes.push(input.value)}
                else {
                    let index = modalCheckedBoxes.indexOf(input.value);
                    if (index !== -1) {
                        modalCheckedBoxes.splice(index, 1);
                    }
                }
                FilesDtable.clear().draw();
                getFiles(modalCheckedBoxes);

            })
        }

        else{
            input.addEventListener('change', (event) => {
                let isChecked = input.checked;
                input.parentNode.querySelectorAll('input[type="checkbox"]').forEach(input => {
                    input.checked = isChecked;
                    if (isChecked) {modalCheckedBoxes.push(input.value)}
                    else {
                        let index = modalCheckedBoxes.indexOf(input.value);
                        if (index !== -1) {
                            modalCheckedBoxes.splice(index, 1);
                        }
                    }
                });
                FilesDtable.clear().draw();
                getFiles(modalCheckedBoxes);
                console.log(modalCheckedBoxes);
            })
        }

    });
    taxDiv.appendChild(ul);
    

//----------------------------------------------------------------------------------------------
//Listeners and utils for AI processing
    

    document.getElementById('processButton').addEventListener('click', function () {
        routine('BatML')
    });

    document.getElementById('processButton2').addEventListener('click', function () {
        routine('BirdNET')
    });

    document.getElementById('processButton3').addEventListener('click', function () {
        routine('BattyBirdNET')
    });

    document.getElementById('processButton4').addEventListener('click', function () {
        routine('batdetect2')
    });
    document.getElementById('processButton5').addEventListener('click', function () {
        routine('AIVoting')
    });


    //Setup form before sending a processRequest 
    function routine(ai) {
        const formData = new FormData();
        if (multipleAudio) {
            Array.from(multipleAudioFile.files).forEach((file, index) => {
                checkAudio(file,multipleAudioLength[index])
                formData.append(`audio`, file)
                formData.append(`duration`, multipleAudioLength[index])
            })
            predictedTime(multipleAudioLength,ai,Array.from(multipleAudioFile.files).map((f) => f.size),"grjf")
        } else {
            checkAudio(fileInput.files[0],audioLength)
            formData.append('audio',fileInput.files[0])
            formData.append('duration',audioLength)
            predictedTime([audioLength],ai,[fileInput.files[0].size],"greg")

        }
        formData.append('chosenAI', ai);
        if (marker != null) {
            formData.append('lat', marker._latlng.lat);
            formData.append('lng', marker._latlng.lng);
        }
        processRequest(formData,"gfdvg",123)
    }

    //Checks that the audio is conform before processing
    function checkAudio(file,duration) {
        if (!file) {
            alert('Please select an audio file first.');
            return;
        }
        if (duration > 3603) {
            alert('ERROR : cannot process audio; audio too long\nMax length is 1 hour');
            return;
        }
    }

    //Asks the application for a timeprediction on the processing
    function predictedTime(duration,ai,size,filename) {
        fetch('/predicted_time', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({'time':duration,'AI':ai,'bytes':size}) 
        })
        .then(response => response.json())
        .then(data => {
            let seconds = data.predicted_time;
            let minutes = Math.floor(seconds / 60)
            seconds = Math.round(seconds % 60)
            let paddedSeconds = `${seconds < 10 ? '0' : ''}${seconds}`

            alert(`The predicted time to analyse is ${minutes} min ${paddedSeconds} sec.`);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }


    //Takes the form data from the AI Routine then sends the request to the application and handles the result by creating regions if needed
    function processRequest(formData, filename, duration) {
        document.getElementById("spinner").style.display = "inline-block";

        fetch('/process', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => response.json())
        .then(async data => {
            if (data.error != undefined) {
                alert('ERROR : ' + data.error)
                return
            }

            if (userName && !multipleAudio) {uploadButton.disabled = false;save.disabled = false;}
            
            if (multipleAudio) {
                regions = []
                unremovableRegions = []
            }

            var idx = 0;
            data.start.forEach(async (start, index) => {
                if (index != 0 && data.files[index] != data.files[index-1]) {
                    console.log(1000,regions)
                    saveAnnotationToServer(data.files[index-1].split('.')[0],data.files[index-1],regions,userName,'local',true);
                    idx = idx + 1;
                    regions = []
                    unremovableRegions = []
                }
                let note = ""
                let specy = data.result[index]
                
                var idn = `bat-${Math.random().toString(32).slice(2)}`
                var obj = {
                    id: idn,
                    start: parseFloat(start), 
                    end: parseFloat(data.end[index]), 
                    content: createRegionContent(document,`${specy}`, note, true),
                    drag: false,
                    resize: false,
                    proba: data.probability[index],
                    ai: data.AI,
                }
                regions.push(obj)
                unremovableRegions.push(obj)
                
                //Populate DataTable
                if (!multipleAudio) {
                    var row = Dtable.row.add([
                        //data.result[index],
                        specy,
                        data.start[index],
                        data.probability[index],
                        data.AI,
                        idn,
                        "<button class='btn btn-sm delete-btn'><i class='fa fa-trash'></i></button>"
                    ]).draw().node();
                }
                
                
            })
            if (multipleAudio) {
                try { // because data.files might be empty
                    saveAnnotationToServer(data.files[data.files.length-1].split('.')[0],data.files[data.files.length-1],regions,userName,'local',true);
                } catch (error) {
                    console.log(error);
                }
            } else {
                saveAnnotationToServer(fileInput.files[0].name.split('.')[0],fileInput.files[0].name,regions,userName,'local',false);
                updateWaveform()
            }
            document.getElementById("spinner").style.display = "none";

        })
        .catch(error => {
            document.getElementById("spinner").style.display = "none";
            alert("ERROR")
            console.error('Error:', error);
        });
    }



    //If user not logged in show error message when trying to run AI
    const tooltip = document.getElementById('tooltip');
    document.getElementById('AIbuttons').addEventListener('mouseover', () => {
        if (document.getElementById('startAI').disabled) {
            tooltip.style.display = 'block';
        } 
    });
    document.getElementById('AIbuttons').addEventListener('mouseout', () => {
        tooltip.style.display = 'none';
    });


//----------------------------------------------------------------------------------------------


});