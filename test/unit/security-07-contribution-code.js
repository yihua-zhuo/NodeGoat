'use strict';
const run = require('../support/security/run');
describe('Contribution parsing', function() {
    it('does not execute an expression supplied as a percentage', function() {
        run(async function(h, assert) {
            const db = h.database(), browser = h.client(h.boot(db));
            await h.addUser(db, 'alice'); await h.login(browser, 'alice');
            global.securityContributionMarker = false;
            await browser.post('/contributions', {preTax: '(global.securityContributionMarker = true, 1)', afterTax: '1', roth: '1'});
            assert.strictEqual(global.securityContributionMarker, false, 'A percentage executed JavaScript in the server process');
        });
    });
});
