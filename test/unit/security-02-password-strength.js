'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Signup rejects a one-character password', async h => {
    const browser = h.client();
    await browser.form('/signup', {userName: 'weakfixture', firstName: 'Test', lastName: 'Person', email: '', password: 'a', verify: 'a'});
    return h.db.records.users.some(u => u.userName === 'weakfixture');
}, created => assert.strictEqual(created, false, 'Signup persisted an account protected by one character'));
