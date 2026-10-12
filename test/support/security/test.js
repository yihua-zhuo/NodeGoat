'use strict';
const assert = require('assert');
const childProcess = require('child_process');
const path = require('path');
module.exports = function(file, title, exercise, verify, options) {
    options = options || {};
    if (process.env.NODEGOAT_SECURITY_CHILD === file) {
        Promise.resolve().then(() => require('./harness')()).then(exercise).then(data => {
            process.send({data}, () => process.exit(0));
        }).catch(error => {
            process.send({error: error.stack}, () => process.exit(1));
        });
        return;
    }
    describe(title, function() {
        this.timeout(30000);
        it('enforces the security property', function(done) {
            const child = childProcess.fork(file, [], {
                cwd: path.resolve(__dirname, '../../..'),
                env: Object.assign({}, process.env, {
                    NODEGOAT_SECURITY_CHILD: file, NODE_ENV: 'production',
                    MONGODB_URI: 'mongodb://fixture:databaseSecretMarker@invalid.test/nodegoat'
                }),
                silent: true
            });
            let logs = '', result, timedOut = false;
            child.stdout.on('data', chunk => { logs += chunk; });
            child.stderr.on('data', chunk => { logs += chunk; });
            child.on('message', message => { result = message; });
            const timer = setTimeout(() => { timedOut = true; child.kill(); }, options.timeout || 20000);
            child.on('error', done);
            child.on('exit', () => {
                clearTimeout(timer);
                try {
                    assert(!timedOut, 'Security operation exceeded its bounded execution budget');
                    assert(result && !result.error, 'Fixture must complete before checking security: ' + (result && result.error));
                    verify(result.data, logs);
                    done();
                } catch (error) { done(error); }
            });
        });
    });
};
