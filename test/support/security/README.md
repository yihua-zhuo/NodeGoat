These regressions run under the repository's Mocha unit target (`test/unit/*.js`).
Run all with `./node_modules/.bin/mocha --timeout 30000 'test/unit/*.js'`, or pass
one test file to run just that finding. The sandbox invokes Mocha directly because
Grunt enables `force`, which can hide a failed test behind a successful exit code.
Node 16.20.2 includes npm 8, matching the version-2 lockfile. Cypress installation
is disabled because these offline unit regressions do not need a browser binary.

Every scenario runs in a fresh child process. The real server, routes, middleware,
templates and DAOs run unchanged. A MongoDB-driver boundary supplies an in-memory
fixture; Node listening sockets are captured and requests use real IncomingMessage
and ServerResponse objects over an in-memory Duplex stream. Research tests replace
the external HTTP client boundary with an inert response. No actual sockets are
opened. The fixture intentionally never executes MongoDB `$where` code; the query
injection check instead observes whether untrusted text reaches the code field.

The child output is captured normally, never by replacing console or stdout.
Exceptions are reported separately from assertion failures. The routing-complexity
case measures the elapsed time of completed validation in a disposable process.
Its process timeout is only a resource backstop and is never converted into a
security assertion. Only test code sets the global boolean marker used to detect
expression execution.

The request fixture queues the complete body and marks IncomingMessage.complete
before sending EOF, matching the HTTP parser's message-complete callback. Without
that flag Node can abort the socket after body parsing and before an asynchronous
session save or render finishes. The standalone security-harness-lifecycle.js unit
test covers consuming a POST body, delayed response completion, and cookie reuse.

The initial platform run exposed the incomplete-request fixture bug described
above. The revised lifecycle and security tests have not been executed in the
authoring workspace; execution is left to the platform as requested.
