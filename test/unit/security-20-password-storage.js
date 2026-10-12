'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Passwords are verified without storing reusable plaintext', async h => {
    const user = await h.user('passwordstorage');
    const record = h.db.records.users.find(u => u._id === user.id);
    const wrong = await h.client().form('/login', {userName: 'passwordstorage', password: 'wrong'});
    return {password: user.password, stored: JSON.stringify(record), wrong};
}, data => {
    assert(!data.stored.includes(data.password), 'The account record contains the submitted reusable password');
    assert(!/\/(dashboard|benefits)/.test(data.wrong.headers.location || ''), 'Incorrect passwords must remain rejected');
});
