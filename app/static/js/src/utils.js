
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

export function renderRegions(chunkLength,currentPosition,wr,regions){
    getCurrRegions(chunkLength,currentPosition,wr,regions).forEach(reg => {
        //console.log("region added")
        //console.log(reg)
        wr.addRegion({
            start: reg.start - currentPosition,
            end: reg.end - currentPosition,
            color: reg.color, 
            content: reg.content,
            drag: reg.drag,
            resize: reg.resize,
            id: reg.id,
        });
    });
}

/**
 * upload to server
 * FROM : https://github.com/smart-audio/audio_diarization_annotation/tree/master
 */
export function saveAnnotationToServer(audioLength,annotation_name,fileInput,regions) {
        // ! this saves also the response of the AI, maybe we should change this ?
        let data = JSON.stringify(
            Object.keys(regions).map(function (id) {
                var region = regions[id];
                return {
                    duration: audioLength,
                    file: fileInput.files[0].name,
                    start: region.start,
                    end: region.end,
                    content: region.content.outerText
                };
            })
        );
        fetch("/annotation/" + annotation_name, {
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




