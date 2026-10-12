// default app configuration
const port = process.env.PORT || 4000;
let db = process.env.MONGODB_URI || "mongodb://localhost:27017/nodegoat";

module.exports = {
    port,
    db,
    cookieSecret: process.env.SESSION_SECRET || require("crypto").randomBytes(32).toString("hex"),
    cryptoKey: process.env.PROFILE_ENCRYPTION_KEY,
    cryptoAlgo: "aes256",
    hostName: "localhost",
    environmentalScripts: []
};

