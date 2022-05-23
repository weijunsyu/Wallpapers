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


const YOUTUBE_VIDEO_ID_REGREX = /(^(\s*)|v=|(\/|\?|&){1})([0-9]|[A-Z]|[a-z]|-|_){11}((\/|\?|&){1}|(\s*)$)/g;
const YOUTUBE_ID_DELIMITER_REGREX = /^v=|\s|\/|\?|&/g;
const YOUTUBE_ID_EXCEPTIONS = /videoseries/i;
const YOUTUBE_DEFAULT_ID = "jNQXAC9IVRw";


// given some string (url or otherwise) return the youtube video id if it exists or null if not
function getYoutubeVideoID(url) {
    // match id regrex
    let id = url.match(YOUTUBE_VIDEO_ID_REGREX);
    // if id found a match, strip all unecessary characters (whitespace and delimiters)
    if (id !== null) {
        id = id[0].replace(YOUTUBE_ID_DELIMITER_REGREX, "");
        // check if match was NOT an exception string
        if (id.match(YOUTUBE_ID_EXCEPTIONS)) {
            id = null;
        }
    }
    return id;
}
// parse a string of comma delimited urls (any string potentially containing youtube video id's)
// and returns an array containing all found id's
function parseYoutubeURLsForIDs(urls) {
    // split list of urls with "," delimiter
    let ids = urls.split(",");
    // Loop over list of urls and getting their id values (or null if no id exists)
    for (let i = 0; i < ids.length; i++) {
        ids[i] = getYoutubeVideoID(ids[i]);
    }
    // remove all null values from id list
    ids = ids.filter(id => id !== null);
    // if no valid ids in array return null
    return ids;
}
function incrementIndex(curIndex, length, random=false) {
    let nextIndex = curIndex + 1;
    if (random && length > 2) {
        nextIndex = Math.floor(Math.random() * length);
        while (nextIndex === curIndex) {
            nextIndex = Math.floor(Math.random() * length);
        }
    }
    if (nextIndex < length) {
        return nextIndex;
    }
    return 0;
}
function checkIndex(index, length) {
    if (index < length) {
        return index;
    }
    return 0;
}


// Global variables
g_player = null;
g_mute = true;
g_shuffle = false;
g_videos = [];
g_index = 0;

// Load the IFrame Player API code asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/player_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Replace the "ytplayer" element with an <iframe> and YouTube player after the API code downloads.
function onYouTubePlayerAPIReady() {
    g_player = new YT.Player("ytplayer", {
        videoId: YOUTUBE_DEFAULT_ID,
        playerVars: {
            "enablejsapi": 1,
            "loop": 1,
            "modestbranding": 1,
            "autoplay": 0,
            "controls": 0,
            "disablekb": 1,
            "iv_load_policy": 3,
            "fs": 0,
            "mute": 1,
            "playsinline": 1
        },
        events: {
            "onReady": onPlayerReady,
            "onStateChange": onPlayerStateChange,
            "onError": onPlayerError
        }
    });
}
function onPlayerReady(event) {
    event.target.setLoop(true);
    if (g_mute) {
        event.target.mute();
    }
    else {
        event.target.unMute();
    }
    if (g_videos.length > 0) {
        event.target.loadVideoById(g_videos[g_index]);
    }
}
function onPlayerStateChange(event) {
    if (event.data === -1) { // unstarted

    }
    if (event.data === YT.PlayerState.ENDED) {
        // if finished playing video then increment index and playing next video in list
        g_index = incrementIndex(g_index, g_videos.length, g_shuffle);
        event.target.loadVideoById(g_videos[g_index]);
    }
    if (event.data === YT.PlayerState.PLAYING) {

    }
    if (event.data === YT.PlayerState.PAUSED) {

    }
    if (event.data === YT.PlayerState.BUFFERING) {

    }
    if (event.data === YT.PlayerState.CUED) {

    }
}
function onPlayerError(event) {
    // remove the current (errored) video from the list
    g_videos.splice(g_index, 1);
    // check the current index to make sure its still valid (reset to 0 if not valid)
    g_index = checkIndex(g_index, g_videos.length);
    // if video list is not empty
    if (g_videos.length > 0) {
        // load video in list
        event.target.loadVideoById(g_videos[g_index]);
    }
    // If video list is empty do nothing (stay on error message screen)
}
// Event Listener for wallpaper engine user properties
window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {
        if (properties.mute) {
            g_mute = properties.mute.value;
            if (g_mute) {
                g_player.mute();
            }
            else {
                g_player.unMute();
            }
        }
        if (properties.shuffle) {
            g_shuffle = properties.shuffle.value;
        }
        if (properties.videos) {
            // Get list of urls from text field (comma delimited)
            let urls = properties.videos.value;
            // get list of ids from said url list
            g_videos = parseYoutubeURLsForIDs(urls);
            g_index = checkIndex(g_index, g_videos.length, g_shuffle);
            if (g_videos.length > 0) {
                g_player.loadVideoById(g_videos[g_index]);
            }
            else {
                g_player.pauseVideo();
            }
        }
    }
};
