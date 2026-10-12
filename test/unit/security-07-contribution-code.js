'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Contribution percentages never execute code', async h => {
    const user = await h.user('contributor');
    global.__contributionRegressionMarker = 0;
    for (const field of ['preTax', 'afterTax', 'roth']) {
        const body = {preTax: '1', afterTax: '1', roth: '1'};
        body[field] = '(global.__contributionRegressionMarker = 1, 1)';
        await user.browser.form('/contributions', body);
    }
    return global.__contributionRegressionMarker;
}, marker => assert.strictEqual(marker, 0, 'A financial input executed a harmless in-process assignment'));
