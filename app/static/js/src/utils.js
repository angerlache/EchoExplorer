
export function generateColorMap(rVal, gVal, bVal,alpha) {
    //Generates a color map for the spectrogram given rgb and alpha parameters.
    const colorMap = [];

    for (let i = 0; i < 256; i++) {
        const gradient = i / 255;
        const r = Math.sin(gradient * Math.PI * 2 + rVal * Math.PI) * 0.5 + 0.5;  //0
        const g = Math.sin(gradient * Math.PI * 2 + gVal * Math.PI) * 0.5 + 0.5;  //2/3
        const b = Math.sin(gradient * Math.PI * 2 + bVal * Math.PI) * 0.5 + 0.5;  //4/3

        colorMap.push([r, g, b, alpha]);
    }

    return colorMap;
}


export function containsRegion(obj, list) {
    //Checks if a list contains a region with a specific ID
    var i;
    for (i = 0; i < list.length; i++) {
        if (obj.id === list[i].id) {
            return true;
        }
        
    }

    return false;
}

export function createRegionContent(document,regionLabel,regionNote,show) {
    //Creates an html element with label and potential notes to be put in the conten field of a region
    var regionContent = document.createElement('div');
    // Add a title element (e.g., h3) to the container
    var title = document.createElement('h3');
    title.textContent = regionLabel;
    title.style.fontSize = "12px";
    if (!show) {
        title.style.display = 'none'
    }
    regionContent.appendChild(title);
    // Add a paragraph element (p) for the longer note
    var note = document.createElement('p');
    note.textContent = regionNote;
    note.style.display = 'none'
    regionContent.appendChild(note);

    return regionContent;
}

// FROM : https://gist.github.com/72lions/4528834
export function appendBuffer(buffer1,buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
}

export function getCurrRegions(chunkLength,currentPosition,wr,regions){
    //Gets all the regions that are supposed to be displayed
    //wr = wavesurfer regions
    if(wr){
        const regionsBetween = regions.filter(region => {
            const regionStart = region.start;
            return regionStart >= currentPosition && regionStart <= (currentPosition+chunkLength);
        });
        return regionsBetween;
    }
}




export function renderRegions(chunkLength,currentPosition,wr,regions,SelectedSpecies,SpeciesList,SelectedAI,threshold){
    //Get a list of all the regions supposed to be displayed with getCurrRegions, Then filters them according to selected options.
    getCurrRegions(chunkLength,currentPosition,wr,regions).forEach(reg => {
        if (!SelectedAI.includes(reg.ai)) {
            // if AI not include in the list => do not show the region.
        }
        else if (reg.proba !== undefined && reg.proba*100 < threshold) {
            // do not show the region if it has a proba and that proba < threshold
        }
        else if (!SelectedSpecies.includes(reg.content.querySelector('h3').textContent) && SpeciesList.includes(reg.content.querySelector('h3').textContent)) {
            // If region is labbeled as a specie but the specie is not in the selected ones => do not show the region.
        } 
        else if (SelectedSpecies.includes(reg.content.querySelector('h3').textContent) || SelectedSpecies.includes('other')) {
            wr.addRegion({
                start: reg.start - currentPosition, 
                end: reg.end - currentPosition,
                color: reg.color, 
                content: reg.content,
                drag: reg.drag,
                resize: reg.resize,
                id: reg.id,
            });
        } 
    });
    
}


const csrfToken = document.getElementById('csrf_token').value;
/**
 * upload to server
 * FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
 */
export function saveAnnotationToServer(annotation_name,filename,regions,userName,destination,append) {
    // Saves all the annotated regions to the server.
    let data = JSON.stringify(
        Object.keys(regions).map(function (id) {
            var region = regions[id];

            return {
                file: filename,
                start: region.start,
                end: region.end,
                label: region.content.querySelector('h3').textContent,
                note: region.content.querySelector('p').textContent,
                id: region.id,
                ...(region.proba !== undefined && { proba: region.proba }),
                ai: region.ai,
                drag: region.drag,
                resize: region.resize
            };
        })
    );

    let path;
    if (destination == "validated") {path = "/validated/" + annotation_name;}
    else if (destination == "local") { path = "/users/" + userName + "/annotation/" + annotation_name}
    else {path = "/uploads/" + annotation_name}
    
    fetch(path+`?arg=${append}`, {
        method: "POST",
        body: data,
        headers: {
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => response.json())
    .then(res => {
        console.log(res)
        if (res.error !== undefined) {
            alert("ERROR : " + res.error)
            return;
        }
        console.log("upload complete", annotation_name, res);
    }).catch(function (err) {
        console.log('Fetch Error :-S', err);
        alert('upload file error: ' + annotation_name)
    });
        
    
}

// source : https://jsfiddle.net/6spj1059/
export function getBrowser() {
    //Returns current browser, used to change max frequency as not supported by Firefox

    // Opera 8.0+
    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    // Firefox 1.0+
    var isFirefox = typeof InstallTrigger !== 'undefined';
    // Safari 3.0+ "[object HTMLElementConstructor]" 
    var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));
    // Internet Explorer 6-11
    var isIE = /*@cc_on!@*/false || !!document.documentMode;
    // Edge 20+
    var isEdge = !isIE && !!window.StyleMedia;
    // Chrome 1 - 79
    var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
    // Edge (based on chromium) detection
    var isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") != -1);
    // Blink engine detection
    var isBlink = (isChrome || isOpera) && !!window.CSS;
    if (isOpera) {return 'Opera'}
    if (isFirefox) {return 'Firefox'}
    if (isSafari) {return 'Safari'}
    if (isIE) {return 'IE'}
    if (isEdge) {return 'Edge'}
    if (isChrome) {return 'Chrome'}
    if (isEdgeChromium) {return 'EdgeChromium'}
    if (isBlink) {return 'Blink'}
}



export function addTaxonomy(taxList, iter = 0) {
    //Creates html element to filter datatable by taxonomy
    const ul = document.createElement('ul');
    ul.classList.add("dropdown-menu");
    taxList.forEach(item => {
        const li = document.createElement('li');
        

        if (Array.isArray(item)){
            const [label, subItems] = item;
            li.classList.add('dropend');

            const check = document.createElement('input');
            check.classList.add('form-check-input');
            check.id = label.toLowerCase();
            check.type = "checkbox";
            check.classList.add('Allcheckbox')
            check.value = label
            li.appendChild(check);

            const a = document.createElement('label');
            a.classList.add('form-check-label');
            a.innerHTML = label + '   &raquo;';
            a.setAttribute('data-bs-toggle', 'dropdown');
            a.setAttribute('data-bs-auto-close', 'outside');
            a.href = '#';
            a.setAttribute('for', label.toLowerCase());
            li.appendChild(a);

            li.appendChild(addTaxonomy(subItems, iter+1));
            
            

        }else {

            const input = document.createElement('input');
            input.classList.add('form-check-input');
            input.type = 'checkbox';
            input.value = item;
            input.id = item.toLowerCase();
            
            const labelElem = document.createElement('label');
            labelElem.classList.add('form-check-label');
            labelElem.setAttribute('for', item.toLowerCase());
            labelElem.textContent = item;
            
            li.appendChild(input);
            li.appendChild(labelElem);
            
        }

        ul.appendChild(li);

        

    });

    return ul;
}
