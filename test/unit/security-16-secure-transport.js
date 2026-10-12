'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Credentials and sessions require encrypted transport', async h => {
    const browser = h.client();
    const cleartext = await browser.request('GET', '/login', null, null, false);
    const encrypted = (await h.user('transportfixture')).login;
    return {httpListener: h.listeners.some(l => !l.secure), cleartext, encrypted};
}, data => {
    if (data.httpListener) {
        assert(data.cleartext.status >= 300 && data.cleartext.status < 400 && /^https:\/\//i.test(data.cleartext.headers.location || ''), 'The HTTP listener serves a credential form instead of requiring HTTPS');
    }
    const cookies = [].concat(data.encrypted.headers['set-cookie'] || []);
    assert(cookies.every(cookie => /;\s*Secure(?:;|$)/i.test(cookie)), 'Session cookies must not travel over cleartext HTTP');
});
