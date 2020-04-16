var $container = $('#container');
var $row = $('<div/>').addClass('row').appendTo($container);

var running = false;

var words = [];

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

    var recorder = null, motu = null, interval = null;
    var countDown = initialCountDown = 10; // gcloud is priced per 15 seconds

    function stop() {
        recorder.stop();
        motu.close();
        clearInterval(interval);

        recorder.exportWAV(function(blob) {
            console.log(URL.createObjectURL(blob));

            var reader = new FileReader();
            reader.onloadend = function() {
                var url = reader.result;
                var request = {
                    config: {
                        languageCode: word.lang || 'cmn-Hans-CN',
                        maxAlternatives: word.maxAlternatives || 1,
                        speechContexts: [{
                            phrases: words
                        }],
                        model: 'command_and_search',
                        useEnhanced: true
                    }, audio: {
                        content: url.substring(url.indexOf('base64,') + 7)
                    }
                };
                console.log(request);

                $text.text('Recognizing');

                fetch('https://speech.googleapis.com/v1/speech:recognize?key=' + config.key, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(request)
                }).then(function(response) {
                    console.log(response);
                    response.json().then(function(result) {
                        console.log(result);

                        if (result.error) {
                            running = false;
                            $text.text('Error ' + result.error.code + ' (' + result.error.status + '): ' + result.error.message);
                            $('.go').removeClass('disabled').text('Go');
                            gtag('event', 'gcloud-gcerr-' + result.error.code, {event_category: 'app-read-gcloud', event_label: word.text});
                            return;
                        }

                        if (!result.results) {
                            running = false;
                            $text.text('Nothing detected');
                            $('.go').removeClass('disabled').text('Go');
                            gtag('event', 'gcloud-noresult', {event_category: 'app-read-gcloud', event_label: word.text});
                            return;
                        }

                        var matched = false;
                        var matchedIdx = 0;
                        result.results[0].alternatives.forEach(function(alternative, idx) {
                            if (matched) {
                                return;
                            }
                            var result = alternative.transcript;
                            var confidence = alternative.confidence;
                            if (word.text == result) {
                                matched = true;
                                matchedIdx = idx;
                            }
                            console.log('answer', word.text, 'idx', idx, 'result', result, 'confidence', confidence, 'match', matched);
                        });

                        running = false;
                        if (matched) {
                            $text.text('Correct!').parents('.card-body').addClass('bg-success');
                            gtag('event', 'gcloud-match', {event_category: 'app-read-gcloud', event_label: word.text, value: matchedIdx});
                        } else {
                            $text.text('Try again');
                            gtag('event', 'gcloud-mismatch', {event_category: 'app-read-gcloud', event_label: word.text});
                        }
                        $('.go').removeClass('disabled').text('Go');
                    }).catch(function(err) {
                        running = false;
                        $text.text('JSON ' + err.name + ': ' + err.message);
                        $('.go').removeClass('disabled').text('Go');
                        gtag('event', 'gcloud-resperr-' + err.name, {event_category: 'app-read-gcloud', event_label: word.text});
                    });
                }).catch(function(err) {
                    running = false;
                    $text.text('Fetch ' + err.name + ': ' + err.message);
                    $('.go').removeClass('disabled').text('Go');
                    gtag('event', 'gcloud-fetcherr-' + err.name, {event_category: 'app-read-gcloud', event_label: word.text});
                });

                gtag('event', 'gcloud-send', {event_category: 'app-read-gcloud', event_label: word.text});
            };
            reader.readAsDataURL(blob);
        });

        recorder = motu = interval = null;
    }

    $go.click(function() {
        if (motu && recorder) {
            stop();
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
                countDown = initialCountDown;
                $text.text('Recording ... ' + countDown);
                $go.removeClass('disabled').text('Stop');

                var context = Tone.context;
                var destination = context.createGain();
                var pitchShift = new Tone.PitchShift(config.pitch || 0);

                motu.connect(pitchShift);
                pitchShift.connect(destination);
                recorder = new Recorder(destination, {numChannels: 1});

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

                gtag('event', 'gcloud-record', {event_category: 'app-read-gcloud', event_label: word.text});
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
