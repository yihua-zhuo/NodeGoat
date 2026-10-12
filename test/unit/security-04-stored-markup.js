'use strict';
const run = require('../support/security/run');
describe('Stored account output encoding', function() {
    it('renders persisted names and benefit dates as data for another user', function() {
        run(async function(h, assert) {
            const db = h.database(), getApp = h.boot(db), writer = h.client(getApp), reader = h.client(getApp);
            const user = await h.addUser(db, 'alice'); await h.addUser(db, 'administrator', true);
            await h.login(writer, 'alice'); await h.login(reader, 'administrator');
            await writer.post('/profile', {firstName: '<b data-security-marker="yes">Name</b>', lastName: 'Last', bankRouting: '1#'});
            await reader.post('/benefits', {userId: String(user._id), benefitStartDate: 'x" data-security-marker="yes'});
            const page = await reader.request('GET', '/benefits');
            assert(!/\sdata-security-marker="yes/.test(page.body), 'Stored input introduced HTML markup or an attribute in another user\'s page');
        });
    });
});
