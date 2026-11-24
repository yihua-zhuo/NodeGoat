/* global describe, it */
"use strict";

const assert = require("assert");
const AllocationsHandler = require("../../app/routes/allocations");

const users = [
    {
        _id: 1,
        userName: "currentUser",
        firstName: "Current",
        lastName: "Owner"
    },
    {
        _id: 2,
        userName: "otherUser",
        firstName: "Other",
        lastName: "Owner"
    }
];

const allocations = [
    {
        userId: 1,
        stocks: 20,
        funds: 30,
        bonds: 50
    },
    {
        userId: 2,
        stocks: 60,
        funds: 25,
        bonds: 15
    }
];

const db = {
    collection: function(name) {
        if (name === "allocations") {
            return {
                find: function(criteria) {
                    return {
                        toArray: function(callback) {
                            const matches = allocations.filter(function(allocation) {
                                return allocation.userId === criteria.userId;
                            }).map(function(allocation) {
                                return Object.assign({}, allocation);
                            });
                            callback(null, matches);
                        }
                    };
                }
            };
        }

        return {
            findOne: function(criteria, callback) {
                const user = users.filter(function(candidate) {
                    return candidate._id === criteria._id;
                })[0];
                callback(null, user || null);
            }
        };
    }
};

describe("allocation ownership security", function() {
    it("does not show another user's allocation when the URL names their ID", function() {
        const handler = new AllocationsHandler(db);
        let renderedOptions;
        const response = {
            render: function(view, options) {
                renderedOptions = options;
            },
            status: function() {
                return this;
            },
            send: function() {},
            redirect: function() {}
        };

        handler.displayAllocations({
            params: {
                userId: "2"
            },
            query: {},
            session: {
                userId: 1
            }
        }, response, function(error) {
            throw error;
        });

        const responseAllocations = renderedOptions && renderedOptions.allocations || [];
        const includesOtherOwner = responseAllocations.some(function(allocation) {
            return allocation.userId !== 1 || allocation.userName === "otherUser";
        });

        assert.strictEqual(
            includesOtherOwner,
            false,
            "allocation response must not include records owned by another user"
        );
    });
});
