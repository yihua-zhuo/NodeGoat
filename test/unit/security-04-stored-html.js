'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Stored employee fields remain text for other viewers', async h => {
    const writer = await h.user('writer');
    const reader = await h.user('reader', true);
    await writer.browser.form('/profile', {firstName: '<a href="javascript:void(0)" data-regression="name">marker</a>', lastName: 'Fixture', bankRouting: '123456789#'});
    await reader.browser.form('/benefits', {userId: writer.id, benefitStartDate: '" onfocus="void(0)" data-regression="date'});
    return reader.browser.request('GET', '/benefits');
}, response => {
    assert.strictEqual(response.status, 200, 'An administrator must be able to view benefits');
    assert(!require('../support/security/html').hasActiveMarker(response.body), 'Stored data became markup in another account’s response');
});
