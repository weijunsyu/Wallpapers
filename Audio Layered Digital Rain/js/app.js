/*
MIT License

Copyright (c) 2022 WeiJun Syu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const canvas = document.getElementById("waterfall");
const context = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const katakana = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン";
const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nums = "0123456789";
const defaultAlphabet = katakana + latin + nums;

const AUDIO_ARRAY_LENGTH = 128;
const AUDIO_CHANNEL_LENGTH = 64;
const AUDIO_LEFT_START_INDEX = 0; // ending index at 63
const AUDIO_RIGHT_START_INDEX = 64; // ending index at 127

function Droplet(text, colour, alpha) {
    this.text = text; // character to be displayed
    this.colour = colour; // colour of the text give as: [r, g, b]
    this.alpha = alpha; // current alpha value of the text colour
}

function AudioColumn() {
    this.colArray = []; // array of all Droplets in this column 
    this.dropIndex = 0;
    
    this.reset = function() {
        this.colArray.length = 0;
        this.dropIndex = 0;
    }
}

function Waterfall(alphaOffset, fontStyle, audioColour, dropColour, numCol) {
    this.alphaOffset = alphaOffset;
    this.fontStyle = fontStyle;
    this.audioColour = audioColour; //[r, g, b]
    this.dropColour = dropColour; //[r, g, b]
    this.numCol = numCol;

    this.columnList = []; // list of all AudioColumns (length == numCols)
    this.fontSize = Math.ceil(canvas.width/this.numCol);
    this.numRow = Math.ceil(canvas.height/this.fontSize);
    init(this.columnList, this.numCol, this.numRow);

    this.reset = function(newNumCol) {
        this.columnList.length = 0;
        this.numCol = newNumCol;
        this.fontSize = Math.ceil(canvas.width/this.numCol);
        this.numRow = Math.ceil(canvas.height/this.fontSize);
        init(this.columnList, this.numCol, this.numRow);
    }

    function init(columnList, numCol, numRow) {
        for (let i = 0; i < numCol; i++) {
            columnList[i] = new AudioColumn();
            let colArray = columnList[i].colArray;
            for (let j = 0; j < numRow; j++) {
                colArray[j] = new Droplet(NaN, [0, 0, 0], 0);
            }
        }
    }
}

function factorAudio(audioValue, factor) {
    return Math.round(audioValue * factor);
}

function getRelativeAudioValue(colIndex, numCol, audioArray) {
    let length = Math.floor(AUDIO_ARRAY_LENGTH / numCol);
    let start = colIndex * length;
    return getAudioValue(audioArray, start, length);
}

function getAudioValue(audioArray, start, length) {
    let audioValue = 0;
    for (let i = start; i < (length + start); i++) {
        // make sure index in bounds of audioArray
        if (i >= AUDIO_ARRAY_LENGTH) {
            // break out if not (faster as we stop early)
            break;
        }
        audioValue += audioArray[i];
    }
    return Math.min(audioValue / length, 1);
}

// Take rgba values and convert them to its string representation
function rgbArrayToString(rgb, a = 1) {
    return "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", " + a + ")";
}

// Blanks out the screen
function blank() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

// Update the alpha values in the screenArray so the waterfall droplets "fade"
function updateAlpha(columnList, numCol, numRow, alphaOffset) {
    for (let i = 0; i < numCol; i++) {
        let colArray = columnList[i].colArray;
        for (let j = 0; j < numRow; j++) {
            colArray[j].alpha = Math.max((colArray[j].alpha - alphaOffset), 0);
        }
    }
}

// Update each AudioColumn with the new text given the audioArray
function updateText(columnList, fontSize, audioColour, dropColour, numCol, numRow, alphabet, audioArray) {
    // Loop over each AudioColumn
    for (let i = 0; i < numCol; i++) {
        let colArray = columnList[i].colArray;
        let dropIndex = columnList[i].dropIndex;
        let rawAudioValue = getRelativeAudioValue(i, numCol, audioArray);
        let audioValue = factorAudio(rawAudioValue, numRow);

        // Fill up row from the top down up to the audioValue with full brightness text
        for (let j = 0; j < audioValue; j++) {
            let text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            if (!colArray[j]) {
                colArray[j] = new Droplet(text, audioColour, 1);
            }
            else {
                colArray[j].text = text;
                colArray[j].colour = audioColour;
                colArray[j].alpha = 1;
            }
        }
        // if dropIndex is larger than the ending index of full brightness text
        if (dropIndex > audioValue - 1) {
            let text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            if (!colArray[dropIndex]) {
                colArray[dropIndex] = new Droplet(text, dropColour, 1);
            }
            else {
                colArray[dropIndex].text = text;
                colArray[dropIndex].colour = dropColour;
                colArray[dropIndex].alpha = 1;
            }
            // If the wave front is below the screen or if the wave front is on standby or if audio is off
            if (dropIndex > numRow || dropIndex < 0) {
                columnList[i].dropIndex = -1;
                colArray[dropIndex].text = NaN; // NaN is used as a flag
            }
            else {
                columnList[i].dropIndex++;
            }
        }
        else { // if drop index is smaller than the ending index
            // set the dropIndex to the current audioValue
            // this is the bottom of the current wave front
            // spawn waterfall from this point if the next audioValue is less than current
            columnList[i].dropIndex = audioValue;
            // If audio is off then stop spawning new droplets
            if (audioValue <= 0) {
                columnList[i].dropIndex = -1;
            }
        }
    }
}

// Draw the contents of columnList onto the screen
function draw(columnList, fontSize, fontStyle, numCol, numRow) {
    context.font = fontSize + "px " + fontStyle; // Set the font
    for (let i = 0; i < numCol; i++) {
        let colArray = columnList[i].colArray;
        for (let j = 0; j < numRow; j++) {
            let text = colArray[j].text;
            if (text !== NaN) { // NaN was the flag for "not drawn" given in updateText function
                let colourStr = rgbArrayToString(colArray[j].colour, colArray[j].alpha);
                context.fillStyle = colourStr;
                context.fillText(text, i * fontSize, (j + 1) * fontSize); // (j + 1) since top row is 0 in our data structure
            }
        }
    }
}

// Update the waterfall object such that alpha and text are updated and then draw to screen
function updateWaterfall(waterfall, alphabet, audioArray) {    
    let columnList = waterfall.columnList;
    let alphaOffset = waterfall.alphaOffset;
    let fontSize = waterfall.fontSize;
    let fontStyle = waterfall.fontStyle;
    let audioColour = waterfall.audioColour;
    let dropColour = waterfall.dropColour;
    let numCol = waterfall.numCol;
    let numRow = waterfall.numRow;

    updateAlpha(columnList, numCol, numRow, alphaOffset);
    updateText(columnList, fontSize, audioColour, dropColour, numCol, numRow, alphabet, audioArray);
    draw(columnList, fontSize, fontStyle, numCol, numRow);
}

// Update each waterfall within the waterfalls list
function updateWaterfalls(waterfalls, numFalls, alphabet, audioArray) {
    blank();
    for (let i = 0; i < numFalls; i++) {
        updateWaterfall(waterfalls[i], alphabet, audioArray);
    }
}


// Declare global variables
g_alphabet = defaultAlphabet;
g_numwaterfalls = 3;
g_waterfalls = [];

// Functions relying on global variables
// Initialize the waterfalls
function init(maxNumWaterfalls) {
    let alphas = [0.05, 0.05, 0.05];
    let fonts = ["monospace", "monospace", "monospace"];
    let audioColours = [[255, 0, 0], [255, 0, 0], [255, 0, 0]];
    let dropColours = [[255, 255, 255], [255, 255, 255], [255, 255, 255]];
    let columns = [64, 32, 16];
    
    for(let i = 0; i < maxNumWaterfalls; i++) {
        g_waterfalls.push(new Waterfall(alphas[i], fonts[i], audioColours[i], dropColours[i], columns[i]));
    }
}

init(g_numwaterfalls);

// Event listener for wallpaper engine audio listener
function wallpaperAudioListener(audioArray) {
    updateWaterfalls(g_waterfalls, g_numwaterfalls, g_alphabet, audioArray);
}

// Register the audio listener
window.wallpaperRegisterAudioListener(wallpaperAudioListener);

// Event listener for wallpaper engine user properties
window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {
        if (properties.backgroundcolour) {
            let backgroundColour = properties.backgroundcolour.value.split(" ");
            backgroundColour = backgroundColour.map(c => Math.ceil(c * 255));
            canvas.style.backgroundColor = "rgb(" + backgroundColour + ")";
        }
        if (properties.customalphabet) {
            let newAlphabet = properties.customalphabet.value.replace(/\s/g,'');
            if (newAlphabet) {
                g_alphabet = newAlphabet;
            }
            else {
                g_alphabet = defaultAlphabet;
            }
        }
        if (properties.numwaterfalls) {
            g_numwaterfalls = properties.numwaterfalls.value;
        }
        // Waterfall 1
        if (properties.alpha1) {
            g_waterfalls[0].alphaOffset = properties.alpha1.value;
        }
        if (properties.font1) {
            g_waterfalls[0].fontStyle = properties.font1.value;
        }
        if (properties.audiocolour1) {
            let colour = properties.audiocolour1.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[0].audioColour = colour;
        }
        if (properties.dropcolour1) {
            let colour = properties.dropcolour1.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[0].dropColour = colour;
        }
        if (properties.cols1) {
            g_waterfalls[0].reset(properties.cols1.value);
        }
        // Waterfall 2
        if (properties.alpha2) {
            g_waterfalls[1].alphaOffset = properties.alpha2.value;
        }
        if (properties.font2) {
            g_waterfalls[1].fontStyle = properties.font2.value;
        }
        if (properties.audiocolour2) {
            let colour = properties.audiocolour2.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[1].audioColour = colour;
        }
        if (properties.dropcolour2) {
            let colour = properties.dropcolour2.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[1].dropColour = colour;
        }
        if (properties.cols2) {
            g_waterfalls[1].reset(properties.cols2.value);
        }
        // Waterfall 3
        if (properties.alpha3) {
            g_waterfalls[2].alphaOffset = properties.alpha3.value;
        }
        if (properties.font3) {
            g_waterfalls[2].fontStyle = properties.font3.value;
        }
        if (properties.audiocolour3) {
            let colour = properties.audiocolour3.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[2].audioColour = colour;
        }
        if (properties.dropcolour3) {
            let colour = properties.dropcolour3.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[2].dropColour = colour;
        }
        if (properties.cols3) {
            g_waterfalls[2].reset(properties.cols3.value);
        }
    }
};
