'use strict';
// Loaded only in the reset subprocess, at the MongoDB driver boundary.
const db = require('./harness').database();
require('mongodb').MongoClient.connect = (uri, callback) => callback(null, db);
process.on('exit', () => {
    console.log('SECURITY_RESET_RECORDS=' + JSON.stringify(db.records));
});
