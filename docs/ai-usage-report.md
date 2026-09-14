# AI usage and verification

Codex helped interpret the linked draft homework, draft the product spec and OpenAPI contract, implement the React/Express app, and write integration tests. The assignment's draft status was checked against the live course form after implementation began; the live form was found to ask different questions.

Verification completed locally: `npm test` passed, `npm run build` passed, and the UI was opened in a browser. Two browser tabs showed synchronized edits; JavaScript and Python both produced the expected “Hello, world!” output. Docker packaging and public deployment have not been verified.

Known limitations: edits replace the full document, so concurrent keystrokes can conflict; there is no authentication; browser workers keep code off the server but do not provide a hardened sandbox for hostile code.
