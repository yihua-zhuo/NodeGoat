'use strict';
// Only dependency boundaries are substituted. Application modules are loaded intact.
const http = require('http');
const https = require('https');
const stream = require('stream');
const EventEmitter = require('events');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));

function database() {
    const records = {users: [], allocations: [], contributions: [], memos: [], counters: []};
    const queries = [];
    let sequence = 100;
    function matches(doc, query) {
        return Object.keys(query || {}).every(key => {
            const value = query[key];
            if (key === '$where') {
                // Never execute database JavaScript. These tests inspect it as data.
                const id = /this\.userId\s*==\s*(\d+)/.exec(value);
                return id ? doc.userId === Number(id[1]) : false;
            }
            if (key === '$and') return value.every(q => matches(doc, q));
            if (value && typeof value === 'object') {
                return Object.keys(value).every(op => {
                    if (op === '$ne') return doc[key] !== value[op];
                    if (op === '$gt') return doc[key] > value[op];
                    if (op === '$gte') return doc[key] >= value[op];
                    if (op === '$eq') return doc[key] === value[op];
                    throw new Error('Unsupported fixture query operator: ' + op);
                });
            }
            return doc[key] === value;
        });
    }
    const db = {
        records, queries,
        close: cb => { if (cb) cb(); },
        dropCollection: (name, cb) => { records[name] = []; cb(null, true); },
        collection(name) {
            if (!records[name]) records[name] = [];
            const col = {
                find(query) {
                    queries.push({collection: name, query: copy(query)});
                    const cursor = {
                        sort() { return cursor; },
                        toArray(cb) { cb(null, copy(records[name].filter(d => matches(d, query)))); }
                    };
                    return cursor;
                },
                findOne(query, cb) {
                    queries.push({collection: name, query: copy(query)});
                    cb(null, copy(records[name].find(d => matches(d, query))) || null);
                },
                insert(value, cb) {
                    const docs = Array.isArray(value) ? value : [value];
                    records[name].push(...copy(docs));
                    cb(null, {ops: copy(docs), insertedCount: docs.length});
                },
                insertMany(value, cb) { col.insert(value, cb); },
                insertOne(value, cb) { col.insert(value, cb); },
                update(query, change, options, cb) {
                    if (typeof options === 'function') { cb = options; options = {}; }
                    let doc = records[name].find(d => matches(d, query));
                    if (!doc && options && options.upsert) {
                        doc = copy(query); records[name].push(doc);
                    }
                    if (doc) {
                        if (change.$set) Object.assign(doc, copy(change.$set));
                        else { Object.keys(doc).forEach(k => delete doc[k]); Object.assign(doc, copy(change)); }
                    }
                    cb(null, {matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0});
                },
                updateOne(query, change, options, cb) { col.update(query, change, options, cb); },
                findAndModify(query, sort, change, options, cb) {
                    cb(null, {value: {seq: ++sequence}});
                }
            };
            return col;
        }
    };
    return db;
}

