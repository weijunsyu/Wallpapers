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

const canvas = document.getElementById('waterfall');
const context = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const katakana = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン";
const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nums = "0123456789";
const defaultAlphabet = katakana + latin + nums;

function Droplet(text, colour, alpha) {
    this.text = text; // character to be displayed
    this.colour = colour; // colour of the text give as: [r, g, b]
    this.alpha = alpha; // current alpha value of the text colour
}

function Waterfall(alphaOffset, dropChance, fontSize, fontStyle, textColour, messages = []) {
    this.alphaOffset = alphaOffset; // amount of transparency added per waveFront increment
    this.dropChance = dropChance; // chance (between 0 - 1) of a droplet spawning at top of waterfall
    this.fontSize = fontSize; // determines the size of the "grid" of screenArray
    this.fontStyle = fontStyle;
    this.textColour = textColour; // default colour of the text give as: [r, g, b]
    this.messages = messages; // list of all messages that should be written in this waterfall
    
    this.screenArray = []; // flattened matrix of all Droplets
    this.waveFront = []; // position array of the wavefront (waterfall leading edge)
    this.numCol = Math.ceil(canvas.width/this.fontSize);
    this.numRow = Math.ceil(canvas.height/this.fontSize);
    initWaveFront(this.waveFront, this.numCol);

    this.reset = function(newFontSize, newMessages = []) {
        this.screenArray.length = 0;
        this.waveFront = [];
        this.fontSize = newFontSize;
        this.messages = newMessages;
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

function Message(msgString, msgColour, msgOrientation, msgPosition) {
    this.msgString = msgString;
    this.msgColour = msgColour;
    // Either "horizontal" or "vertical" with .toLowerCase() to prevent ambiguity
    this.msgOrientation = msgOrientation.toLowerCase();
    // If value between 0 - 1 then value is a percentage of screen with origin at the center of message
    // otherwise value is the exact index into matrix with origin at the start of message
    this.msgPosition = msgPosition; // [col, row]

    this.verticalIndex = 0; // Set index to 0 on init (for use for vertical oriented messages)
}

// Take rgba values and convert them to its string representation
function rgbaToString(r, g, b, a) {
    return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
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
        let curAlpha = screenArray[i].alpha;
        screenArray[i].alpha = Math.max((screenArray[i].alpha - alphaOffset), 0);
    }
}
// Get the starting column and row of the message given a relative position represented by a percentage of the screen
function getMsgStartColRow(msgString, msgOrientation, msgPosition, numCol, numRow) {
    let col = msgPosition[0];
    let row = msgPosition[1];
    let offset = Math.ceil(msgString.length / 2); // Offset finding center of msg

    if (col < 1) {
        // col := 0 <= msgPosition[col] <= (numCol - 1) = index of last column
        col = Math.min(Math.max(Math.floor(numCol * msgPosition[0]), 0), numCol - 1);
        if (msgOrientation === "horizontal") {
            // if msg orientation is horizontal then shift the starting column back by the offset
            col = col - offset;
        }
    }
    if (row < 1) {
        row = Math.min(Math.max(Math.floor(numRow * msgPosition[1]), 0), numRow - 1);
        if (msgOrientation === "vertical") {
            // if msg orientation is vertical then shift the starting row up by the offset
            row = row - offset;
        }
    }
    // return [col, row] after clamping the position to make sure its within the bounds of the screen
    return clampMsgPosition(msgString, msgOrientation, col, row, numCol, numRow);
}

// Clamp the col and row of the message such that it is within the bounds of the screen
function clampMsgPosition(msgString, msgOrientation, col, row, numCol, numRow) {
    if (msgOrientation === "vertical") {
        //check that starting row is >= 0
        //check that ending row is <= numRow with starting row >=0 taking precedence
        row = Math.max(row, 0); // if make sure row is at least 0
         // get the ending index of the msg (row)
        let endRow = row + msgString.length - 1; // -1 since the length of the string is 1 more than the index
        // If the message is cut off at the end and there is room for it to be moved up
        if (endRow > numRow && row >= 0) {
            // get the offset that we need to move the message up by to show the entire message
            let offset = endRow - (numRow - 1); // -1 since numRow is the length but we want the index (of the last row)
            row = Math.max(row - offset, 0);
        }
    }
    else if (msgOrientation === "horizontal") {
        col = Math.max(col, 0);
        let endCol = col + msgString.length - 1;
        if (endCol > numCol && col >= 0) {
            let offset = endCol - (numCol - 1);
            col = Math.max(col - offset, 0);
        }
    }
    return [col, row];
}

function updateTextWithMessage(screenArray, index, msgString, msgIndex, msgColour) {
    let msgText = msgString[msgIndex]; // Get the character at index (of message)
    if (msgText !== " ") {
        screenArray[index].text = msgString[msgIndex];
        screenArray[index].colour = msgColour;
    }
}

function injectMessage(message, screenArray, numCol, numRow, index) {
    // Cache values:
    let msgString = message.msgString;
    let msgColour = message.msgColour;
    let msgOrientation = message.msgOrientation;
    let msgPosition = message.msgPosition;
    let msgLen = msgString.length;

    // Get the starting column and row of the message in the screenArray
    let [msgCol, msgRow] = getMsgStartColRow(msgString, msgOrientation, msgPosition, numCol, numRow);
    // Get the index of the screenArray corresponding to the col and row
    let msgStartIndex = getIndex(msgCol, msgRow, numCol);
    // If horizontal then the entire message needs to be displayed during one iteration of waveFront
    if (msgOrientation === "horizontal") {
        // If msgStartIndex <= index < (msgStartIndex + msg.length)
        if (msgStartIndex <= index && index < (msgStartIndex + msgLen)) {
            let msgIndex = index - msgStartIndex; // Get the index into the message
            updateTextWithMessage(screenArray, index, msgString, msgIndex, msgColour);
        }
    }
    // If vertical then we need to save the index as message is displayed over multiple waveFront iterations
    else if (msgOrientation === "vertical") {
        let offset = message.verticalIndex * numCol;
        if (index == msgStartIndex + offset) {
            let msgIndex = message.verticalIndex; // Get the index into the message
            updateTextWithMessage(screenArray, index, msgString, msgIndex, msgColour);
            message.verticalIndex++; // move index forward
            if (message.verticalIndex >= msgLen) {
                message.verticalIndex = 0; // if at end of msg then reset index
            }
        }
    }
}

// Update the screenArray with the new text given the waveFront
function updateText(screenArray, waveFront, dropChance, fontSize, textColour, numCol, numRow, messages, alphabet) {
    //console.log(numCol + " " + numRow);

    let msgFlag = false; // Set flag for if there exists messages to inject (cache the value)
    // If there are indeed messages then toggle msgFlag
    if (messages && messages.length) { // Array.isArray(messages) && messages.length
        msgFlag = true;
    }

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

        // Inject messages
        //Check if there are messages to add inject in the first place by checking the cache
        if (msgFlag) {
            //If there are messages to inject start injecting each message in messages
            for (let j = 0, lenMessages = messages.length; j < lenMessages; j++) {
                injectMessage(messages[j], screenArray, numCol, numRow, index);
            }
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
            context.fillStyle = rgbaToString(screenArray[i].colour[0], screenArray[i].colour[1], screenArray[i].colour[2], screenArray[i].alpha);
             // Draw to screen
            context.fillText(text, col*fontSize, (row + 1)*fontSize); // (row + 1) since top row is 0 in our data structure
        }
    }
}

