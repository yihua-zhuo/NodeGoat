'use strict';
const assert = require('assert');
const {client} = require('../support/security/harness');

describe('In-memory HTTP request lifecycle', function() {
    it('preserves the response socket after the request body is consumed', async function() {
        const observed = [];
        const browser = client(() => (req, res) => {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                // Session stores and template engines finish asynchronously,
                // after IncomingMessage has consumed the entire request body.
                setImmediate(() => {
                    observed.push({complete: req.complete, aborted: req.aborted,
                        destroyed: req.socket.destroyed, cookie: req.headers.cookie});
                    res.setHeader('Set-Cookie', ['fixture=session; HttpOnly; Secure']);
                    res.end(body);
                });
            });
        });
        const first = await browser.request('POST', '/fixture', {marker: 'one'});
        const second = await browser.request('POST', '/fixture', {marker: 'two'});
        assert.strictEqual(first.body, 'marker=one');
        assert.strictEqual(second.body, 'marker=two');
        assert(observed.every(item => item.complete && !item.aborted && !item.destroyed));
        assert.strictEqual(observed[1].cookie, 'fixture=session');
    });
});
