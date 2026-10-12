'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const run = require('../support/security/run');
describe('Deployment account provisioning', function() {
    it('does not install usable repository-known credentials by default', function() {
        const root = path.resolve(__dirname, '../..');
        const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8').replace(/^\s*#.*$/gm, '');
        const heroku = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
        const deployment = compose + JSON.stringify(heroku.scripts || {});
        // Removing automatic sample-data provisioning is a valid remediation.
        if (!/artifacts\/db-reset\.js/.test(deployment)) return;
        const output = run(function(h, assert, require) {
            const db = h.database();
            require('mongodb').MongoClient.connect = (uri, callback) => callback(null, db);
            process.on('exit', () => process.stdout.write('\nSECURITY_RESULT:' + JSON.stringify({value: db.tables.users || []}) + '\n'));
            require('../../../artifacts/db-reset');
            return new Promise(() => {});
        });
        run(async function(h, assert, require) {
            const db = h.database();
            db.tables.users = JSON.parse(process.env.SECURITY_FIXTURE);
            const DAO = require('../../../app/data/user-dao').UserDAO;
            for (const [name, password] of [['admin', 'Admin_123'], ['user1', 'User1_123'], ['user2', 'User2_123']]) {
                const accepted = await new Promise(resolve => new DAO(db).validateLogin(name, password,
                    (error, user) => resolve(!error && !!user)));
                assert(!accepted, 'Default deployment provisions the publicly known credentials for ' + name);
            }
        }, {data: output.value});
    });
});
