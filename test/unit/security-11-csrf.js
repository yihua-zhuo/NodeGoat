'use strict';
const run = require('../support/security/run');
describe('Cross-site mutation protection', function() {
    it('refuses authenticated form submissions without proof of same-origin intent', function() {
        run(async function(h, assert) {
            const db = h.database(), browser = h.client(h.boot(db));
            const user = await h.addUser(db, 'administrator', true); await h.login(browser, 'administrator');
            for (const [url, body] of [
                ['/profile', {firstName: 'ChangedByCrossSite', bankRouting: '1#'}],
                ['/contributions', {preTax: '3', afterTax: '4', roth: '5'}],
                ['/benefits', {userId: String(user._id), benefitStartDate: '2040-01-01'}],
                ['/memos', {memo: 'CrossSiteMemoMarker'}]
            ]) {
                const before = JSON.stringify(db.tables);
                await browser.request('POST', url, body, {headers: {origin: 'https://other.example', referer: 'https://other.example/form'}});
                assert.strictEqual(JSON.stringify(db.tables), before, 'A cross-site form changed stored data through ' + url);
            }
        });
    });
});
