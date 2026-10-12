'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Usernames cannot create new log records', async h => {
    await h.client().form('/login', {userName: 'unknown\r\nFORGED_RECORD_MARKER', password: 'wrong'});
    return true;
}, (data, logs) => assert(!/[\r\n]FORGED_RECORD_MARKER/.test(logs), 'An untrusted username created a new physical log line'));
