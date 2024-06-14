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


//-------------------------------------------------------------------------------------------------------------------
//Color Map Utils

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
export function reloadSpectrogram(wavesurfer,redSlider,greenSlider,blueSlider,alphaSlider){
    //Reloads Spectrogram with current slider values
    wavesurfer.plugins.forEach(plugin => {
        if(plugin.hasOwnProperty("spectrCc")){
            plugin.colorMap = generateColorMap(redSlider.value,greenSlider.value,blueSlider.value,alphaSlider.value),
            plugin.render()
        };
    });

}