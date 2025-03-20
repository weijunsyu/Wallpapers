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
const symbols = "!@#$%^&*()_+-=<>[]{}|/,.?;:";

const defaultDelay = 50;
const defaultFont = "monospace";
const defaultAlphabet = katakana + latin + nums + symbols;

const defaultAlphas = [0.05, 0.05, 0.05, 0.05];
const defaultDrops = [0.025, 0.025, 0.025, 0.025];
const defaultSizes = [22, 33, 44, 55];
const defaultFonts = [defaultFont, defaultFont, defaultFont, defaultFont];
const defaultAphabets = [defaultAlphabet, defaultAlphabet, defaultAlphabet, defaultAlphabet];
const defaultColours = [[255, 255, 255], [255, 255, 255], [255, 255, 255], [255, 255, 255]];



function Droplet(text, colour, alpha) {
    this.text = text; // character to be displayed
    this.colour = colour; // colour of the text give as: [r, g, b]
    this.alpha = alpha; // current alpha value of the text colour
}

function Waterfall(alphaOffset, dropChance, fontSize, fontStyle, alphabet, textColour) {
    this.alphaOffset = alphaOffset; // amount of transparency added per waveFront increment
    this.dropChance = dropChance; // chance (between 0 - 1) of a droplet spawning at top of waterfall
    this.fontSize = fontSize; // determines the size of the "grid" of screenArray
    this.fontStyle = fontStyle;
    this.alphabet = alphabet;
    this.textColour = textColour; // default colour of the text give as: [r, g, b]

    this.screenArray = []; // flattened matrix of all Droplets
    this.waveFront = []; // position array of the wavefront (waterfall leading edge)
    this.numCol = Math.ceil(canvas.width/this.fontSize);
    this.numRow = Math.ceil(canvas.height/this.fontSize);
    initWaveFront(this.waveFront, this.numCol);

    this.reset = function(newFontSize) {
        this.screenArray.length = 0;
        this.waveFront = [];
        this.fontSize = newFontSize;
        this.numCol = Math.ceil(canvas.width/this.fontSize);
        this.numRow = Math.ceil(canvas.height/this.fontSize);
        initWaveFront(this.waveFront, this.numCol);
    }

    // Initialize the waveFront array (so that we have a fixed length property)
    function initWaveFront(waveFront, numCol) {
        for (let i = 0; i < numCol; i++) {
            waveFront[i] = 0;
        }
    }
}


// Build simple alphabet string and return result
function buildSimpleAlphabet(useKatakana, useLatin, useNumbers, useSymbols) {
    let newAlphabet = "";
    if (useKatakana) {
        newAlphabet += katakana;
    }
    if (useLatin) {
        newAlphabet += latin;
    }
    if (useNumbers) {
        newAlphabet += nums;
    }
    if (useSymbols) {
        newAlphabet += symbols;
    }
    return newAlphabet;
}

// Take rgba values and convert them to its string representation
function rgbaToString(rgb, a) {
    return "rgba(" + rgb + ", " + a + ")";
}

// Return the column and row given the flattened array [matrix] index and number of columns in matrix
function getColRow(index, numCol) {
    let col = index % numCol;
    let row = Math.floor(index / numCol);
    return [col, row];
}

// Return the index into a flattened array [matrix] given the column, row, and number of columns in matrix
function getIndex(col, row, numCol) {
    let index = (row * numCol) + col;
    return index;
}

// Blanks out the screen
function blank() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

// Update the alpha values in the screenArray so the waterfall droplets "fade"
function updateAlpha(screenArray, alphaOffset) {
    for (let i = 0, lenScreen = screenArray.length; i < lenScreen; i++) {
        screenArray[i].alpha = Math.max((screenArray[i].alpha - alphaOffset), 0);
    }
}

