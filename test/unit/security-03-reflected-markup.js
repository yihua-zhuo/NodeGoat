'use strict';
const run = require('../support/security/run');
describe('Validation output encoding', function() {
    it('keeps quotes in submitted fields inside their original attributes', function() {
        run(async function(h, assert) {
            const db = h.database(), browser = h.client(h.boot(db));
            const marker = 'x" data-security-marker="yes';
            const login = await browser.post('/login', {userName: marker, password: 'wrong'});
            const signup = await browser.post('/signup', {userName: marker, firstName: '', lastName: '', email: marker, password: '', verify: ''});
            await h.addUser(db, 'alice'); await h.login(browser, 'alice');
            const profile = await browser.post('/profile', {firstName: marker, lastName: marker, bankRouting: '!'});
            for (const response of [login, signup, profile]) {
                assert(!/\sdata-security-marker="yes/.test(response.body), 'A submitted quote introduced a new HTML attribute');
            }
        });
    });
});
