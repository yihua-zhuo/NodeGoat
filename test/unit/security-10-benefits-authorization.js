'use strict';
const run = require('../support/security/run');
describe('Benefits authorization', function() {
    it('denies ordinary users both the employee list and benefit changes', function() {
        run(async function(h, assert) {
            const db = h.database(), browser = h.client(h.boot(db));
            await h.addUser(db, 'alice'); const victim = await h.addUser(db, 'privateVictim');
            await h.login(browser, 'alice');
            const before = db.tables.users.find(u => u._id === victim._id).benefitStartDate;
            const page = await browser.request('GET', '/benefits');
            await browser.post('/benefits', {userId: String(victim._id), benefitStartDate: '2040-01-01'});
            assert(!page.body.includes('privateVictim'), 'An ordinary user received the employee list');
            assert.strictEqual(db.tables.users.find(u => u._id === victim._id).benefitStartDate, before, 'An ordinary user changed another employee\'s benefit date');
        });
    });
});
