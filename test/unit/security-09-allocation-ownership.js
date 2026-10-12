'use strict';
const run = require('../support/security/run');
describe('Allocation ownership', function() {
    it('does not disclose another account selected by URL id', function() {
        run(async function(h, assert) {
            const db = h.database(), browser = h.client(h.boot(db));
            await h.addUser(db, 'alice'); const victim = await h.addUser(db, 'privateVictim');
            await h.login(browser, 'alice');
            const response = await browser.request('GET', '/allocations/' + victim._id);
            assert(!response.body.includes('privateVictim'), 'Another account\'s identity and allocations were disclosed');
        });
    });
});
