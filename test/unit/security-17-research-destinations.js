'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Research refuses private network destinations before transport', async h => {
    const user = await h.user('researcher');
    for (const url of ['http://127.0.0.1/', 'http://169.254.169.254/', 'http://10.0.0.1/']) {
        await user.browser.request('GET', '/research?url=' + encodeURIComponent(url) + '&symbol=marker');
    }
    return h.outgoing;
}, outgoing => {
    assert(!/127\.0\.0\.1|169\.254\.169\.254|10\.0\.0\.1/.test(JSON.stringify(outgoing)), 'Research attempted an HTTP request to a private network address');
});
