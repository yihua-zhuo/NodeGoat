"use strict";

var assert = require("assert");
var http = require("http");
var path = require("path");
var querystring = require("querystring");
var test = require("mocha");
var express = require("express");
var bodyParser = require("body-parser");
var session = require("express-session");
var consolidate = require("consolidate");
var routes = require("../../app/routes");

// Stand in for MongoDB at the database-client boundary, leaving the DAOs intact.
function memoryDatabase() {
    var documents = {
        users: [{
            _id: 1,
            userName: "contributionUser",
            password: "User1_123",
            firstName: "Test",
            lastName: "User",
            isAdmin: false
        }],
        contributions: []
    };

    function matches(document, query) {
        return Object.keys(query).every(function(key) {
            return document[key] === query[key];
        });
    }

    return {
        documents: documents,
        collection: function(name) {
            var rows = documents[name] || (documents[name] = []);
            return {
                findOne: function(query, callback) {
                    var found = rows.find(function(row) {
                        return matches(row, query);
                    });
                    callback(null, found ? Object.assign({}, found) : null);
                },
                update: function(query, document, options, callback) {
                    var index = rows.findIndex(function(row) {
                        return matches(row, query);
                    });
                    if (index === -1) {
                        rows.push(Object.assign({}, document));
                    } else {
                        rows[index] = Object.assign({}, document);
                    }
                    callback(null, {n: 1});
                }
            };
        }
    };
}

function post(server, route, fields, cookie) {
    return new Promise(function(resolve, reject) {
        var body = querystring.stringify(fields);
        var headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(body)
        };
        if (cookie) headers.Cookie = cookie;
        var request = http.request({
            hostname: "127.0.0.1",
            port: server.address().port,
            path: route,
            method: "POST",
            headers: headers,
            agent: false
        }, function(response) {
            response.resume();
            response.on("error", reject);
            response.on("end", function() {
                resolve(response);
            });
        });
        request.on("error", reject);
        request.end(body);
    });
}

test.describe("Contribution fields must remain data", function() {
    var server;
    var db;
    var cookie;

    test.beforeEach(function(done) {
        db = memoryDatabase();
        global.contributionSecurityMarker = "unchanged";
        var app = express();
        app.use(bodyParser.urlencoded({extended: false}));
        app.use(session({
            secret: "contribution-regression-test",
            resave: false,
            saveUninitialized: false
        }));
        app.engine("html", consolidate.swig);
        app.set("view engine", "html");
        app.set("views", path.resolve(__dirname, "../../app/views"));
        routes(app, db);
        server = http.createServer(app);
        server.listen(0, "127.0.0.1", done);
    });

    test.afterEach(function(done) {
        delete global.contributionSecurityMarker;
        server.close(done);
    });

    ["preTax", "afterTax", "roth"].forEach(function(field) {
        test.it("must not execute JavaScript supplied in " + field, function() {
            return post(server, "/login", {
                userName: "contributionUser",
                password: "User1_123"
            }).then(function(response) {
                assert.strictEqual(response.headers.location, "/dashboard", "ordinary user must be logged in");
                cookie = (response.headers["set-cookie"] || []).map(function(value) {
                    return value.split(";")[0];
                }).join("; ");
                return post(server, "/contributions", {preTax: "0", afterTax: "0", roth: "0"}, cookie);
            }).then(function(response) {
                assert.strictEqual(response.statusCode, 200, "ordinary numeric contributions must be accepted");
                var saved = db.documents.contributions[0] || {};
                assert.deepEqual([saved.preTax, saved.afterTax, saved.roth], [0, 0, 0],
                    "ordinary numeric contributions must be saved");

                // Only changes a test-owned marker in this process and evaluates to zero.
                var fields = {preTax: "0", afterTax: "0", roth: "0"};
                fields[field] = "(global.contributionSecurityMarker = 'executed', 0)";
                return post(server, "/contributions", fields, cookie);
            }).then(function() {
                assert.strictEqual(global.contributionSecurityMarker, "unchanged",
                    field + " must not execute contribution input");
            });
        });
    });
});
