'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Remote research content cannot become application HTML', async h => {
    const user = await h.user('remoteviewer');
    h.remote('<a href="javascript:void(0)" data-regression="remote">remote marker</a>');
    return user.browser.request('GET', '/research?url=' + encodeURIComponent('https://example.com/') + '&symbol=marker');
}, response => {
    const type = String(response.headers['content-type'] || '');
    const activeMarkup = require('../support/security/html').hasActiveMarker(response.body);
    assert(!(activeMarkup && /text\/html/i.test(type)), 'The application served remote markup as its own HTML');
});
