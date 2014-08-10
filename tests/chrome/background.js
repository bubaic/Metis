chrome.app.runtime.onLaunched.addListener(function() { // When the Chrome app is launched
    chrome.app.window.create('window.html', {
        'bounds': {
            'width': 400,
            'height': 500
        }
    });


});