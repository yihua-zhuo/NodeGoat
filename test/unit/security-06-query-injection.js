'use strict';
const assert = require('assert');
const vm = require('vm');
require('../support/security/test')(__filename, 'Threshold input cannot change database program syntax', async h => {
    const user = await h.user('threshold');
    h.db.records.allocations.push({userId: user.id, stocks: 30, funds: 30, bonds: 40});
    await user.browser.request('GET', '/allocations/' + user.id + '?threshold=' + encodeURIComponent("0'"));
    return h.db.queries.filter(q => q.collection === 'allocations');
}, queries => {
    queries.forEach(entry => {
        if (typeof entry.query.$where === 'string') {
            let syntaxValid = true;
            try { new vm.Script('(function(){ return (' + entry.query.$where + '); })'); }
            catch (error) { syntaxValid = false; }
            assert(syntaxValid, 'A quote in threshold changed executable MongoDB query syntax');
        }
    });
});
