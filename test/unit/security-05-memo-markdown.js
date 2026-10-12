'use strict';
const run = require('../support/security/run');
describe('Memo Markdown safety', function() {
    it('does not emit a script-scheme link after entity canonicalization', function() {
        run(async function(h, assert) {
            const db = h.database(), getApp = h.boot(db), writer = h.client(getApp), reader = h.client(getApp);
            await h.addUser(db, 'alice'); await h.addUser(db, 'bob');
            await h.login(writer, 'alice'); await h.login(reader, 'bob');
            // Browsers consume the numeric prefix of &#58this; as ':' and
            // leave 'this;' as text. Marked 0.3.5 instead coerces the entire
            // '58this' to a number, losing the colon in its scheme check.
            // The resulting javascript:this; only evaluates `this`: no calls,
            // assignments, network access, or other script side effects.
            await writer.post('/memos', {memo: '[marker](javascript&#58this;)'});
            const page = await reader.request('GET', '/memos');
            const links = [...page.body.matchAll(/href\s*=\s*["']([^"']*)["']/gi)].map(m => m[1]
                .replace(/&colon;/gi, ':').replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi, (_, hex, dec) => String.fromCharCode(parseInt(hex || dec, hex ? 16 : 10)))
                .replace(/[\x00-\x20]/g, ''));
            assert(!links.some(link => /^javascript:/i.test(link)), 'The memo emitted a browser-executable javascript URL');
        });
    });
});
