var $container = $('#container');
var $row = $('<div/>').addClass('row').appendTo($container);

var running = false;

var speechConfig = SpeechSDK.SpeechConfig.fromSubscription(config.key, config.region);
speechConfig.speechRecognitionLanguage = 'zh-CN';
speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;

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

    var recorder = null, motu = null;

    $go.click(function() {
        if (motu && recorder) {
            recorder.stop();
            motu.close();

            recorder.exportWAV(function(blob) {
                console.log(URL.createObjectURL(blob));

                var file = new File([blob], 'voice.wav', {'type': 'audio/wav'});
                var audioConfig  = SpeechSDK.AudioConfig.fromWavFileInput(file);
                var recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

                $text.text('Recognizing');

                recognizer.recognizeOnceAsync(function(result) {
                    console.log(result);
                    result = JSON.parse(result.json);
                    console.log(result);

                    if (result.RecognitionStatus != 'Success') {
                        running = false;
                        $text.text('Status: ' + result.RecognitionStatus);
                        $('.go').removeClass('disabled').text('Go');
                        gtag('event', 'azure-status-' + result.RecognitionStatus, {event_category: 'app-read-azure', event_label: word.text});
                        return;
                    }

                    var matched = false;
                    var matchedIdx = -1;

                    result.NBest.forEach(function(best, idx) {
                        if (matched || idx >= (word.maxAlternatives || 1)) {
                            return;
                        }
                        var result = best.ITN.replace(/ /g, '');
                        var confidence = best.Confidence;
                        if (word.text == result) {
                            matched = true;
                            matchedIdx = idx;
                        }
                        console.log('answer', word.text, 'idx', idx, 'result', result, 'confidence', confidence, 'match', matched);
                    });

                    running = false;
                    if (matched) {
                        $text.text('Correct!').parents('.card-body').addClass('bg-success');
                        gtag('event', 'azure-matched', {event_category: 'app-read-azure', event_label: word.text, value: matchedIdx});
                    } else {
                        $text.text('Try again');
                        gtag('event', 'azure-mismatched', {event_category: 'app-read-azure', event_label: word.text});
                    }
                    $('.go').removeClass('disabled').text('Go');
                }, function (err) {
                    running = false;
                    $text.text('Error: ' + err);
                    $('.go').removeClass('disabled').text('Go');
                    gtag('event', 'azure-error', {event_category: 'app-read-azure', event_label: word.text});
                });

                gtag('event', 'azure-send', {event_category: 'app-read-azure', event_label: word.text});
            });

            recorder = motu = null;
            $text.text('Stopping');
            $go.addClass('disabled').text('...');
        }

        if (running) {
            return;
        }

        running = true;
        $('.go').addClass('disabled').text('...');
        $text.text('Listen now');

        createjs.Sound.play('word-' + index).on('complete', function() {
            $text.text('Your turn');

            motu = new Tone.UserMedia();

            motu.open().then(function() {
                $text.text('Recording');
                $go.removeClass('disabled').text('Stop');

                var context = Tone.context;
                var destination = context.createGain();
                var pitchShift = new Tone.PitchShift(config.pitch || 0);

                motu.connect(pitchShift);
                pitchShift.connect(destination);
                recorder = new Recorder(destination, {numChannels: 1});
                gtag('event', 'azure-record', {event_category: 'app-read-azure', event_label: word.text});
                recorder.record();
            }).catch(function(err) {
                running = false;
                motu = null;
                $text.text(err.name + ': ' + err.message);
                $('.go').removeClass('disabled').text('Go');
            });
        });
    });

    $col.appendTo($row);
});
