'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Sensitive profile fields are protected at the database boundary', async h => {
    const user = await h.user('privateprofile');
    const values = {ssn: '111-22-3333', dob: '1985-04-23', address: '42 Fixture Lane', bankAcc: '112233445566', bankRouting: '123456789#'};
    const response = await user.browser.form('/profile', Object.assign({firstName: 'Private', lastName: 'Profile'}, values));
    return {values, response, stored: JSON.stringify(h.db.records.users)};
}, data => {
    assert(data.response.status < 400, 'A valid profile update must remain supported');
    Object.values(data.values).forEach(value => assert(!data.stored.includes(value), 'Database records expose plaintext profile value: ' + value));
});
