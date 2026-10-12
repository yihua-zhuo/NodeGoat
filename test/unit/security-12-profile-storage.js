'use strict';
const run = require('../support/security/run');
describe('Sensitive profile storage', function() {
    it('does not persist identity and bank details in plaintext', function() {
        run(async function(h, assert, require) {
            const db = h.database(); const user = await h.addUser(db, 'alice');
            const DAO = require('../../../app/data/profile-dao').ProfileDAO;
            const values = ['987-65-4321', '1984-02-03', '42 Fixture Avenue', '123456789012', '987654321#'];
            await new Promise((resolve, reject) => new DAO(db).updateUser(user._id, 'Alice', 'Last', ...values,
                error => error ? reject(error) : resolve()));
            const persisted = JSON.stringify(db.tables);
            values.forEach(value => assert(!persisted.includes(value), 'A sensitive profile value is readable in the database: ' + value));
        });
    });
});
