//import csv from 'csv-parser';


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


