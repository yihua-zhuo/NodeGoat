'use strict';
const run = require('../support/security/run');
describe('Research response isolation', function() {
    it('does not serve upstream markup as active application-origin HTML', function() {
        run(async function(h, assert, require) {
            require('needle').get = (url, options, callback) => {
                if (typeof options === 'function') callback = options;
                callback(null, {statusCode: 200}, '<a href="javascript:void(0)">marker</a>');
            };
            const db = h.database(), browser = h.client(h.boot(db));
            await h.addUser(db, 'alice'); await h.login(browser, 'alice');
            const response = await browser.request('GET', '/research?symbol=marker&url=https%3A%2F%2Fresearch.example%2F');
            const html = /text\/html|application\/xhtml\+xml/i.test(response.headers['content-type'] || '');
            const sandboxed = /sandbox(?![^;]*allow-same-origin)/i.test(response.headers['content-security-policy'] || '');
            assert(!html || sandboxed || !/href=["']javascript:void\(0\)/i.test(response.body), 'Upstream markup became active HTML in the application origin');
        });
    });
});
