'use strict';
const assert = require('assert');
const childProcess = require('child_process');
const path = require('path');
module.exports = function run(scenario, options = {}) {
    const result = childProcess.spawnSync(process.execPath, [path.join(__dirname, 'worker.js')], {
        input: scenario.toString(), encoding: 'utf8', timeout: options.timeout || 15000,
        maxBuffer: 4 * 1024 * 1024,
        env: {...process.env, NODE_ENV: 'production', SECURITY_FIXTURE: JSON.stringify(options.data || null), MONGODB_URI: 'mongodb://fixture:ConfigSecretMarker@localhost/fixture'}
    });
    if (result.error) throw result.error;
    const match = result.stdout.match(/\nSECURITY_RESULT:(.*)\n/);
    if (!match) throw new Error('Fixture did not finish: ' + result.stderr + result.stdout);
    const report = JSON.parse(match[1]);
    if (report.error) {
        if (report.error.name === 'AssertionError') assert.fail(report.error.message);
        throw new Error(report.error.stack);
    }
    return {value: report.value, logs: result.stdout.replace(match[0], '')};
};
