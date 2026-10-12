'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Learning redirects stay on trusted destinations', async h => {
    const user = await h.user('learner');
    return user.browser.request('GET', '/learn?url=' + encodeURIComponent('https://external.invalid/marker'));
}, response => {
    assert(!String(response.headers.location || '').includes('external.invalid'), 'An arbitrary external URL became the redirect target');
    assert(response.status < 500, 'An untrusted destination must be handled normally');
});
