/* global describe, it, before, after */
"use strict";

const assert = require("assert");
const http = require("http");
const MongoClient = require("mongodb").MongoClient;

let server;
let originalConnect;
let originalCreateServer;

const fakeDb = {
    collection: function() {
        return {
            findOne: function(query, callback) {
                callback(null, null);
            }
        };
    }
};

describe("failed login output encoding", function() {
    before(function(done) {
        this.timeout(5000);
        originalConnect = MongoClient.connect;
        originalCreateServer = http.createServer;

        MongoClient.connect = function(uri, callback) {
            callback(null, fakeDb);
        };

        http.createServer = function(handler) {
            server = originalCreateServer.call(http, handler);
            const originalListen = server.listen;
            server.listen = function(port) {
                const args = Array.prototype.slice.call(arguments, 1);
                args.unshift(0);
                return originalListen.apply(server, args);
            };
            return server;
        };

        require("../../server");
        server.once("listening", done);
    });

    after(function(done) {
        const restoreBoundaries = function() {
            MongoClient.connect = originalConnect;
            http.createServer = originalCreateServer;
            done();
        };

        if (server && server.listening) {
            server.close(restoreBoundaries);
        } else {
            restoreBoundaries();
        }
    });

    it("escapes a submitted username in the failed-login HTML", function(done) {
        const attackInput = "\"><b>LOGIN-MARKER</b>";
        const form = "userName=" + encodeURIComponent(attackInput) + "&password=invalid";
        let body = "";
        const request = http.request({
            hostname: "127.0.0.1",
            port: server.address().port,
            path: "/login",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(form)
            }
        }, function(response) {
            response.setEncoding("utf8");
            response.on("data", function(chunk) {
                body += chunk;
            });
            response.on("end", function() {
                try {
                    assert.notStrictEqual(
                        body.indexOf('id="userName"'),
                        -1,
                        "failed login should return the login form"
                    );
                    assert.strictEqual(
                        body.indexOf(attackInput),
                        -1,
                        "login response must HTML-escape submitted usernames"
                    );
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });

        request.on("error", done);
        request.end(form);
    });
});
