'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Validation redisplays input as text', async h => {
    // An inert attribute, not executable JavaScript, proves the context escape.
    const marker = '" data-regression="yes';
    const browser = h.client();
    const login = await browser.form('/login', {userName: marker, password: 'wrong'});
    const signup = await browser.form('/signup', {userName: marker, firstName: '', lastName: '', email: marker, password: '', verify: ''});
    const user = await h.user('reflection');
    const profile = await user.browser.form('/profile', {firstName: marker, lastName: marker, bankRouting: 'invalid'});
    const link = await user.browser.form('/profile', {firstName: 'javascript:void(0)', bankRouting: 'invalid'});
    return [login, signup, profile, link];
}, responses => responses.forEach(response => {
    assert(response.status < 500, 'Validation must complete normally');
    assert(!require('../support/security/html').hasMarkerAttribute(response.body), 'Request text created an HTML attribute');
    assert(!/href=["']javascript:void\(0\)/i.test(response.body), 'Request text created a script-scheme link');
}));