// Update the screenArray with the new text given the waveFront
function updateText(screenArray, waveFront, dropChance, fontSize, textColour, numCol, numRow, alphabet) {
    // lenWave gets the length of waveFront up-front since length of waveFront is static
    for (let i = 0, lenWave = waveFront.length; i < lenWave; i++) {
        let text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        let index = getIndex(i, waveFront[i], numCol);
        if (!screenArray[index]) {
            screenArray[index] = new Droplet(text, textColour, 1);
        }
        else {
            screenArray[index].text = text;
            screenArray[index].colour = textColour;
            screenArray[index].alpha = 1;
        }

        // If waveFront is below the screen or if waveFront on standby
        if (waveFront[i] > numRow || waveFront[i] < 0) {
            waveFront[i] = -1; // Set waveFront to standbay (less than 0)
            // If waveFront is NOT to be dropped
            if (Math.random() > dropChance) { // rand number is outside dropChance
                // Set the text to (flag) indicate that it should NOT be drawn
                screenArray[index].text = NaN; // NaN is used as a flag
            }
            else { // If wavefront IS to be dropped:
                // Set the wavefront to be on ready (not standby). Set to top of screen (0)
                // since if here it is either, below screen thus need to be at the top again
                // or its been in standby which can only occur after it has fallen below the screen
                waveFront[i] = 0;
            }
        }
        else { // if wavefront is not on standby/not below screen
            waveFront[i]++; // move waveFront down one row
        }
    }
}

// Draw the contents of screenArray onto the screen
function draw(screenArray, fontSize, fontStyle, numCol) {
    context.font = fontSize + "px " + fontStyle; // Set the font

    for (let i = 0, lenScreen = screenArray.length; i < lenScreen; i++) {
        let [col, row] = getColRow(i, numCol);
        let text = screenArray[i].text;
        if (text !== NaN) { // NaN was the flag for "not drawn" given in updateText function
            context.fillStyle = rgbaToString(screenArray[i].colour, screenArray[i].alpha);
             // Draw to screen
            context.fillText(text, col*fontSize, (row + 1)*fontSize); // (row + 1) since top row is 0 in our data structure
        }
    }
}

// Update the waterfall object such that alpha and text are updated and then draw to screen
function updateWaterfall(waterfall) {
    let screenArray = waterfall.screenArray;
    let waveFront = waterfall.waveFront;
    let alphaOffset = waterfall.alphaOffset;
    let dropChance = waterfall.dropChance;
    let fontSize = waterfall.fontSize;
    let fontStyle = waterfall.fontStyle;
    let alphabet = waterfall.alphabet;
    let textColour = waterfall.textColour;
    let numCol = waterfall.numCol;
    let numRow = waterfall.numRow;

    updateAlpha(screenArray, alphaOffset);
    updateText(screenArray, waveFront, dropChance, fontSize, textColour, numCol, numRow, alphabet);
    draw(screenArray, fontSize, fontStyle, numCol);
}

// Update each waterfall within the waterfalls list
function updateWaterfalls(waterfalls, numFalls) {
    blank();

    for (let i = 0; i < numFalls; i++) {
        updateWaterfall(waterfalls[i]);
    }
}

// Modify property of waterfall in waterfalls list
function modifyWaterfalls(waterfalls, numFalls, fontStyle, alphabet) {
    for (let i = 0; i < numFalls; i++) {
        if (fontStyle !== null) {
            waterfalls[i].fontStyle = fontStyle;
        }
        if (alphabet !== null) {
            waterfalls[i].alphabet = alphabet;
        }
    }
}


// Declare wallpaper engine specific constants. May have dependencies to values declared in the 'project.json' file.
const numDefinedWaterfalls = 4; // Dependancy: 'max' value set in the 'numwaterfalls' property

