Security regression harness
===========================

Run one case with `node node_modules/mocha/bin/_mocha test/unit/security-NN-topic.js`.
Run the complete offline unit suite with `node node_modules/mocha/bin/_mocha test/unit/*.js`.
This is the same unit-test glob used by the repository's `npm test` Grunt task,
without Grunt's force option (which can hide failures). The separate legacy
Selenium/ZAP and Cypress suites require live external services and are not offline suites.

Each case executes unchanged server.js and application modules in a fresh child
process. The MongoDB driver, Node HTTP server/transport, and in-memory HTTP
request/response objects are the substituted boundaries. No real listener,
DNS lookup, database service, or outbound connection is needed. Fixtures are
created through the public account DAO, with role and allocation fixtures at
the database boundary. Session cookies and CSRF form tokens are obtained through
actual Express responses; no application method is patched.

The parent Mocha process keeps its original console and output streams. Child
stdout/stderr are captured for log assertions. The database-reset subprocess
reports its fixture state separately from the logs being tested. MongoDB
JavaScript is never executed by the database double. Contribution input only
assigns a marker within the disposable child. HTML probes use inert attributes,
tags, or a script-scheme link containing only a void expression, never an
executable browser or external side effect.

The routing performance case is isolated and bounded by the parent's watchdog.
The 250ms budget includes rendering a short invalid profile submission after a
warm-up. Its short near-match takes substantially longer in the vulnerable regex.

Node 18.12.1 supplies npm 8, matching lockfileVersion 2. Setup suppresses Cypress
binary installation because these offline tests use the declared Mocha runner.
No dependency manifest or lockfile changes are required.
