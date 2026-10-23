# Verification record — initial experimental source publication

## Source identity

`plugin.js` is byte-for-byte identical to the existing local plugin inspected for this publication:

```text
SHA-256 b55c4766e76db951335d38a2ca4f1d7f663ea8b3d022c2c61236867faa3bb646
```

This identifies a source snapshot; it is not proof of safety. No live installation, reload, enablement, dependency installation, or production-code change was performed for publication.

## Executed checks

On Windows with existing Node.js v26.7.0:

```sh
node --check plugin.js
node --test tests/plugin.test.mjs
```

- Syntax check: passed.
- Characterization tests: **6 passed, 0 failed, 4 TODO**; exit code 0.
- The parent publisher reran the tests independently of their test author.

The six completed tests cover:

1. Only internal-selector matching elements receive `spellcheck=true` (including a matching non-editable element; no stronger scope guarantee is implied).
2. Original false, absent and true spellcheck attributes are restored for tracked connected elements.
3. The actual mutation callback processes added roots/descendants and attribute records, leaving unrelated fields unchanged.
4. Context-menu processing targets the editable ancestor, replaces a pending timer and removes its hit-test attribute when the timer fires.
5. Disposal disconnects the observer, removes the style, cancels hit-test timers and invokes bridge unsubscribe. Listener cleanup is the simulated managed-context contract, not proof of the real SDK.
6. **Known limitation:** detached editors forgotten by the observer retain their mutated spellcheck attribute. This test documents existing behavior, not desirable behavior or a fixed bug.

## Four explicit TODOs — not passes

- Actual Electron native suggestion replacement and synchronization with draft state.
- Saved-range safety after selection/document changes.
- Menu cancellation and saved-selection invalidation.
- Session-switch safety and stale editor/range restoration.

Node may print a checkmark next to an unimplemented TODO. The reported totals above deliberately keep TODOs separate from passed tests.

## Test model limits

The suite imports the actual ESM plugin but supplies a minimal DOM, MutationObserver, plugin-context lifecycle and manual timer model. It does not run a browser, Electron, a dictionary, real event propagation, layout/hit-testing, an actual DOMRange, or the Hermes plugin loader. Globals are restored after each test. It installs no packages and makes no network calls.

A previous Windows tutorial demonstrated a real correction with the local plugin. That historical observation is not rerun here and does not fill these gaps. No fresh native UI QA, cross-platform execution, SDK-compliance pass, catalog validation pass or production-readiness claim is made.

## Publication versus installation

Independent publication review checks the exact repository payload for secrets, unintended executables, misleading claims and whether limitations are visible. It does not waive the unresolved issues in `SECURITY.md`, approve installation, or make this plugin eligible for the current catalog. A safer SDK-based successor needs its own tests and review.