// Declare global variables
g_numwaterfalls = numDefinedWaterfalls;
g_intervalId = null;
g_delay = defaultDelay;
g_waterfalls = [];
// Global variables and flags for Wallpaper Engine user properties
g_userSeperateFont = false;
g_userSeperateAlphabet = false;
g_userSimpleAlphabet = true;
g_userKatagana = true;
g_userLatin = true;
g_userNumbers = true;
g_userSymbols = true;
g_userFont = defaultFont;
g_userFont1 = defaultFont;
g_userFont2 = defaultFont;
g_userFont3 = defaultFont;
g_userFont4 = defaultFont;
g_userAlphabet = defaultAlphabet;
g_userCustomAlphabet = defaultAlphabet;
g_userAlphabet1 = defaultAlphabet;
g_userAlphabet2 = defaultAlphabet;
g_userAlphabet3 = defaultAlphabet;
g_userAlphabet4 = defaultAlphabet;

// Functions relying on global variables
function updateOnce() {
    // This function is required for Wallpaper Engine because the following syntax does NOT work: setInterval(func, delay, arg1, arg2, /* …, */ argN)
    updateWaterfalls(g_waterfalls, g_numwaterfalls);
}

function stop() {
    if (g_intervalId !== null) {
        clearInterval(g_intervalId);
        g_intervalId = null;
    }
}

function restart() {
    stop();
    
    // start
    blank();
    if (g_intervalId === null) {
        g_intervalId = setInterval(updateOnce, g_delay); // Required to use wrapper function 'updateOnce' due to limitations in Wallpaper Engine
    }
}

function init() {
    let alphas = defaultAlphas;
    let drops = defaultDrops;
    let sizes = defaultSizes;
    let fonts = defaultFont;
    let aphabets = defaultAphabets;
    let colours = defaultColours;
    
    for (let i = 0; i < numDefinedWaterfalls; i++) {
        g_waterfalls.push(new Waterfall(alphas[i], drops[i], sizes[i], fonts[i], aphabets[i], colours[i]));
    }
}

init();

