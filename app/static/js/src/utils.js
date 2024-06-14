
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



