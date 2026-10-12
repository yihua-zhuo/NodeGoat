'use strict';
const assert = require('assert');
const run = require('../support/security/run');
describe('Secret-free operational logs', function() {
    it('does not print the database URI credential at startup', function() {
        const output = run(async function(h) { h.boot(h.database()); });
        assert(!output.logs.includes('ConfigSecretMarker'), 'Startup printed the database password');
    });
    it('does not print account passwords during database reset', function() {
        const output = run(function(h, assert, require) {
            const db = h.database();
            require('mongodb').MongoClient.connect = (uri, callback) => callback(null, db);
            // Reset is a CLI which normally exits itself; inspect its output from the parent.
            process.on('exit', () => process.stdout.write('\nSECURITY_RESULT:' + JSON.stringify({value: db.tables.users || []}) + '\n'));
            require('../../../artifacts/db-reset');
            return new Promise(() => {});
        });
        for (const password of ['Admin_123', 'User1_123', 'User2_123']) {
            assert(!output.logs.includes(password), 'Database reset printed a known account password');
        }
    });
});
