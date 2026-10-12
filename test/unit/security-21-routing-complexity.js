'use strict';
const run = require('../support/security/run');
describe('Routing validation resource bounds', function() {
    this.timeout(45000);
    it('rejects a short near-match promptly', function() {
        run(async function(h, assert) {
            const db = h.database(), browser = h.client(h.boot(db));
            await h.addUser(db, 'alice'); await h.login(browser, 'alice');
            const start = process.hrtime.bigint();
            await browser.post('/profile', {firstName: 'Alice', lastName: 'Last', bankRouting: '1'.repeat(26) + '!'});
            const milliseconds = Number(process.hrtime.bigint() - start) / 1e6;
            assert(milliseconds < 250, 'A 27-character invalid routing number consumed ' + milliseconds.toFixed(0) + ' ms');
        }, {timeout: 30000});
    });
});
