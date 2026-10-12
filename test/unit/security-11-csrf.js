'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Cross-origin form submissions cannot mutate authenticated data', async h => {
    const user = await h.user('csrfuser', true);
    const before = JSON.stringify(h.db.records);
    const attacks = [
        ['/profile', {firstName: 'CrossOriginMarker', bankRouting: '123456789#'}],
        ['/contributions', {preTax: '3', afterTax: '3', roth: '3'}],
        ['/benefits', {userId: user.id, benefitStartDate: '2040-01-02'}],
        ['/memos', {memo: 'CrossOriginMarker'}]
    ];
    for (const [url, body] of attacks) {
        await user.browser.request('POST', url, body, {origin: 'https://external.invalid', referer: 'https://external.invalid/form'});
    }
    return {before, after: JSON.stringify(h.db.records)};
}, data => assert.strictEqual(data.after, data.before, 'Cookie-authenticated requests without CSRF proof changed stored data'));
