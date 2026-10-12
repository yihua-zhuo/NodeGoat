'use strict';
const assert = require('assert');
require('../support/security/test')(__filename, 'Repeated credential guesses encounter an effective limit', async h => {
    await h.user('throttlefixture');
    const browser = h.client();
    const startQueries = h.db.queries.length;
    const start = Date.now();
    const statuses = [];
    for (let attempt = 0; attempt < 101; attempt++) {
        const response = await browser.form('/login', {userName: 'throttlefixture', password: 'incorrect'});
        statuses.push(response.status);
        if (response.status === 429 || Date.now() - start >= 3000) break;
    }
    const lookups = h.db.queries.slice(startQueries).filter(q => q.collection === 'users' && q.query.userName === 'throttlefixture').length;
    const elapsed = Date.now() - start;
    const correct = await browser.form('/login', {userName: 'throttlefixture', password: 'Regression_92!'});
    return {lookups, statuses, elapsed, locked: correct.status !== 302};
}, data => {
    assert(data.lookups < data.statuses.length || data.statuses.includes(429) || data.elapsed >= 3000 || data.locked, 'A bounded burst of credential guesses all reached password lookup without throttling or delay');
});
