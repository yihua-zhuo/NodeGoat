'use strict';
const run = require('../support/security/run');
describe('Password storage', function() {
    it('stores a protected verifier while preserving password authentication', function() {
        run(async function(h, assert, require) {
            const db = h.database(); await h.addUser(db, 'alice');
            const DAO = require('../../../app/data/user-dao').UserDAO;
            const authenticated = await new Promise(resolve => new DAO(db).validateLogin('alice', 'ValidPass9!x', (error, user) => resolve(!error && !!user)));
            assert(authenticated, 'The created account must authenticate with its original password');
            assert(!JSON.stringify(db.tables).includes('ValidPass9!x'), 'The submitted password is readable in a database record');
        });
    });
});
