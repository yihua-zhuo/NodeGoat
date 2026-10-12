'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Failed logins do not distinguish registered usernames', async h => {
    await h.user('registered');
    const known = await h.client().form('/login', {userName: 'registered', password: 'incorrect'});
    const unknown = await h.client().form('/login', {userName: 'unregistered', password: 'incorrect'});
    function errorText(response) {
        return response.body.replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, '')
            .replace(/freshfixture|unregistered|registered/g, 'ACCOUNT')
            .replace(/\s+/g, ' ').trim();
    }
    const details = {firstName: 'Firstregistered', lastName: 'Lastregistered', email: '', password: 'Regression_92!', verify: 'Regression_92!'};
    const duplicate = await h.client().form('/signup', Object.assign({userName: 'registered'}, details));
    const fresh = await h.client().form('/signup', Object.assign({userName: 'freshfixture'}, details));
    return {known: errorText(known), unknown: errorText(unknown), statuses: [known.status, unknown.status],
        signup: [errorText(duplicate), errorText(fresh)], signupStatuses: [duplicate.status, fresh.status]};
}, data => {
    assert.strictEqual(data.statuses[0], data.statuses[1]);
    assert.strictEqual(data.known, data.unknown, 'Authentication errors reveal whether an account exists');
    assert.strictEqual(data.signupStatuses[0], data.signupStatuses[1], 'Signup status reveals an existing account');
    assert.strictEqual(data.signup[0], data.signup[1], 'Signup response reveals whether the username was already registered');
});
