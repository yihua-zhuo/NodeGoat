'use strict';
const run = require('../support/security/run');
describe('Authentication error privacy', function() {
    it('gives the same public login failure for unknown users and wrong passwords', function() {
        run(async function(h, assert) {
            const db = h.database(), getApp = h.boot(db);
            await h.addUser(db, 'knownuser');
            const known = await h.client(getApp).post('/login', {userName: 'knownuser', password: 'wrong'});
            const unknown = await h.client(getApp).post('/login', {userName: 'absentuser', password: 'wrong'});
            const normalize = html => html.replace(/knownuser|absentuser/g, 'USER').replace(/(<input[^>]*name=["']_csrf["'][^>]*value=["'])[^"']*/g, '$1TOKEN');
            assert.strictEqual(known.status, unknown.status, 'Login status reveals account existence');
            assert.strictEqual(normalize(known.body), normalize(unknown.body), 'Login error content reveals account existence');
        });
    });
});