module.exports = async function harness() {
    const db = database();
    const mongodb = require('mongodb');
    mongodb.MongoClient.connect = function(uri, options, callback) {
        const cb = typeof options === 'function' ? options : callback;
        if (cb) cb(null, db);
        else return Promise.resolve(db);
    };
    const listeners = [];
    for (const pair of [[http, false], [https, true]]) {
        pair[0].createServer = function() {
            const app = Array.from(arguments).find(arg => typeof arg === 'function');
            const server = new EventEmitter();
            server.listen = function(port, cb) {
                listeners.push({app, secure: pair[1]});
                if (cb) cb();
                return server;
            };
            server.close = cb => { if (cb) cb(); };
            return server;
        };
    }
    // A deterministic transport boundary for research: no DNS or sockets are used.
    const outgoing = [];
    let remoteBody = '<p>research marker</p>';
    for (const transport of [http, https]) {
        transport.request = function(options, callback) {
            outgoing.push(copy(typeof options === 'string' ? {url: options} : options));
            const request = new EventEmitter();
            request.setTimeout = () => request;
            request.setHeader = () => {};
            request.getHeader = () => undefined;
            request.write = () => true;
            request.abort = request.destroy = () => {};
            request.end = () => process.nextTick(() => {
                const response = new stream.PassThrough();
                response.statusCode = 200;
                response.headers = {'content-type': 'text/html'};
                response.rawHeaders = ['Content-Type', 'text/html'];
                if (callback) callback(response);
                request.emit('response', response);
                response.end(remoteBody);
            });
            return request;
        };
        transport.get = function(options, callback) {
            const req = transport.request(options, callback); req.end(); return req;
        };
    }
    require(path.join(root, 'server.js'));
    const started = listeners.find(l => l.app);
    if (!started) throw new Error('Application did not register a server listener');

    function client() {
        const cookies = {};
        const sameSite = {};
        async function request(method, url, body, extraHeaders, secure = true) {
            const encoded = body ? require('querystring').stringify(body) : '';
            const socket = new stream.Duplex({read() {}, write(chunk, encoding, cb) { cb(); }});
            socket.encrypted = secure;
            socket.remoteAddress = '192.0.2.10';
            const req = new http.IncomingMessage(socket);
            req.method = method; req.url = url;
            req.httpVersion = '1.1'; req.httpVersionMajor = 1; req.httpVersionMinor = 1;
            req.headers = Object.assign({host: 'nodegoat.test', cookie: Object.keys(cookies).filter(k => !(extraHeaders && extraHeaders.origin && extraHeaders.origin !== 'https://nodegoat.test' && /^(strict|lax)$/i.test(sameSite[k] || '') && method === 'POST')).map(k => k + '=' + cookies[k]).join('; ')}, extraHeaders);
            if (body) {
                req.headers['content-type'] = 'application/x-www-form-urlencoded';
                req.headers['content-length'] = Buffer.byteLength(encoded);
            }
            const res = new http.ServerResponse(req);
            const chunks = [];
            // Capture the response at Node's HTTP boundary, leaving Express rendering intact.
            const write = res.write.bind(res), end = res.end.bind(res);
            res.write = function(chunk, encoding, cb) {
                if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined));
                return write(chunk, encoding, cb);
            };
            res.end = function(chunk, encoding, cb) {
                if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined));
                return end(chunk, encoding, cb);
            };
            res.assignSocket(socket);
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Request did not finish: ' + url)), 10000);
                res.on('finish', () => {
                    clearTimeout(timer);
                    const headers = res.getHeaders();
                    [].concat(headers['set-cookie'] || []).forEach(cookie => {
                        const [name, ...value] = cookie.split(';')[0].split('='); cookies[name] = value.join('=');
                        const policy = /;\s*SameSite=([^;]+)/i.exec(cookie);
                        sameSite[name] = policy ? policy[1] : '';
                    });
                    resolve({status: res.statusCode, headers, body: Buffer.concat(chunks).toString()});
                });
                started.app(req, res);
                if (encoded) req.push(encoded);
                req.push(null);
            });
        }
        async function form(url, body, options) {
            const page = await request('GET', url);
            const token = /name=["']_csrf["'][^>]*value=["']([^"']*)/.exec(page.body);
            const headers = {origin: 'https://nodegoat.test', referer: 'https://nodegoat.test' + url};
            return request('POST', url, Object.assign({}, body, token && token[1] ? {_csrf: token[1]} : {}), Object.assign(headers, options));
        }
        return {request, form};
    }
    async function user(name, admin) {
        const dao = new (require(path.join(root, 'app/data/user-dao')).UserDAO)(db);
        const password = 'Regression_92!';
        const record = await new Promise((resolve, reject) => dao.addUser(name, 'First' + name, 'Last' + name, password, '', (err, doc) => err ? reject(err) : resolve(doc)));
        if (admin) db.records.users.find(u => u._id === record._id).isAdmin = true;
        const browser = client();
        const login = await browser.form('/login', {userName: name, password});
        if (login.status !== 302) throw new Error('Fixture login failed: ' + login.status);
        return {id: record._id, browser, password, login};
    }
    return {db, client, user, listeners, outgoing, remote(body) { remoteBody = body; }};
};

module.exports.database = database;
