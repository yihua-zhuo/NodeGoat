'use strict';
const fs = require('fs');
const assert = require('assert');
const h = require('./harness');
const scenario = fs.readFileSync(0, 'utf8');
const finish = report => {
    process.stdout.write('\nSECURITY_RESULT:' + JSON.stringify(report) + '\n');
};
Promise.resolve().then(() => new Function('h', 'assert', 'require', 'return (' + scenario + ')(h, assert, require);')(h, assert, require))
    .then(value => { finish({value}); process.exit(0); })
    .catch(error => { finish({error: {name: error.name, message: error.message, stack: error.stack}}); process.exit(0); });
