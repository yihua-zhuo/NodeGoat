/* The ProfileDAO must be constructed with a connected database object */
function ProfileDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof ProfileDAO)) {
        console.log("Warning: ProfileDAO constructor called without 'new' operator");
        return new ProfileDAO(db);
    }

    const users = db.collection("users");

    const crypto = require("crypto");
    const configuredKey = require("../../config/config").cryptoKey;
    const key = configuredKey ? Buffer.from(configuredKey, "hex") : null;
    if (configuredKey && !/^[0-9a-f]{64}$/i.test(configuredKey)) throw new Error("PROFILE_ENCRYPTION_KEY must contain 64 hexadecimal characters");
    const sensitiveFields = ["ssn", "dob", "address", "bankAcc", "bankRouting"];
    const encrypt = value => {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
        const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
        return { iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex"), ciphertext: ciphertext.toString("hex") };
    };
    const decrypt = value => {
        if (!key || !value || typeof value !== "object") return "";
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "hex"));
        decipher.setAuthTag(Buffer.from(value.tag, "hex"));
        return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "hex")), decipher.final()]).toString("utf8");
    };

    this.updateUser = (userId, firstName, lastName, ssn, dob, address, bankAcc, bankRouting, callback) => {

        // Create user document
        const user = {};
        if (firstName) {
            user.firstName = firstName;
        }
        if (lastName) {
            user.lastName = lastName;
        }
        if (address) {
            user.address = address;
        }
        if (bankAcc) {
            user.bankAcc = bankAcc;
        }
        if (bankRouting) {
            user.bankRouting = bankRouting;
        }
        if (ssn) {
            user.ssn = ssn;
        }
        if (dob) {
            user.dob = dob;
        }
        const storedUser = { ...user };
        // Without an external encryption key, do not retain sensitive profile data.
        sensitiveFields.forEach(field => {
            if (storedUser[field]) storedUser[field] = key ? encrypt(storedUser[field]) : "";
        });

        users.update({
                _id: parseInt(userId)
            }, {
                $set: storedUser
            },
            err => {
                if (!err) {
                    console.log("Updated user profile");
                    return callback(null, user);
                }

                return callback(err, null);
            }
        );
    };

    this.getByUserId = (userId, callback) => {
        users.findOne({
                _id: parseInt(userId)
            },
            (err, user) => {
                if (err) return callback(err, null);
                try {
                    if (user) sensitiveFields.forEach(field => { user[field] = decrypt(user[field]); });
                } catch (error) {
                    return callback(error, null);
                }

                callback(null, user);
            }
        );
    };
}

module.exports = { ProfileDAO };
