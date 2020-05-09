document.title = title;

$('#h1').text(title);

var config = null;
try {
    if (location.hash) {
        config = JSON.parse(decodeURIComponent(location.hash.substring(1))) || null;
    }
    if (!config) {
        config = JSON.parse(prompt('Enter configuration string.\nPress "Cancel" if you do not have one.')) || {};
    }
} catch (e) {
    config = {};
}

var scriptFiles = ['webspeech.js'];
if (config.service == 'azure')  {
    scriptFiles = [
        'https://unpkg.com/tone@13.8.25/build/Tone.js',
        'https://cdn.rawgit.com/mattdiamond/Recorderjs/08e7abd9/dist/recorder.js',
        'microsoft.cognitiveservices.speech.sdk.bundle-min.js',
        'azure.js'
    ];
} else if (config.service == 'gcloud') {
    scriptFiles = [
        'https://unpkg.com/tone@13.8.25/build/Tone.js',
        'https://cdn.rawgit.com/mattdiamond/Recorderjs/08e7abd9/dist/recorder.js',
        'gcloud.js'
    ];
} else if (config.service == 'playback') {
    scriptFiles = [
        'https://unpkg.com/tone@13.8.25/build/Tone.js',
        'https://cdn.rawgit.com/mattdiamond/Recorderjs/08e7abd9/dist/recorder.js',
        'playback.js'
    ];
} else if (config.service == 'record-firebase') {
    scriptFiles = [
        'https://www.gstatic.com/firebasejs/7.14.0/firebase-app.js',
        'https://www.gstatic.com/firebasejs/7.14.0/firebase-firestore.js',
        'https://www.gstatic.com/firebasejs/7.14.0/firebase-messaging.js',
        'https://www.gstatic.com/firebasejs/7.14.0/firebase-storage.js',
        '/gaid.js',
        'record-firebase.js'
    ];
}

scriptFiles.forEach(function(url) {
    var script = document.createElement('script');
    script.src = url;
    script.async = false;
    document.body.appendChild(script);
});