// Update the waterfall object such that alpha and text are updated and then draw to screen
function updateWaterfall(waterfall, alphabet) {
    let screenArray = waterfall.screenArray;
    let waveFront = waterfall.waveFront;
    let alphaOffset = waterfall.alphaOffset;
    let dropChance = waterfall.dropChance;
    let fontSize = waterfall.fontSize;
    let fontStyle = waterfall.fontStyle;
    let textColour = waterfall.textColour;
    let messages = waterfall.messages;
    let numCol = waterfall.numCol;
    let numRow = waterfall.numRow;

    updateAlpha(screenArray, alphaOffset);
    updateText(screenArray, waveFront, dropChance, fontSize, textColour, numCol, numRow, messages, alphabet);
    draw(screenArray, fontSize, fontStyle, numCol);
}

// Update each waterfall within the waterfalls list
function updateWaterfalls(waterfalls, numFalls, alphabet) {
    blank();
    for (let i = 0; i < numFalls; i++) {
        updateWaterfall(waterfalls[i], alphabet);
    }
}


// Declare global variables (with placeholders)
g_alphabet = defaultAlphabet;
g_delay = 40;
g_numwaterfalls = 4;
g_intervalId = null;
g_waterfalls = [];

// Functions relying on global variables
function stop() {
    if (g_intervalId !== null) {
        clearInterval(g_intervalId);
        g_intervalId = null;
    }
}
function start() {
    if (g_intervalId === null) {
        blank();
        function updateOnce() {
            updateWaterfalls(g_waterfalls, g_numwaterfalls, g_alphabet);
        }
        g_intervalId = setInterval(updateOnce, g_delay);
    }
}
function restart() {
    stop();
    start();
}
// Initialize the waterfalls
function init(maxNumWaterfalls) {
    let alphas = [0.05, 0.05, 0.05, 0.05];
    let drops = [0.025, 0.025, 0.025, 0.025];
    let sizes = [22, 33, 44, 55];
    let fonts = ["monospace", "monospace", "monospace", "monospace"];
    let colours = [[255, 255, 255], [255, 255, 255], [255, 255, 255], [255, 255, 255]];
    
    for(let i = 0; i < maxNumWaterfalls; i++) {
        g_waterfalls.push(new Waterfall(alphas[i], drops[i], sizes[i], fonts[i], colours[i]));
    }
}

init(4);
start();

// Event Listener for wallpaper engine user properties
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
        if (properties.delay) {
            g_delay = properties.delay.value;
            restart();
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
            stop();
            g_waterfalls[0].reset(properties.size1.value);
            start();
        }
        if (properties.font1) {
            g_waterfalls[0].fontStyle = properties.font1.value;
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
            stop();
            g_waterfalls[1].reset(properties.size2.value);
            start()
        }
        if (properties.font2) {
            g_waterfalls[1].fontStyle = properties.font2.value;
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
            stop();
            g_waterfalls[2].reset(properties.size3.value);
            start();
        }
        if (properties.font3) {
            g_waterfalls[2].fontStyle = properties.font3.value;
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
            stop();
            g_waterfalls[3].reset(properties.size4.value);
            start();
        }
        if (properties.font4) {
            g_waterfalls[3].fontStyle = properties.font4.value;
        }
        if (properties.colour4) {
            let colour = properties.colour4.value.split(" ");
            colour = colour.map(c => Math.ceil(c * 255));
            g_waterfalls[3].textColour = colour;
        }
    }
};
