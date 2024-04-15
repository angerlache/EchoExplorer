
export function generateColorMap() {
    const colorMap = [];

    for (let i = 0; i < 256; i++) {
        const gradient = i / 255;
        const r = Math.sin(gradient * Math.PI * 2) * 0.5 + 0.5;
        const g = Math.sin(gradient * Math.PI * 2 + (2 / 3) * Math.PI) * 0.5 + 0.5;
        const b = Math.sin(gradient * Math.PI * 2 + (4 / 3) * Math.PI) * 0.5 + 0.5;
        const alpha = 1.0;

        colorMap.push([r, g, b, alpha]);
    }

    return colorMap;
}

export function containsRegion(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (obj.id === list[i].id) {
            return true;
        }
        
    }

    return false;
}

export function createRegionContent(document,regionLabel,regionNote,show) {
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
    if(wr){
        //console.log("Regions list:")
        //console.log(regions)
        const regionsBetween = regions.filter(region => {
            const regionStart = region.start;
            return regionStart >= currentPosition && regionStart <= (currentPosition+chunkLength);
        });
        return regionsBetween;
    }
}




export function renderRegions(chunkLength,currentPosition,wr,regions,SelectedSpecies,SpeciesList,SelectedAI,threshold){
    getCurrRegions(chunkLength,currentPosition,wr,regions).forEach(reg => {
        //console.log("region added",reg)
        if (!SelectedAI.includes(reg.ai)) {
            // if AI not include in the list => do not show the region
        }
        else if (reg.proba !== undefined && reg.proba*100 < threshold) {
            // if proba is undefined, region will be shown
            // do not show the region if it has a proba and that proba < threshold
        }
        else if (!SelectedSpecies.includes(reg.content.querySelector('h3').textContent) && SpeciesList.includes(reg.content.querySelector('h3').textContent)) {
            // it is Envsp,Barbarg,...
            // and must not appear on waveform
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

// same as renderRegions but with regions saved in the json of the file
//export function loadRegions(document,chunkLength,currentPosition,wr,annotations,regions){
export function loadRegions(document,annotations,regions){

    // todo: check if the id is present in the list, so that
    // if user repush on the button, the regions are not duplicated
    annotations.forEach(region => {
        if (!containsRegion(region, regions)) {
            regions.push({
                start: region.start,
                end: region.end,
                id: region.id,
                ai: region.ai,
                content: createRegionContent(document,region.label,region.note,true)})
        }
    });
}


/**
 * upload to server
 * FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
 */
export function saveAnnotationToServer(audioLength,annotation_name,filename,regions,userName,destination) {
    // ! this saves also the response of the AI, maybe we should change this ?
    let data = JSON.stringify(
        Object.keys(regions).map(function (id) {
            var region = regions[id];
            if (region.proba !== undefined) {
                return {
                    duration: audioLength,
                    file: filename,
                    start: region.start,
                    end: region.end,
                    //content: region.content,
                    label: region.content.querySelector('h3').textContent,
                    note: region.content.querySelector('p').textContent,
                    id: region.id,
                    proba: region.proba,
                    ai: region.ai,
                    drag: region.drag
                };
            } else {
                return {
                    duration: audioLength,
                    file: filename,
                    start: region.start,
                    end: region.end,
                    //content: region.content,
                    label: region.content.querySelector('h3').textContent,
                    note: region.content.querySelector('p').textContent,
                    id: region.id,
                    ai: region.ai,
                    drag: region.drag
                }
            }
        })
    );

    let path;
    if (destination == "validated") {path = "/validated/" + annotation_name;}
    else if (destination == "local") { path = "/users/" + userName + "/annotation/" + annotation_name}
    else {path = "/uploads/" + annotation_name}
    
    fetch(path, {
    //fetch("/annotation/" + annotation_name, {
        method: "POST",
        body: data
    }).then(res => {
        if (!res.ok) throw res;
        console.log("upload complete", annotation_name, res);
    }).catch(function (err) {
        console.log('Fetch Error :-S', err);
        alert('upload file error: ' + annotation_name)
    });
        
    
}

// source : https://jsfiddle.net/6spj1059/
export function getBrowser() {
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




 