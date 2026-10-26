"use strict";

var assert = require("assert");

describe("ZAP API credential configuration", function() {
    ["development", "test"].forEach(function(environment) {
        it(environment + " must not supply a default privileged API credential", function() {
            var savedEnvironment = {};
            Object.keys(process.env).forEach(function(name) {
                if (/zap/i.test(name)) {
                    savedEnvironment[name] = process.env[name];
                    delete process.env[name];
                }
            });

            try {
                var config;
                try {
                    config = require("../../config/env/" + environment);
                } catch (error) {
                    // Rejecting a missing credential at configuration load is also secure.
                    assert.ok(
                        /zap/i.test(error.message) &&
                        /key|credential|secret/i.test(error.message) &&
                        /missing|required|not set|must.*set|must.*provid/i.test(error.message),
                        "Configuration must load without a default ZAP key or explicitly reject a missing ZAP credential"
                    );
                    return;
                }

                assert.ok(!config.zapApiKey,
                    environment + " must not supply a default ZAP API credential when none is provided at runtime");
            } finally {
                Object.keys(savedEnvironment).forEach(function(name) {
                    process.env[name] = savedEnvironment[name];
                });
            }
        });
    });
});
