'use strict';
const assert = require('assert');
const run = require('../support/security/run');
describe('Login log record integrity', function() {
    it('does not allow a username to create another log line', function() {
        const output = run(async function(h) {
            const browser = h.client(h.boot(h.database()));
            await browser.post('/login', {userName: 'missing\r\nFORGED_RECORD_MARKER', password: 'wrong'});
        });
        assert(!/(?:^|[\r\n])FORGED_RECORD_MARKER/.test(output.logs), 'A failed-login username forged a new log record');
    });
});
