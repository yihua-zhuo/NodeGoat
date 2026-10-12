'use strict';
const run = require('../support/security/run');
describe('Credential transport', function() {
    it('does not serve credential forms and insecure session cookies over HTTP', function() {
        run(async function(h, assert) {
            const browser = h.client(h.boot(h.database()));
            const response = await browser.request('GET', '/login', null, {secure: false});
            const redirect = response.status >= 300 && response.status < 400 && /^https:\/\//i.test(response.headers.location || '');
            assert(redirect || response.status >= 400, 'A credential form is served over cleartext HTTP');
            const secureResponse = await browser.request('GET', '/login');
            const cookies = secureResponse.headers['set-cookie'] || [];
            assert(cookies.every(cookie => /;\s*secure(?:;|$)/i.test(cookie)), 'A session cookie can travel over cleartext HTTP');
        });
    });
});
