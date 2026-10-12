'use strict';
const run = require('../support/security/run');
describe('Research destination restrictions', function() {
    it('does not send requests to loopback or link-local services', function() {
        run(async function(h, assert, require) {
            const attempted = [];
            // HTTP client boundary: no network connection is made.
            require('needle').get = (url, options, callback) => {
                attempted.push(String(url));
                if (typeof options === 'function') callback = options;
                callback(null, {statusCode: 200}, 'benign response');
            };
            const db = h.database(), browser = h.client(h.boot(db));
            await h.addUser(db, 'alice'); await h.login(browser, 'alice');
            for (const url of ['http://127.0.0.1/', 'http://169.254.169.254/']) {
                await browser.request('GET', '/research?symbol=marker&url=' + encodeURIComponent(url));
            }
            assert(!attempted.some(url => /127\.0\.0\.1|169\.254\.169\.254/.test(url)), 'Research attempted an HTTP request to a private destination');
        });
    });
});
