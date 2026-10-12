'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Startup and reset logs keep secrets private', async h => {
    const reset = await require('../support/security/reset')();
    return {resetLogs: reset.logs};
}, (data, logs) => {
    for (const secret of ['databaseSecretMarker', 'session_cookie_secret_key_here', 'a_secure_key_for_crypto_here']) {
        assert(!logs.includes(secret), 'Startup printed a configured credential or key');
    }
    for (const secret of ['Admin_123', 'User1_123', 'User2_123', 'databaseSecretMarker']) {
        assert(!data.resetLogs.includes(secret), 'Reset logs disclosed credential: ' + secret);
    }
});
