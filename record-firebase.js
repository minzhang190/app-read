var $container = $('#container');
var $row = $('<div/>').addClass('row').appendTo($container);

var running = false;

var words = [];

var firebaseConfig = {
    apiKey: "AIzaSyAitGP_5qbYuEPWXQUsaKgo0-1etrJ3-7Q",
    authDomain: "hawken-c9ef9.firebaseapp.com",
    databaseURL: "https://hawken-c9ef9.firebaseio.com",
    projectId: "hawken-c9ef9",
    storageBucket: "hawken-c9ef9.appspot.com",
    messagingSenderId: "239346842884",
    appId: "1:239346842884:web:b9430603097c18e615a451",
    measurementId: "G-NQVYEFDL6P"
};
firebase.initializeApp(firebaseConfig);
var messaging = firebase.messaging();
messaging.usePublicVapidKey("BHiTraebHENDTnF4mDVpMZgHT6j7MnCm6NyEe1PqWSJxCXOJVl1VaOkdjNm6WjDRDCYbJVMc_FnAfgIVoPZvxng");

var mimeType = null;
var extension = null;
var tokenLogged = false;

[
    {type: 'audio/mp3', ext: '.mp3'},
    {type: 'audio/mp4', ext: '.mp4'},
    {type: 'audio/mpeg', ext: '.mpg'},
    {type: 'audio/aac', ext: '.aac'},
    {type: 'audio/ogg', ext: '.ogg'},
    {type: 'audio/webm', ext: '.webm'},
].forEach(function(doc) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(doc.type)) {
        mimeType = doc.type;
        extension = doc.ext;
    }
});

if (!mimeType) {
    $('#lead').removeClass('d-none').text('Your browser does not have a working MediaRecorder. Please upgrade or switch to another browser');
}

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

data.forEach(function(word, index) {
    var $col = $('<div/>').addClass('col-md-4');
    var $img = $('<img/>').addClass('card-img-top').attr('src', prefix + word.image).css('background', '#55595c').appendTo($col);
    var $card = $('<div/>').addClass('card mb-4 shadow-sm').appendTo($col);
    var $body = $('<div/>').addClass('card-body').appendTo($card);
    var $text = $('<p/>').addClass('card-text text-center').text('To-do').appendTo($body);
    var $audio = $('<p/>').addClass('card-text text-center').appendTo($body);
    var $flex = $('<div/>').addClass('d-flex justify-content-between align-items-center').appendTo($body);
    var $small = $('<span/>').addClass('text-dark').text(word.pinyin).appendTo($flex);
    var $group = $('<div/>').addClass('btn-group').appendTo($flex);
    var $go = $('<button/>').addClass('btn btn-sm btn-outline-primary go').attr('type', 'button').text('Go').appendTo($group);

    createjs.Sound.registerSound(prefix + word.sound, 'word-' + index);

    words.push(word.text);

    var recorder = null, gumStream = null, interval = null, chunks = null;
    var countDown = initialCountDown = 10;

    function stop() {
        recorder.stop();
        gumStream.getAudioTracks().forEach(function(track) {
            track.stop();
        });
        clearInterval(interval);

        recorder = gumStream = interval = null;
    }

    function ready(e) {
        var blob = new Blob(chunks, {type: mimeType});

        running = false;
        $audio.append($('<audio controls/>').attr('src', URL.createObjectURL(blob)));
        $('.go').removeClass('disabled').text('Go');
        gtag('event', 'firebase-ready', {event_category: 'app-read-record-firebase', event_label: word.text});

        var clientId = 'unknown';
        if (window.ga && window.ga.getAll) {
            clientId = ga.getAll().map(tracker => tracker.get('clientId')).filter(x => x).pop();
        }

        var storageRef = firebase.storage().ref().child('users').child(clientId).child('read-recordings').child(uuidv4() + extension);
        var dbCollection = firebase.firestore().collection('users').doc(clientId).collection('read-recordings');

        $text.text('Uploading...');
        storageRef.put(blob, {contentType: mimeType}).then(function(snapshot) {
            $text.text('Checking ...');
            console.log(snapshot);
            storageRef.getDownloadURL().then(function(url) {
                $text.text('Submitting ...');
                console.log(url);
                dbCollection.add({
                    url: url,
                    text: word.text,
                    time: firebase.firestore.FieldValue.serverTimestamp()
                }).then(function(docRef) {
                    $text.text('Submitted!').parents('.card-body').addClass('bg-success');
                    console.log(docRef);
                    gtag('event', 'firebase-add', {event_category: 'app-read-record-firebase', event_label: word.text});
                }).catch(function(error) {
                    $text.text(error.name + ': ' + error.message);
                    gtag('event', 'firebase-add-error-' + error.name, {event_category: 'app-read-record-firebase', event_label: word.text});
                });
            }).catch(function(error) {
                $text.text(error.name + ': ' + error.message);
                gtag('event', 'firebase-url-error-' + error.name, {event_category: 'app-read-record-firebase', event_label: word.text});
            });
            gtag('event', 'firebase-put', {event_category: 'app-read-record-firebase', event_label: word.text});
        }).catch(function(error) {
            $text.text(error.name + ': ' + error.message);
            gtag('event', 'firebase-put-error-' + error.name, {event_category: 'app-read-record-firebase', event_label: word.text});
        });

        var tokenCollection = firebase.firestore().collection('users').doc(clientId).collection('identify-tokens');
        messaging.getToken().then(function(currentToken) {
            if (currentToken && !tokenLogged) {
                tokenCollection.add({
                    token: currentToken,
                    time: firebase.firestore.FieldValue.serverTimestamp()
                }).then(function() {
                    tokenLogged = true;
                });
            }
        });
    }

    $go.click(function() {
        if (gumStream && recorder) {
            stop();
            $text.text('Stopping');
            $go.addClass('disabled').text('...');
        }

        if (running) {
            return;
        }

        running = true;
        $('.go').addClass('disabled').text('...');
        $audio.empty();
        $text.text('Listen now');

        createjs.Sound.play('word-' + index).on('complete', function() {
            $text.text('Your turn');

            navigator.mediaDevices.getUserMedia({
                video: false, audio: true
            }).then(function(stream) {
                countDown = initialCountDown;
                $text.text('Recording ... ' + countDown);
                $go.removeClass('disabled').text('Stop');

                gumStream = stream;
                recorder = new MediaRecorder(stream, {mimeType: mimeType});
                chunks = [];

                recorder.addEventListener('dataavailable', function(e) {
                    chunks.push(e.data);
                });

                recorder.addEventListener('stop', ready);

                interval = setInterval(function() {
                    countDown--;

                    if (countDown > 0) {
                        $text.text('Recording ... ' + countDown);
                    } else {
                        stop();
                        $text.text('Stopping');
                        $go.addClass('disabled').text('...');
                    }
                }, 1000);

                gtag('event', 'firebase-record', {event_category: 'app-read-record-firebase', event_label: word.text});
                recorder.start();
            }).catch(function(err) {
                running = false;
                $text.text(err.name + ': ' + err.message);
                $('.go').removeClass('disabled').text('Go');
            });
        });
    });

    $col.appendTo($row);
});
