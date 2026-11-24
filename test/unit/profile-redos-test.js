/* global describe, it */
"use strict";

const assert = require("assert");
const ProfileHandler = require("../../app/routes/profile");

describe("profile routing number validation", function() {
    it("rejects a short near-match without stalling request handling", function() {
        const handler = new ProfileHandler({
            collection: function() {
                return {
                    update: function(query, update, callback) {
                        callback(null);
                    }
                };
            }
        });
        const request = {
            session: {
                userId: 1
            },
            body: {
                firstName: "Current",
                lastName: "Owner",
                ssn: "",
                dob: "",
                address: "",
                bankAcc: "",
                bankRouting: "111111111111111111111111x"
            }
        };
        const response = {
            render: function() {}
        };
        const started = Date.now();

        handler.handleProfileUpdate(request, response, function(error) {
            throw error;
        });

        const elapsed = Date.now() - started;
        assert(
            elapsed < 150,
            "profile validation must finish promptly for a short malformed routing number"
        );
    });
});
