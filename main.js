
// Initialize an audio context

document.addEventListener("DOMContentLoaded", function(event) {

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var wave_type;
    var mode;
    var squares = [];
    const clearButton = document.querySelector('button');

    // Generating squares
    // SOURCE: https://www.codeguage.com/courses/js/cssom-colored-squares-exercise
    // USED PARTS OF THEIR CODE to generate random integer, color, and square 
    // (randomInt, randomColor, getSquare)

    function randomInt(start, end) {
        return start + Math.floor(Math.random() * (end - start + 1))
    }

    function randomColor() {
        // SOURCE: https://www.geeksforgeeks.org/how-to-get-value-of-selected-radio-button-using-javascript/
        var color_opt = document.getElementsByName("color");
        for (i = 0; i < color_opt.length; i++) {
            if (color_opt[i].checked)
                color_type = color_opt[i].value;
        }
        if(color_type=="random") {
            return `rgb(${randomInt(0, 255)}, ${randomInt(0, 255)}, ${randomInt(0, 255)})`;
        }
        else if(color_type=="gray") {
            num = randomInt(0, 255);
            return `rgb(${num}, ${num}, ${num})`;
        }
        else if(color_type=="pastel") {
            return `rgb(${randomInt(210, 255)}, ${randomInt(210, 255)}, ${randomInt(210, 255)})`;
        }    
    }

    
    function getSquare() {
        var divElement = document.createElement('div');
        divElement.className = 'square';
     
        var width = randomInt(50, 100);
        divElement.style.width = divElement.style.height = width + 'px';
     
        divElement.style.backgroundColor = randomColor();
     
        // Keeps square within height and with of screen with a small border
        divElement.style.left = randomInt(0 , innerWidth - width ) + 'px';
        divElement.style.top = randomInt(0 , innerHeight - width ) + 'px';
        squares[squares.length] = divElement;
        return divElement;
    }

    clearButton.addEventListener('click', function () {
        while (squares.length != 0) {
            curSquare = squares.pop();
            curSquare.remove();
        }
    }, false);
    

    const keyboardFrequencyMap = {
        '90': 261.625565300598634,  //Z - C
        '83': 277.182630976872096, //S - C#
        '88': 293.664767917407560,  //X - D
        '68': 311.126983722080910, //D - D#
        '67': 329.627556912869929,  //C - E
        '86': 349.228231433003884,  //V - F
        '71': 369.994422711634398, //G - F#
        '66': 391.995435981749294,  //B - G
        '72': 415.304697579945138, //H - G#
        '78': 440.000000000000000,  //N - A
        '74': 466.163761518089916, //J - A#
        '77': 493.883301256124111,  //M - B
        '81': 523.251130601197269,  //Q - C
        '50': 554.365261953744192, //2 - C#
        '87': 587.329535834815120,  //W - D
        '51': 622.253967444161821, //3 - D#
        '69': 659.255113825739859,  //E - E
        '82': 698.456462866007768,  //R - F
        '53': 739.988845423268797, //5 - F#
        '84': 783.990871963498588,  //T - G
        '54': 830.609395159890277, //6 - G#
        '89': 880.000000000000000,  //Y - A
        '55': 932.327523036179832, //7 - A#
        '85': 987.766602512248223,  //U - B
    }

    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);
    
    activeOscillators = {}
    activeGains = {}
    
    function keyDown(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
            var mode_opt = document.getElementsByName("mode");
            for (i = 0; i < mode_opt.length; i++) {
                if (mode_opt[i].checked)
                    mode = mode_opt[i].value;
            }
            if (mode == "normal") {
                normal(key);
                draw();
            }
            else if (mode == "additive") {
                additive(key);
                draw();
            }
            else if (mode == "am") {
                am(key);
                draw();
            }
            else if (mode == "fm") {
                fm(key);
                draw();
            }
        }
    }
    
    function keyUp(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeOscillators[key]) {
        
            gainNode = activeGains[key];
            // SOURCE: https://www.leafwindow.com/en/digital-piano-with-web-audio-api-5-en/
            gainNode.gain.cancelScheduledValues(audioCtx.currentTime); // In case key lifted quickly before ADS
            gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime); // Bc need previous event
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + .1); // Release
            gainNode.gain.setValueAtTime(0., audioCtx.currentTime + .15); 

           
            partials = activeOscillators[key]
            for(i in partials) {
                partials[i].stop(audioCtx.currentTime + .2)
            }

            delete activeOscillators[key];
            delete activeGains[key];
        }
    }
    
    function get_wave_type () {
        var wave_opt = document.getElementsByName("wave");
        for (i = 0; i < wave_opt.length; i++) {
            if (wave_opt[i].checked)
                wave_type = wave_opt[i].value;
        }
        return wave_type
    }

    const globalGain = audioCtx.createGain(); // This will control the volume of all notes
    globalGain.gain.setValueAtTime(0.8, audioCtx.currentTime)
    globalGain.connect(audioCtx.destination);

    globalAnalyser = audioCtx.createAnalyser();
    globalGain.connect(globalAnalyser);

    function normal (key) {
        const osc = audioCtx.createOscillator();
        osc.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);
        osc.type = get_wave_type(); 

        numNotes = Object.keys(activeGains).length + 1
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.75 / numNotes, audioCtx.currentTime + 0.1); // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.5 / numNotes, audioCtx.currentTime + 0.2);  // Decay, Sustain
        Object.keys(activeGains).forEach(function(key) {
            var curGainNode = activeGains[key];
            curGainNode.gain.setTargetAtTime(0.5 / numNotes, audioCtx.currentTime + 0.2, 0.2);
        });

        osc.connect(gainNode).connect(globalGain) ;
        osc.start();
        document.body.appendChild(getSquare()); 
        activeOscillators[key] = [osc]
        activeGains[key] = gainNode
    }

    function additive (key) {
        var num_partials = document.getElementsByName("numPartials")[0].value;
        partial_frqs = []
        for(i = 1; i < (num_partials * 2); i = i + 2) {
            const osc_i = audioCtx.createOscillator();
            osc_i.frequency.value = (i * keyboardFrequencyMap[key]) - (Math.random() * 5);
            osc_i.type = wave_type;
            partial_frqs.push(osc_i);
        }

        gainVal = 0.75 / num_partials
        numNotes = Object.keys(activeGains).length + 1
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(gainVal / numNotes, audioCtx.currentTime + 0.1); // Attack
        gainNode.gain.exponentialRampToValueAtTime((gainVal - 0.05) / numNotes, audioCtx.currentTime + 0.2);  // Decay, Sustain
        Object.keys(activeGains).forEach(function(key) {
            var curGainNode = activeGains[key];
            curGainNode.gain.setTargetAtTime(0.5 / numNotes, audioCtx.currentTime + 0.2, 0.2);
        });

        for (i in partial_frqs) {
            partial_frqs[i].connect(gainNode);
        }
        gainNode.connect(globalGain);
        for (i in partial_frqs) {
            partial_frqs[i].start()
        }

        var lfo = audioCtx.createOscillator();
        lfo.frequency.value = document.getElementsByName("LFO")[0].value;
        lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 5.;
        partial_frqs.push(lfo)
        lfo.connect(lfoGain).connect(partial_frqs[0].frequency);
        lfo.start(); 

        document.body.appendChild(getSquare()); 
        activeOscillators[key] = partial_frqs
        activeGains[key] = gainNode
    }

    function am(key) {
        var carrier = audioCtx.createOscillator();
        carrier.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);
        var modulatorFreq = audioCtx.createOscillator();
        modulatorFreq.frequency.value = document.getElementsByName("AM_Mod")[0].value;

        carrier.type = get_wave_type(); 
        modulatorFreq.type = get_wave_type();
    
        const modulated = audioCtx.createGain();
        const depth = audioCtx.createGain();
        depth.gain.value = 0.5 
        modulated.gain.value = 1.0 - depth.gain.value; 
        modulatorFreq.connect(depth).connect(modulated.gain); 
        carrier.connect(modulated)

        numNotes = Object.keys(activeGains).length + 1
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.75 / numNotes, audioCtx.currentTime + 0.1); // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.5 / numNotes, audioCtx.currentTime + 0.2);  // Decay, Sustain
        Object.keys(activeGains).forEach(function(key) {
            var curGainNode = activeGains[key];
            curGainNode.gain.setTargetAtTime(0.5 / numNotes, audioCtx.currentTime + 0.2, 0.2);
        });
        modulated.connect(gainNode).connect(globalGain);

        carrier.start();
        modulatorFreq.start();
        document.body.appendChild(getSquare()); 
        activeOscillators[key] = [carrier, modulatorFreq]
        activeGains[key] = gainNode
    }

    function fm(key) {
        var carrier = audioCtx.createOscillator();
        carrier.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);
        var modulatorFreq = audioCtx.createOscillator();
        modulatorFreq.frequency.value = document.getElementsByName("FM_Mod")[0].value;

        carrier.type = get_wave_type(); 
        modulatorFreq.type = get_wave_type();

        modulationIndex = audioCtx.createGain();
        modulationIndex.gain.value = document.getElementsByName("Mod_Index")[0].value;

        modulatorFreq.connect(modulationIndex);
        modulationIndex.connect(carrier.frequency)
        
        numNotes = Object.keys(activeGains).length + 1
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.5 / numNotes, audioCtx.currentTime + 0.1); // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.3 / numNotes, audioCtx.currentTime + 0.2);  // Decay, Sustain
        Object.keys(activeGains).forEach(function(key) {
            var curGainNode = activeGains[key];
            curGainNode.gain.setTargetAtTime(0.5 / numNotes, audioCtx.currentTime, 0.2);
        });
        carrier.connect(gainNode).connect(globalGain);

        carrier.start();
        modulatorFreq.start();
        document.body.appendChild(getSquare()); 
        activeOscillators[key] = [carrier, modulatorFreq]
        activeGains[key] = gainNode
    }

    // SOURCE: https://www.marksantolucito.com/COMS3430/fall2023/wave_logger/
    function draw() {
        globalAnalyser.fftSize = 2048;
        var bufferLength = globalAnalyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        globalAnalyser.getByteTimeDomainData(dataArray);
    
        var canvas = document.querySelector("#globalVisualizer");
        var canvasCtx = canvas.getContext("2d");
    
        requestAnimationFrame(draw);
    
        globalAnalyser.getByteTimeDomainData(dataArray);
    
        canvasCtx.fillStyle = "white";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "rgb(0, 0, 0)";
    
        canvasCtx.beginPath();
    
        var sliceWidth = canvas.width * 1.0 / bufferLength;
        var x = 0;
    
        for (var i = 0; i < bufferLength; i++) {
            var v = dataArray[i] / 128.0;
            var y = v * canvas.height / 2;
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }
    
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }


 
      
} ); 
