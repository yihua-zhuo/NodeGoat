'use strict';
// External boundaries only: MongoDB and listening sockets. Application modules are untouched.
const http = require('http');
const net = require('net');
const stream = require('stream');
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
function database() {
    const tables = {}, queries = [];
    let sequence = 10;
    function matches(row, query) {
        return Object.keys(query || {}).every(key => {
            const value = query[key];
            if (key === '$where') return true; // Observed as code, never executed by this fixture.
            if (key === '$and') return value.every(q => matches(row, q));
            if (value && typeof value === 'object') {
                return Object.keys(value).every(op => ({
                    $ne: () => row[key] !== value[op], $gt: () => row[key] > value[op],
                    $gte: () => row[key] >= value[op], $eq: () => row[key] === value[op],
                    $in: () => value[op].includes(row[key])
                }[op] || (() => false))());
            }
            return row[key] === value;
        });
    }
    const db = {
        tables, queries,
        collection(name) {
            if (!tables[name]) tables[name] = [];
            function insert(docs, options, callback) {
                if (typeof options === 'function') callback = options;
                docs = Array.isArray(docs) ? docs : [docs];
                tables[name].push(...clone(docs));
                const result = {ops: clone(docs), insertedCount: docs.length};
                if (callback) callback(null, result);
                return Promise.resolve(result);
            }
            function update(query, change, options, callback) {
                if (typeof options === 'function') { callback = options; options = {}; }
                let rows = tables[name].filter(row => matches(row, query));
                if (!rows.length && options && options.upsert) {
                    const row = clone(query); tables[name].push(row); rows = [row];
                }
                rows.forEach(row => Object.assign(row, clone(change.$set || change)));
                const result = {matchedCount: rows.length, modifiedCount: rows.length};
                if (callback) callback(null, result);
                return Promise.resolve(result);
            }
            return {
                insert, insertOne: insert, insertMany: insert, update, updateOne: update,
                findOne(query, options, callback) {
                    if (typeof options === 'function') callback = options;
                    const row = clone(tables[name].find(row => matches(row, query))) || null;
                    if (callback) callback(null, row);
                    return Promise.resolve(row);
                },
                find(query) {
                    queries.push({collection: name, query: clone(query)});
                    const rows = clone(tables[name].filter(row => matches(row, query)));
                    const cursor = {sort() { return cursor; }, toArray(callback) {
                        if (callback) callback(null, rows);
                        return Promise.resolve(rows);
                    }};
                    return cursor;
                },
                findAndModify(query, sort, update, options, callback) {
                    callback(null, {value: {seq: ++sequence}});
                }
            };
        },
        dropCollection(name, callback) { tables[name] = []; callback(null, true); },
        close(callback) { if (callback) callback(); }
    };
    return db;
}
function boot(db) {
    require('mongodb').MongoClient.connect = function(uri, options, callback) {
        if (typeof options === 'function') callback = options;
        if (callback) callback(null, db);
        return Promise.resolve(db);
    };
    let app, secureOnly = false;
    net.Server.prototype.listen = function() {
        if (this.listeners('request').length) {
            app = this.listeners('request')[0];
            secureOnly = this instanceof require('https').Server;
        }
        const callback = arguments[arguments.length - 1];
        if (typeof callback === 'function') callback();
        return this;
    };
    require('../../../server');
    const getApp = () => app;
    getApp.secureOnly = () => secureOnly;
    return getApp;
}
function client(getApp) {
    let cookie = '';
    async function request(method, url, body, options = {}) {
        if (options.secure === false && getApp.secureOnly && getApp.secureOnly()) {
            return {status: 400, headers: {}, body: ''}; // TLS listeners refuse plaintext before HTTP dispatch.
        }
        return new Promise((resolve, reject) => {
            const socket = new stream.Duplex({read() {}, write(chunk, encoding, callback) { callback(); }});
            socket.encrypted = options.secure !== false;
            socket.remoteAddress = '192.0.2.10';
            const req = new http.IncomingMessage(socket);
            req.method = method; req.url = url; req.httpVersion = '1.1';
            req.httpVersionMajor = 1; req.httpVersionMinor = 1;
            req.headers = {host: 'nodegoat.test', cookie, ...options.headers};
            let data = '';
            if (body) {
                data = new URLSearchParams(body).toString();
                req.headers['content-type'] = 'application/x-www-form-urlencoded';
                req.headers['content-length'] = Buffer.byteLength(data);
            }
            const res = new http.ServerResponse(req);
            res.assignSocket(socket);
            const chunks = [];
            const write = res.write, end = res.end;
            res.write = function(chunk) { if (chunk) chunks.push(Buffer.from(chunk)); return write.apply(this, arguments); };
            res.end = function(chunk) { if (chunk) chunks.push(Buffer.from(chunk)); return end.apply(this, arguments); };
            res.on('finish', () => {
                const headers = res.getHeaders();
                if (headers['set-cookie']) cookie = headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
                resolve({status: res.statusCode, headers, body: Buffer.concat(chunks).toString()});
                socket.destroy();
            });
            res.on('error', reject);
            req.on('error', reject);
            socket.on('error', reject);
            // Model the HTTP parser's message-complete callback: all body bytes
            // have arrived before EOF. IncomingMessage auto-destroys after its
            // readable side ends; without complete=true Node treats that as an
            // aborted request and destroys the socket before asynchronous
            // session saving or template rendering can finish the response.
            if (data) req.push(data);
            req.complete = true;
            req.push(null);
            getApp()(req, res);
        });
    }
    return {request, async post(url, body, options) {
        const page = await request('GET', url);
        const token = page.body.match(/name=["'](?:_csrf|csrfToken)["'][^>]*value=["']([^"']+)/);
        return request('POST', url, {...body, ...(token ? {_csrf: token[1]} : {})}, options);
    }};
}
async function addUser(db, name, admin) {
    const DAO = require('../../../app/data/user-dao').UserDAO;
    const user = await new Promise((resolve, reject) => new DAO(db).addUser(
        name, name + 'First', 'Last', 'ValidPass9!x', name + '@example.test',
        (error, value) => error ? reject(error) : resolve(value)));
    const stored = db.tables.users.find(row => row._id === user._id);
    stored.isAdmin = !!admin;
    stored.website = 'https://example.test/';
    db.collection('allocations');
    db.tables.allocations.push({userId: user._id, stocks: 40, funds: 30, bonds: 30});
    return user;
}
async function login(browser, name) {
    return browser.post('/login', {userName: name, password: 'ValidPass9!x'});
}
module.exports = {database, boot, client, addUser, login};
