'use strict';
const run = require('../support/security/run');
describe('Learning redirect destinations', function() {
    it('does not redirect to an arbitrary external origin', function() {
        run(async function(h, assert) {
            const db = h.database(), browser = h.client(h.boot(db));
            await h.addUser(db, 'alice'); await h.login(browser, 'alice');
            for (const target of ['https://untrusted.example/marker', '//untrusted.example/marker']) {
                const response = await browser.request('GET', '/learn?url=' + encodeURIComponent(target));
                const location = response.headers.location;
                assert(!location || new URL(location, 'https://nodegoat.test').hostname !== 'untrusted.example', 'The trusted route redirected to an arbitrary origin');
            }
        });
    });
});
