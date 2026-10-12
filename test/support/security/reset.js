'use strict';
const childProcess = require('child_process');
const path = require('path');
module.exports = function() {
    return new Promise((resolve, reject) => {
        childProcess.execFile(process.execPath, ['--require', path.join(__dirname, 'reset-fixture.js'), 'artifacts/db-reset.js'], {
            cwd: path.resolve(__dirname, '../../..'),
            env: Object.assign({}, process.env, {NODE_ENV: 'production'}),
            timeout: 10000,
            maxBuffer: 1024 * 1024
        }, (error, stdout, stderr) => {
            const match = /^SECURITY_RESET_RECORDS=(.*)$/m.exec(stdout);
            if (!match) return reject(error || new Error('Reset fixture did not report its database state'));
            resolve({records: JSON.parse(match[1]), logs: stdout.replace(match[0], '') + stderr});
        });
    });
};
