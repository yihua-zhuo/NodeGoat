'use strict';
const run = require('../support/security/run');
describe('Login guessing limits', function() {
    this.timeout(30000);
    it('limits a burst of repeated wrong passwords', function() {
        run(async function(h, assert, require) {
            const db = h.database(), browser = h.client(h.boot(db));
            await h.addUser(db, 'alice');
            const DAO = require('../../../app/data/user-dao').UserDAO;
            const baselineStart = Date.now();
            for (let i = 0; i < 3; i++) {
                await new Promise(resolve => new DAO(db).validateLogin('alice', 'wrong', () => resolve()));
            }
            const comparisonCost = (Date.now() - baselineStart) / 3;
            let limited = false;
            const start = Date.now();
            for (let i = 0; i < 100; i++) {
                const response = await browser.post('/login', {userName: 'alice', password: 'wrong'});
                if ([429, 423].includes(response.status) || /too many|try again later|locked|captcha/i.test(response.body)) { limited = true; break; }
            }
            assert(limited || (Date.now() - start) / 100 > Math.max(100, comparisonCost * 3), 'One source made 100 immediate password guesses without any visible throttling');
        }, {timeout: 25000});
    });
});
