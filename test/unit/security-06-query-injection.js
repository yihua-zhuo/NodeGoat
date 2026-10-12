'use strict';
const run = require('../support/security/run');
describe('Allocation query data separation', function() {
    it('rejects or binds a nonnumeric threshold instead of inserting it into code', function() {
        run(async function(h, assert, require) {
            const db = h.database();
            await h.addUser(db, 'alice');
            const DAO = require('../../../app/data/allocations-dao').AllocationsDAO;
            const marker = "threshold-marker'";
            try { await new Promise(resolve => new DAO(db).getByUserIdAndThreshold(11, marker, () => resolve())); } catch (_) { /* validation rejection is safe */ }
            assert(!db.queries.some(entry => JSON.stringify(entry.query.$where || '').includes('threshold-marker')), 'Untrusted threshold text reached executable MongoDB query code');
        });
    });
});
