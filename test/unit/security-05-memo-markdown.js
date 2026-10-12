'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Memo links cannot acquire a script URL scheme', async h => {
    const writer = await h.user('memowriter');
    const reader = await h.user('memoreader');
    // Harmless void expression; nothing is executed. Marked 0.3.5 drops the colon
    // entity with a nonnumeric suffix during its scheme check; browsers decode its numeric prefix.
    await writer.browser.form('/memos', {memo: '[marker](javascript&#58this;void%280%29)'});
    return reader.browser.request('GET', '/memos');
}, response => {
    assert.strictEqual(response.status, 200);
    const links = response.body.match(/href\s*=\s*["'][^"']*["']/gi) || [];
    links.forEach(link => {
        const decoded = link.replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi, (_, hex, dec) => String.fromCharCode(parseInt(hex || dec, hex ? 16 : 10))).replace(/&colon;/gi, ':');
        assert(!/href\s*=\s*["']\s*javascript:/i.test(decoded), 'Shared memo rendered an executable link scheme');
    });
});
