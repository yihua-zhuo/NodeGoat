/* global describe, it */
"use strict";

const assert = require("assert");
const http = require("http");
const ResearchHandler = require("../../app/routes/research");

describe("research destination security", function() {
    it("does not fetch a caller-selected local destination", function(done) {
        let requestCount = 0;
        let finished = false;
        const stubServer = http.createServer(function(request, response) {
            requestCount += 1;
            response.end("in-process response");
        });

        const finish = function(error) {
            if (finished) return;
            finished = true;
            stubServer.close(function() {
                done(error);
            });
        };

        stubServer.listen(0, "127.0.0.1", function() {
            const handler = new ResearchHandler({});
            const response = {
                statusCode: 200,
                writeHead: function(statusCode) {
                    this.statusCode = statusCode;
                },
                write: function() {},
                end: function() {
                    try {
                        assert.strictEqual(
                            requestCount,
                            0,
                            "research route must reject caller-selected destinations"
                        );
                        finish();
                    } catch (error) {
                        finish(error);
                    }
                },
                status: function(statusCode) {
                    this.statusCode = statusCode;
                    return this;
                },
                send: function() {
                    finish();
                },
                redirect: function() {
                    finish();
                },
                render: function() {
                    finish();
                }
            };

            try {
                handler.displayResearch({
                    query: {
                        url: "http://127.0.0.1:" + stubServer.address().port + "/",
                        symbol: "AAPL"
                    },
                    session: {
                        userId: 1
                    }
                }, response);
            } catch (error) {
                finish(error);
            }
        });

        stubServer.on("error", finish);
    });
});
