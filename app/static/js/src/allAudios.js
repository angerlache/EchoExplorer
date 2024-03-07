// !!!! not finished at all !!!!

document.addEventListener('DOMContentLoaded', function () {
    // Initialize Wavesurfer once the DOM is ready
    var wavesurfer = WaveSurfer.create({
        container: '#waveform-container',
        progressColor: '#2ecc71',
        waveColor: '#3498db',
    });

    // Function to load waveform
    window.loadWaveform = function(filename) {
        //wavesurfer.load('/uploads/' + filename);
        fetch('/uploads/' + filename)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                // Load audio file
                //wavesurfer.loadBlob(new Blob([arrayBuffer]));
                console.log(arrayBuffer)
            })
            .catch(error => console.error('Error loading waveform:', error));
    };
});