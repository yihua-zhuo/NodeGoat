'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Allocation reads are scoped to the authenticated owner', async h => {
    const owner = await h.user('owner');
    const other = await h.user('other');
    h.db.records.allocations.push({userId: owner.id, stocks: 11, funds: 22, bonds: 67}, {userId: other.id, stocks: 17, funds: 23, bonds: 60});
    return owner.browser.request('GET', '/allocations/' + other.id);
}, response => {
    assert(!response.body.includes('Firstother'), 'The response disclosed the other employee’s allocation record');
    assert(response.status < 500, 'An unauthorized identifier must be refused cleanly or scoped to the current user');
});
