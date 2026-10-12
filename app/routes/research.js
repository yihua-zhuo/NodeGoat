const ResearchDAO = require("../data/research-dao").ResearchDAO;
const needle = require("needle");
const {
    environmentalScripts
} = require("../../config/config");

function ResearchHandler(db) {
    "use strict";

    const researchDAO = new ResearchDAO(db);

    this.displayResearch = (req, res) => {

        if (req.query.symbol) {
            if (typeof req.query.symbol !== "string" || !/^[A-Za-z0-9.^-]{1,20}$/.test(req.query.symbol) ||
                (req.query.url && req.query.url !== "https://finance.yahoo.com/quote/")) {
                return res.status(400).send("Invalid research request");
            }
            const url = "https://finance.yahoo.com/quote/" + encodeURIComponent(req.query.symbol);
            return needle.get(url, { follow_max: 0, open_timeout: 5000, read_timeout: 5000 }, (error, response, body) => {
                if (error || response.statusCode !== 200) return res.status(502).send("Research unavailable");
                res.setHeader("X-Content-Type-Options", "nosniff");
                return res.type("text/plain").send(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
            });
        }

        return res.render("research", {
            environmentalScripts
        });
    };

}

module.exports = ResearchHandler;
