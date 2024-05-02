import { generateColorMap,appendBuffer,renderRegions,saveAnnotationToServer,createRegionContent,getBrowser,addTaxonomy,containsRegion} from './utils.js';
'use strict';



document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('audioFile');
    const multipleAudioFile = document.getElementById('multipleAudioFile');
    const processButton = document.getElementById('processButton');
    const processButton2 = document.getElementById('processButton2');
    const processButton3 = document.getElementById('processButton3');
    const processButton4 = document.getElementById('processButton4');
    const processButton5 = document.getElementById('processButton5');
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
    const save = document.getElementById('save'); save.disabled = true;
    const csv = document.getElementById('csv');
    const loadLabels = document.getElementById('loadLabels');
    const validateButton = document.getElementById('validateButton');
    const uploadButton = document.getElementById('uploadButton'); uploadButton.disabled = true;
    const chunkLengthSelector = document.getElementById('chunkLengthSelector');
    const radiusSearchSelector = document.getElementById('radiusSearchSelector'); radiusSearchSelector.value=10000
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const applySpecies = document.getElementById('applySpecies')
    const applyAI = document.getElementById('applyAI')
    const audioVisibleBox = document.getElementById('audioVisible'); audioVisibleBox.checked = audioVisible=='True'

    const zoomButton = document.getElementById('zoomButton')
    const optionsButton = document.getElementById('optionsButton')
    const annotationsButton = document.getElementById('annotationsButton')
    const speciesButton = document.getElementById('speciesButton')
    const aiButton = document.getElementById('aiButton')

    const validatedFilesSwitch = document.getElementById('validatedFilesSwitch')
    const myFilesSwitch = document.getElementById('myFilesSwitch')
    
    const csrfToken = document.getElementById('csrf_token').value;

    let chunkLength = 20;
    chunkLengthSelector.value = chunkLength;

    let currentPosition = 0;
    let audioLength;
    let multipleAudioLength = [];
    let multipleAudio = false;
    //let minProba = 80;
    let sR = 44100; 
    
    //const checkBoxes = document.querySelectorAll('.dropdown-menu input[type="checkbox"]'); 
    let modalCheckedBoxes = []; 
    const checkBoxes = document.querySelectorAll('#speciesBoxes input[type="checkbox"]');
    const AIcheckBoxes = document.querySelectorAll('#aiBoxes input[type="checkbox"]');
    let SelectedSpecies = ['Barbarg', 'Envsp', 'Myosp', 'Pip35', 'Pip50', 'Plesp', 'Rhisp','Region','other',"Barbastella barbastellus", "Eptesicus nilssonii", "Eptesicus serotinus", "Myotis alcathoe", "Myotis bechsteinii", "Myotis brandtii", "Myotis capaccinii", "Myotis dasycneme", "Myotis daubentonii", "Myotis emarginatus", "Myotis myotis", "Myotis mystacinus", "Myotis nattereri", "Nyctalus lasiopterus", "Nyctalus leisleri", "Nyctalus noctula", "Pipistrellus kuhlii", "Pipistrellus maderensis", "Pipistrellus nathusii", "Pipistrellus pipistrellus", "Pipistrellus pygmaeus", "Rhinolophus blasii", "Rhinolophus ferrumequinum", "Rhinolophus hipposideros", "Vespertilio murinus",'Plecotus auritus','Plecotus austriacus']; 
    let SpeciesList = ['Barbarg', 'Envsp', 'Myosp', 'Pip35', 'Pip50', 'Plesp', 'Rhisp','Region','other',"Barbastella barbastellus", "Eptesicus nilssonii", "Eptesicus serotinus", "Myotis alcathoe", "Myotis bechsteinii", "Myotis brandtii", "Myotis capaccinii", "Myotis dasycneme", "Myotis daubentonii", "Myotis emarginatus", "Myotis myotis", "Myotis mystacinus", "Myotis nattereri", "Nyctalus lasiopterus", "Nyctalus leisleri", "Nyctalus noctula", "Pipistrellus kuhlii", "Pipistrellus maderensis", "Pipistrellus nathusii", "Pipistrellus pipistrellus", "Pipistrellus pygmaeus", "Rhinolophus blasii", "Rhinolophus ferrumequinum", "Rhinolophus hipposideros", "Vespertilio murinus",'Plecotus auritus','Plecotus austriacus'];  

    let SelectedAI = ['Human', 'BatML', 'BirdNET', 'BattyBirdNET', 'batdetect2'];
    let AIlist = ['Human', 'BatML', 'BirdNET', 'BattyBirdNET', 'batdetect2'];
    const TaxonomyList = [
        'Bird',
        ['Bat', [['Barbarg',['Barbastella barbastellus']], ['Pip35',['Pipistrellus kuhlii','Pipistrellus nathusii']], ['Pip50',['Pipistrellus maderensis','Pipistrellus pipistrellus','Pipistrellus pygmaeus']], ['Envsp',['Eptesicus nilssonii','Eptesicus serotinus','Nyctalus lasiopterus','Nyctalus leisleri','Nyctalus noctula','Vespertilio murinus']],['Myosp',['Myotis alcathoe','Myotis bechsteinii','Myotis brandtii','Myotis capaccinii','Myotis dasycneme','Myotis daubentonii','Myotis emarginatus','Myotis myotis','Myotis mystacinus','Myotis nattereri']],['Plesp',['Plecotus austriacus','Plecotus auritus']],['Rhisp',['Rhinolophus blasii','Rhinolophus ferrumequinum','Rhinolophus hipposideros']]]]
    ];
    const taxDiv = document.getElementById('taxDiv')
    const ul = addTaxonomy(TaxonomyList)

    ul.querySelectorAll('input[type="checkbox"]').forEach(input => {
        if (input.value != "Allcheckbox") {
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
                    if (isChecked && input.value != "Allcheckbox") {modalCheckedBoxes.push(input.value)}
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

    let wavesurfer;

    let wsRegions; // Define wsRegions here
    let regions = [];
    let unremovableRegions = []
    let annotation_name;
    let maxFreq = 96000;
    let arrayBuffer;

    var modalNewObservation = document.getElementById('modalNewObservation')
    
    // dont know exactly the diff between 'shown.bs.modal' and 'show.bs.modal'
    // but in the latter the map is not rendered well
    modalNewObservation.addEventListener('shown.bs.modal', (event) => {
        map.invalidateSize();
    });

    var map = L.map('map').setView([50.8503, 4.3517], 8);
    var mapFiles = L.map('mapFiles').setView([50.8503, 4.3517], 8);
    var markers = L.layerGroup()
    let marker = null;
    let markerQuery = null;

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
    

    //temporary init
    function temporaryInit() {
        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'black',
            progressColor: 'red',
            sampleRate: maxFreq * 2,
            //minPxPerSec: 500,
            dragToSeek: true,
        });
        wavesurfer.registerPlugin(WaveSurfer.Timeline.create());
    }
    temporaryInit()

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

    Dtable.search.fixed('ai', function (searchStr, data, index) {
        var ai = data[3];
        return SelectedAI.includes(ai)
    }); 
    
    function cleanBeforeLoad(modal) {
        if (wavesurfer) {
            // ICI tu fait un truc pour que il fasse plus qqchs on-delete
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


    var myModalEl = document.getElementById('modalAudios')
    
    var whichFiles = 'all'
    const FilesDtable = new DataTable('#FilesTable',{order: [[1, 'asc']]}); 
    FilesDtable.column(0).visible(false);

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
        //FilesDtable.row(row).data(rowData).draw();
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

    FilesDtable.on('click', 'button.excel-btn', function () {
        var row = $(this).closest('tr');
        var rowData = FilesDtable.row(row).data();
        var rowIdx = FilesDtable.row(row).index();
        download_csv(rowData[0])

    });


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

    function setAllSpecies(whichFiles){
        fetch(`/retrieve_allspecies?arg=${whichFiles}`, {
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
                loadNextChunk(event,data[4]) //3
            }
            var file = fileInput.files[0];
            reader.readAsArrayBuffer(file);
            // Example: Log values to console
            console.log('Clicked Row:', time);
        }
    });

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

    // Give regions a random color when they are created
    const random = (min, max) => Math.random() * (max - min) + min
    const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`


    // same as renderRegions but with regions saved in the json of the file
    //export function loadRegions(document,chunkLength,currentPosition,wr,annotations,regions){
    function loadRegions(document,annotations,regions,addRow){
        if (!Array.isArray(annotations)) {
            // it is {'error':'some error description'} and not an array
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
            console.log(wavesurfer)
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
            renderRegions(chunkLength,currentPosition,wsRegions,regions,SelectedSpecies,SpeciesList,SelectedAI,sliderProba.value);
            
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
            save.disabled = false;
            uploadButton.disabled = false;
        } catch (error) {
            console.error('Error fetching annotation:', error);
        }
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



    fileInput.addEventListener('change', (event) => {
        const selectedFile = event.target.files[0];
        //function fileSelected(selectedFile) //{
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
            //const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        document.getElementById('freqout').value = `${maxFreq}` + ' Hz'

        updateWaveform()
    });

    sliderProba.addEventListener('change', (e) => {
        const val = e.target.valueAsNumber;
        //minProba = val;
        Dtable.draw();

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

    radiusSearchSelector.addEventListener('change', () => {
        console.log();
    });

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
        saveAnnotationToServer(annotation_name,fileInput.files[0].name,regions,userName,'local');
    });
    
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
            
            /*console.log(data);
            if (multipleAudio) {
                regions = []
                unremovableRegions = []
                try {
                    const response = await fetch('users/' + userName + '/annotation/' + filename.split('.')[0]);
                    const data = await response.json();
                    loadRegions(document,data,regions,false);
                    loadRegions(document,data,unremovableRegions,false);
                } catch (error) {
                    console.error('Error fetching annotation:', error);
                }
            }
            if (userName && !multipleAudio) {uploadButton.disabled = false;save.disabled = false;}
            
            data.start.forEach((start, index) => {
                //console.log('Adding region:', start);
                let note = ""
                let specy = data.result[index]
                
                var idn = `bat-${Math.random().toString(32).slice(2)}`
                var obj = {
                    id: idn,
                    start: parseFloat(start), //timestamp-currentPosition,
                    end: parseFloat(data.end[index]), //timestamp-currentPosition,
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
            if (multipleAudio || document.getElementById('saveAfterAI').checked) {
                saveAnnotationToServer(filename.split('.')[0],filename,regions,userName,'local');
                //saveAnnotationToServer(filename.split('.')[0],filename,unremovableRegions,userName,'other'); 
            }
            if (multipleAudio) {
                if (duration == multipleAudioLength[multipleAudioLength.length - 1]) {
                    document.getElementById("spinner").style.display = "none";
                    if (marker != null) {
                        map.removeLayer(marker)
                    }
                    marker = null;
                }
                alert("Your file " + filename + " has been processed.\n You can find it in your section 'My Audios'")
            } else {
                document.getElementById("spinner").style.display = "none";
                if (marker != null) {
                    map.removeLayer(marker)
                }
                marker = null;
                alert("Your file has been processed")
                updateWaveform()
            }*/

            if (userName && !multipleAudio) {uploadButton.disabled = false;save.disabled = false;}
            
            if (multipleAudio) {
                regions = []
                unremovableRegions = []
                try {
                    const response = await fetch('users/' + userName + '/annotation/' + multipleAudioFile.files[0].name.split('.')[0]);
                    const d = await response.json();
                    loadRegions(document,d,regions,false);
                    loadRegions(document,d,unremovableRegions,false);
                } catch (error) {
                    console.error('Error fetching annotation:', error);
                }
            }

            var idx = 0;
            data.start.forEach(async (start, index) => {
                if (index != 0 && data.files[index] != data.files[index-1]) {
                    saveAnnotationToServer(data.files[index-1].name.split('.')[0],data.files[index-1].name,regions,userName,'local');
                    //saveAnnotationToServer(multipleAudioFile.files[idx].name.split('.')[0],multipleAudioFile.files[idx].name,regions,userName,'local');
                    idx = idx + 1;
                    regions = []
                    unremovableRegions = []
                    try {
                        const response = await fetch('users/' + userName + '/annotation/' + data.files[index].split('.')[0]);
                        const d = await response.json();
                        loadRegions(document,d,regions,false);
                        loadRegions(document,d,unremovableRegions,false);
                    } catch (error) {
                        console.error('Error fetching annotation:', error);
                    }
                }
                let note = ""
                let specy = data.result[index]
                
                var idn = `bat-${Math.random().toString(32).slice(2)}`
                var obj = {
                    id: idn,
                    start: parseFloat(start), //timestamp-currentPosition,
                    end: parseFloat(data.end[index]), //timestamp-currentPosition,
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
                saveAnnotationToServer(data.files[data.files.length-1].name.split('.')[0],data.files[data.files.length-1].name,regions,userName,'local');
                //saveAnnotationToServer(multipleAudioFile.files[idx].name.split('.')[0],multipleAudioFile.files[idx].name,regions,userName,'local');
            } else {
                saveAnnotationToServer(fileInput.files[0].name.split('.')[0],fileInput.files[0].name,regions,userName,'local');
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

    function processButtonRoutine(file,duration,ai) {
        document.getElementById("spinner").style.display = "inline-block";
        checkAudio(file,duration)

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('chosenAI', ai);
        formData.append('duration', Math.round(duration));
        console.log('marker = ', marker);
        if (marker != null) {
            formData.append('lat', marker._latlng.lat);
            formData.append('lng', marker._latlng.lng);
        }

        predictedTime(duration,ai,file.size,file.name)

        processRequest(formData,file.name,duration)
    }

    processButton.addEventListener('click', function () {
        routine('BatML')
        /*if (!multipleAudio) {
            processButtonRoutine(fileInput.files[0],audioLength,'BatML')
        } else {
            Array.from(multipleAudioFile.files).forEach((file, i) => {
                processButtonRoutine(file,multipleAudioLength[i],'BatML')
            })
        }*/
    });

    processButton2.addEventListener('click', function () {
        routine('BirdNET')
        /*if (!multipleAudio) {
            processButtonRoutine(fileInput.files[0],audioLength,'BirdNET')
        } else {
            Array.from(multipleAudioFile.files).forEach((file, i) => {
                processButtonRoutine(file,multipleAudioLength[i],'BirdNET')
            })
        }*/
    });


    processButton3.addEventListener('click', function () {
        routine('BattyBirdNET')
        /*if (!multipleAudio) {
            processButtonRoutine(fileInput.files[0],audioLength,'BattyBirdNET')
        } else {
            Array.from(multipleAudioFile.files).forEach((file, i) => {
                processButtonRoutine(file,multipleAudioLength[i],'BattyBirdNET')
            })
        }*/
    });

    processButton4.addEventListener('click', function () {
        routine('batdetect2')
        /*if (!multipleAudio) {
            processButtonRoutine(fileInput.files[0],audioLength,'batdetect2')
        } else {
            Array.from(multipleAudioFile.files).forEach((file, i) => {
                processButtonRoutine(file,multipleAudioLength[i],'batdetect2')
            })
        }*/
    });

    processButton5.addEventListener('click', function () {
        routine('BatML')
        /*const formData = new FormData();

        if (multipleAudio) {
            Array.from(multipleAudioFile.files).forEach((file, index) => {
                checkAudio(file,multipleAudioLength[index])
                formData.append(`audio`, file)
                formData.append(`duration`, multipleAudioLength[index])
            })
            predictedTime(multipleAudioLength,'BatML',Array.from(multipleAudioFile.files).map((f) => f.size),"grjf")
        } else {
            checkAudio(fileInput.files[0],audioLength)
            formData.append('audio',fileInput.files[0])
            formData.append('duration',audioLength)
            predictedTime([audioLength],'BatML',[fileInput.files[0].size],"greg")

        }

        formData.append('chosenAI', 'BatML');
        if (marker != null) {
            formData.append('lat', marker._latlng.lat);
            formData.append('lng', marker._latlng.lng);
        }
        

        processRequest(formData,"gfdvg",123)*/
    });

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

    validateButton.addEventListener('click', function () {
        // in isExpert case : regions==unremovableRegions
        saveAnnotationToServer(annotation_name,fileInput.files[0].name,unremovableRegions,userName,'validated');
    });

    uploadButton.addEventListener('click', function () {
        saveAnnotationToServer(annotation_name,fileInput.files[0].name,unremovableRegions,userName,"other");

    });



    // Function to load waveform
    window.changeAudio = function(filename,whichFiles) {
        console.log("1111 ", '/reload/' + filename);
        document.getElementById("spinner2").style.display = "inline-block";

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
                uploadButton.disabled = false;
                loadLabels.disabled = true;
                save.disabled = false;
                // Introduce a delay using setTimeout, because we need 'fileInput' listener has finished before starting
                // 'visualizeButton' listener
                /*setTimeout(() => {
                    // Manually trigger the click event on the visualizeButton
                    updateWaveform()
                }, 200); // Adjust the delay (in milliseconds) as needed*/

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
    
    for (var i = 1; i <= 7; i++) {
        var showSubOptions = document.getElementById('showSubOptions' + i);
        var subOptions = document.querySelector('.subOptions' + i);
      
        showSubOptions.onclick = function(subOptions) {
            return function() {
                subOptions.style.display = subOptions.style.display == 'none' ? 'block' : 'none';
            };
        }(subOptions);
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

});
