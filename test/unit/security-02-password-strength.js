'use strict';
const run = require('../support/security/run');
describe('Signup password strength', function() {
    it('refuses a one-character password', function() {
        run(async function(h, assert) {
            const db = h.database(), browser = h.client(h.boot(db));
            await browser.post('/signup', {userName: 'newuser', firstName: 'New', lastName: 'User', email: '', password: 'a', verify: 'a'});
            assert(!db.tables.users.some(user => user.userName === 'newuser'), 'A one-character password created an account');
        });
    });
});
