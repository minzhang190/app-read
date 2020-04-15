document.title = title;

$('#h1').text(title);

var $container = $('#container')
var $row = $('<div/>').addClass('row').appendTo($container);

var running = false;
var $runningText = null;
var runningIndex = -1;
var answer = null;

if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
    $('#lead').removeClass('d-none');
}

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

var words = [];

var recognition = new SpeechRecognition();

recognition.onstart = function(event) {
    if (!running) {
        return;
    }
    $runningText.text('Recording');
};

recognition.onend = function(event) {
    if (!running) {
        return;
    }
    running = false;
    runningIndex = -1;
    $runningText.text('Nothing detected');
    $('.go').removeClass('disabled').text('Go');
    gtag('event', 'read-end', {event_category: 'app-read', event_label: answer});
};

recognition.onresult = function(event) {
    console.log(event);
    if (!running) {
        return;
    }
    var matched = false;
    var matchedIdx = -1;
    Array.prototype.forEach.call(event.results[0], function(alternative, idx) {
        if (matched) {
            return;
        }
        var result = alternative.transcript;
        var confidence = alternative.confidence;
        if (answer == result) {
            matched = true;
            matchedIdx = idx;
        }
        console.log('answer', answer, 'idx', idx, 'result', result, 'confidence', confidence, 'match', matched);
    });
    running = false;
    runningIndex = -1;
    if (matched) {
        $runningText.text('Correct!').parents('.card-body').addClass('bg-success');
        gtag('event', 'read-match', {event_category: 'app-read', event_label: answer, value: matchedIdx});
    } else {
        $runningText.text('Try again');
        gtag('event', 'read-mismatch', {event_category: 'app-read', event_label: answer});
    }
    $('.go').removeClass('disabled').text('Go');
};

recognition.onnomatch = function(event) {
    if (!running) {
        return;
    }
    running = false;
    runningIndex = -1;
    $runningText.text('No match');
    $('.go').removeClass('disabled').text('Go');
    gtag('event', 'read-nomatch', {event_category: 'app-read', event_label: answer});
};

recognition.onerror = function(event) {
    if (!running) {
        return;
    }
    running = false;
    runningIndex = -1;
    $runningText.text('Error: ' + event.error);
    $('.go').removeClass('disabled').text('Go');
    gtag('event', 'read-error-' + event.error, {event_category: 'app-read', event_label: answer});
};

recognition.onspeechend = function(event) {
    if (!running) {
        return;
    }
    $runningText.text('Recognizing');
    gtag('event', 'read-speechend', {event_category: 'app-read', event_label: answer});
    recognition.stop();
};

data.forEach(function(word, index) {
    var $col = $('<div/>').addClass('col-md-4');
    var $img = $('<img/>').addClass('card-img-top').attr('src', prefix + word.image).css('background', '#55595c').appendTo($col);
    var $card = $('<div/>').addClass('card mb-4 shadow-sm').appendTo($col);
    var $body = $('<div/>').addClass('card-body').appendTo($card);
    var $text = $('<p/>').addClass('card-text text-center').text('To-do').appendTo($body);
    var $flex = $('<div/>').addClass('d-flex justify-content-between align-items-center').appendTo($body);
    var $small = $('<span/>').addClass('text-dark').text(word.pinyin).appendTo($flex);
    var $group = $('<div/>').addClass('btn-group').appendTo($flex);
    var $go = $('<button/>').addClass('btn btn-sm btn-outline-primary go').attr('type', 'button').text('Go').appendTo($group);

    createjs.Sound.registerSound(prefix + word.sound, 'word-' + index);

    words.push(word.text);

    $go.click(function() {
        if (running) {
            return;
        }

        running = true;
        $('.go').addClass('disabled').text('...');
        $text.text('Listen now');

        createjs.Sound.play('word-' + index).on('complete', function() {
            $text.text('Your turn');

            $runningText = $text;
            runningIndex = index;
            answer = word.text;
            running = true;
            recognition.lang = word.lang || 'cmn-Hans-CN';
            recognition.maxAlternatives = word.maxAlternatives || 1;
            gtag('event', 'read-start', {event_category: 'app-read', event_label: answer});
            recognition.start();
        });
    });

    $col.appendTo($row);
});

var grammar = '#JSGF V1.0; grammar words; public <word> = ' + words.join(' | ') + ';';
var speechRecognitionList = new SpeechGrammarList();

speechRecognitionList.addFromString(grammar, 1);

recognition.grammars = speechRecognitionList;
recognition.continuous = false;
recognition.interimResults = false;
