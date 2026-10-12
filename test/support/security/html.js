'use strict';
// Tokenize start-tag attributes without mistaking text inside a quoted value
// (including escaped quotes) for a newly injected attribute.
function attributes(html) {
    const result = [];
    const tags = html.match(/<[a-z][a-z0-9:-]*(?:[^>"']|"[^"]*"|'[^']*')*>/gi) || [];
    for (const tag of tags) {
        const content = tag.replace(/^<[a-z][a-z0-9:-]*/i, '').replace(/\/?\s*>$/, '');
        const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
        let match;
        while ((match = re.exec(content))) {
            result.push({name: match[1].toLowerCase(), value: match[2] || match[3] || match[4] || ''});
        }
    }
    return result;
}
exports.hasMarkerAttribute = html => attributes(html).some(a => a.name === 'data-regression');
exports.hasActiveMarker = html => attributes(html).some(a =>
    (/^on/.test(a.name) && /void\s*\(0\)/.test(a.value)) ||
    (['href', 'src', 'action'].includes(a.name) && /^javascript:\s*(?:this;)?void/i.test(a.value))
);