// Event Listener for wallpaper engine user properties
window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {
        if (properties.backgroundcolour) {
            let backgroundColour = properties.backgroundcolour.value.split(" ");
            backgroundColour = backgroundColour.map(c => Math.ceil(c * 255));
            canvas.style.backgroundColor = "rgb(" + backgroundColour + ")";
        }
        if (properties.backgroundimage) {
            let image = "file:///" + properties.backgroundimage.value;
            canvas.style.backgroundImage = "url('" + image + "')";
        }
        if (properties.containimage) {
            let contain = properties.containimage.value;
            if (contain) {
                canvas.style.backgroundSize = "contain";
            }
            else {
                canvas.style.backgroundSize = "cover";
            }
        }
        if (properties.repeatimage) {
            let repeat = properties.repeatimage.value;
            if (repeat) {
                canvas.style.backgroundRepeat = "repeat";
            }
            else {
                canvas.style.backgroundRepeat = "no-repeat";
            }
        }
        if (properties.imageposition) {
            let positionStr = properties.imageposition.value;
            canvas.style.backgroundPosition = positionStr;
        }
        if (properties.useseperatefont) {
            g_userSeperateFont = properties.useseperatefont.value;
            if (g_userSeperateFont === true) {
                g_waterfalls[0].fontStyle = g_userFont1;
                g_waterfalls[1].fontStyle = g_userFont2;
                g_waterfalls[2].fontStyle = g_userFont3;
                g_waterfalls[3].fontStyle = g_userFont4;
            }
            else {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, g_userFont, null);
            }
        }
        if (properties.useseperatealphabet) {
            g_userSeperateAlphabet = properties.useseperatealphabet.value;
            if (g_userSeperateAlphabet === true) {
                g_waterfalls[0].alphabet = g_userAlphabet1;
                g_waterfalls[1].alphabet = g_userAlphabet2;
                g_waterfalls[2].alphabet = g_userAlphabet3;
                g_waterfalls[3].alphabet = g_userAlphabet4;
            }
            else if (g_userSimpleAlphabet === true) {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, null, g_userAlphabet);
            }
            else {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, null, g_userCustomAlphabet);
            }
        }
        if (properties.usesimplealphabet) {
            g_userSimpleAlphabet = properties.usesimplealphabet.value;
            if (g_userSimpleAlphabet === true) {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, null, g_userAlphabet);
            }
            else if (g_userSeperateAlphabet === true) {
                g_waterfalls[0].alphabet = g_userAlphabet1;
                g_waterfalls[1].alphabet = g_userAlphabet2;
                g_waterfalls[2].alphabet = g_userAlphabet3;
                g_waterfalls[3].alphabet = g_userAlphabet4;
            }
            else {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, null, g_userCustomAlphabet);
            }
        }
        if (properties.delay) {
            g_delay = properties.delay.value;
            restart();
        }
        if (properties.font) {
            let newFont = properties.font.value.trim();
            if (newFont) {
                g_userFont = newFont;
            }
            else {
                g_userFont = defaultFont;
            }
            if (g_userSeperateFont === false) {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, g_userFont, null);
            }
        }
        if (properties.haskatagana) {
            g_userKatagana = properties.haskatagana.value;
            g_userAlphabet = buildSimpleAlphabet(g_userKatagana, g_userLatin, g_userNumbers, g_userSymbols);
            if (g_userSeperateAlphabet === false && g_userSimpleAlphabet === true) {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, null, g_userAlphabet);
            }
        }
        if (properties.haslatin) {
            g_userLatin = properties.haslatin.value;
            g_userAlphabet = buildSimpleAlphabet(g_userKatagana, g_userLatin, g_userNumbers, g_userSymbols);
            if (g_userSeperateAlphabet === false && g_userSimpleAlphabet === true) {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, null, g_userAlphabet);
            }
        }
        if (properties.hasnumbers) {
            g_userNumbers = properties.hasnumbers.value;
            g_userAlphabet = buildSimpleAlphabet(g_userKatagana, g_userLatin, g_userNumbers, g_userSymbols);
            if (g_userSeperateAlphabet === false && g_userSimpleAlphabet === true) {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, null, g_userAlphabet);
            }
        }
        if (properties.hassymbols) {
            g_userSymbols = properties.hassymbols.value;
            g_userAlphabet = buildSimpleAlphabet(g_userKatagana, g_userLatin, g_userNumbers, g_userSymbols);
            if (g_userSeperateAlphabet === false && g_userSimpleAlphabet === true) {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, null, g_userAlphabet);
            }
        }
        if (properties.customalphabet) {
            let newAlphabet = properties.customalphabet.value.replace(/\s/g,'');
            if (newAlphabet) {
                g_userCustomAlphabet = newAlphabet;
            }
            else {
                g_userCustomAlphabet = defaultAlphabet;
            }
            if (g_userSeperateAlphabet === false && g_userSimpleAlphabet === false) {
                modifyWaterfalls(g_waterfalls, numDefinedWaterfalls, null, g_userCustomAlphabet);
            }
        }
        if (properties.numwaterfalls) {
            g_numwaterfalls = properties.numwaterfalls.value;
        }
        // Waterfall 1
        if (properties.alpha1) {
            g_waterfalls[0].alphaOffset = properties.alpha1.value;
        }
        if (properties.drop1) {
            g_waterfalls[0].dropChance = properties.drop1.value;
        }
        if (properties.size1) {
            g_waterfalls[0].reset(properties.size1.value);
        }
        if (properties.font1) {
            let newFont = properties.font1.value.trim();
            if (newFont) {
                g_userFont1 = newFont;
            }
            else {
                g_userFont1 = defaultFont;
            }
            if (g_userSeperateFont === true) {
                g_waterfalls[0].fontStyle = g_userFont1;
            }
        }
        if (properties.alphabet1) {
            let newAlphabet = properties.alphabet1.value.replace(/\s/g,'');
            if (newAlphabet) {
                g_userAlphabet1 = newAlphabet;
            }
            else {
                g_userAlphabet1 = defaultAlphabet;
            }
            if (g_userSeperateAlphabet === true) {
                g_waterfalls[0].alphabet = g_userAlphabet1;
            }
        }
        if (properties.colour1) {
            let colour = properties.colour1.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[0].textColour = colour;
        }
        // Waterfall 2
        if (properties.alpha2) {
            g_waterfalls[1].alphaOffset = properties.alpha2.value;
        }
        if (properties.drop2) {
            g_waterfalls[1].dropChance = properties.drop2.value;
        }
        if (properties.size2) {
            g_waterfalls[1].reset(properties.size2.value);
        }
        if (properties.font2) {
            let newFont = properties.font2.value.trim();
            if (newFont) {
                g_userFont2 = newFont;
            }
            else {
                g_userFont2 = defaultFont;
            }
            if (g_userSeperateFont === true) {
                g_waterfalls[1].fontStyle = g_userFont2;
            }
        }
        if (properties.alphabet2) {
            let newAlphabet = properties.alphabet2.value.replace(/\s/g,'');
            if (newAlphabet) {
                g_userAlphabet2 = newAlphabet;
            }
            else {
                g_userAlphabet2 = defaultAlphabet;
            }
            if (g_userSeperateAlphabet === true) {
                g_waterfalls[1].alphabet = g_userAlphabet2;
            }
        }
        if (properties.colour2) {
            let colour = properties.colour2.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[1].textColour = colour;
        }
        // Waterfall 3
        if (properties.alpha3) {
            g_waterfalls[2].alphaOffset = properties.alpha3.value;
        }
        if (properties.drop3) {
            g_waterfalls[2].dropChance = properties.drop3.value;
        }
        if (properties.size3) {
            g_waterfalls[2].reset(properties.size3.value);
        }
        if (properties.font3) {
            let newFont = properties.font3.value.trim();
            if (newFont) {
                g_userFont3 = newFont;
            }
            else {
                g_userFont3 = defaultFont;
            }
            if (g_userSeperateFont === true) {
                g_waterfalls[2].fontStyle = g_userFont3;
            }
        }
        if (properties.alphabet3) {
            let newAlphabet = properties.alphabet3.value.replace(/\s/g,'');
            if (newAlphabet) {
                g_userAlphabet3 = newAlphabet;
            }
            else {
                g_userAlphabet3 = defaultAlphabet;
            }
            if (g_userSeperateAlphabet === true) {
                g_waterfalls[2].alphabet = g_userAlphabet3;
            }
        }
        if (properties.colour3) {
            let colour = properties.colour3.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[2].textColour = colour;
        }
        // Waterfall 4
        if (properties.alpha4) {
            g_waterfalls[3].alphaOffset = properties.alpha4.value;
        }
        if (properties.drop4) {
            g_waterfalls[3].dropChance = properties.drop4.value;
        }
        if (properties.size4) {
            g_waterfalls[3].reset(properties.size4.value);
        }
        if (properties.font4) {
            let newFont = properties.font4.value.trim();
            if (newFont) {
                g_userFont4 = newFont;
            }
            else {
                g_userFont4 = defaultFont;
            }
            if (g_userSeperateFont === true) {
                g_waterfalls[3].fontStyle = g_userFont4;
            }
        }
        if (properties.alphabet4) {
            let newAlphabet = properties.alphabet4.value.replace(/\s/g,'');
            if (newAlphabet) {
                g_userAlphabet4 = newAlphabet;
            }
            else {
                g_userAlphabet4 = defaultAlphabet;
            }
            if (g_userSeperateAlphabet === true) {
                g_waterfalls[3].alphabet = g_userAlphabet4;
            }
        }
        if (properties.colour4) {
            let colour = properties.colour4.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[3].textColour = colour;
        }
    }
};

restart();