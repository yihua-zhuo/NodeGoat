'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Routing validation has bounded work for short invalid strings', async h => {
    const user = await h.user('routingfixture');
    await user.browser.form('/profile', {firstName: 'Fixture', bankRouting: '12!'});
    const start = process.hrtime.bigint();
    await user.browser.form('/profile', {firstName: 'Fixture', bankRouting: '1'.repeat(27) + '!'});
    return Number(process.hrtime.bigint() - start) / 1e6;
}, milliseconds => assert(milliseconds < 250, 'A 28-character invalid routing value blocked request processing for ' + Math.round(milliseconds) + 'ms'));
