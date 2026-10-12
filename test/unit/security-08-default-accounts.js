'use strict';
const assert = require('assert');
const fs = require('fs');
require('../support/security/test')(__filename, 'Default deployment does not activate repository-known accounts', async h => {
    const docker = fs.readFileSync('docker-compose.yml', 'utf8');
    const heroku = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    const automaticReset = /node\s+artifacts\/db-reset\.js/.test(docker) || /artifacts\/db-reset\.js/.test(JSON.stringify(heroku.scripts));
    if (!automaticReset) return [];
    const reset = await require('../support/security/reset')();
    h.db.records.users = reset.records.users || [];
    const accepted = [];
    for (const pair of [['admin', 'Admin_123'], ['user1', 'User1_123'], ['user2', 'User2_123']]) {
        const response = await h.client().form('/login', {userName: pair[0], password: pair[1]});
        if (response.status === 302 && /\/(dashboard|benefits)/.test(response.headers.location || '')) accepted.push(pair[0]);
    }
    return accepted;
}, accepted => assert.deepStrictEqual(accepted, [], 'An automatic deployment reset enables publicly known credentials'));
