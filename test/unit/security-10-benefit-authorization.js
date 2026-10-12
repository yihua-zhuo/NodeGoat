'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Benefits administration requires administrator privileges', async h => {
    const ordinary = await h.user('ordinary');
    const other = await h.user('employee');
    const before = h.db.records.users.find(u => u._id === other.id).benefitStartDate;
    const response = await ordinary.browser.request('GET', '/benefits');
    await ordinary.browser.form('/benefits', {userId: other.id, benefitStartDate: '2040-01-02'});
    return {response, before, after: h.db.records.users.find(u => u._id === other.id).benefitStartDate};
}, data => {
    assert(!data.response.body.includes('Firstemployee'), 'An ordinary account enumerated employee benefits');
    assert.strictEqual(data.after, data.before, 'An ordinary account changed another employee’s benefits');
});
