# Security and compatibility notes

## Publication scope

This repository publishes an existing local JavaScript workaround for inspection and reproducibility. Publication approval is not installation approval. The code is not sandboxed by the desktop loader and should not be treated as production-ready.

## Known unresolved issues

- **Saved selection can become stale.** A range is retained from a private spelling payload and restored on a later focus event. The implementation does not comprehensively invalidate it after draft mutation, cancellation, session change, editor removal, or a later unrelated payload. This can move the caret/select unintended text; subsequent typing could replace that selection. Range operations can also throw on invalid state. This is not claimed fixed or covered by native QA.
- **Private app interfaces.** The selector and `window.hermesDesktop.onContextMenuSpellcheck` are internal details, not stable plugin SDK contracts. A Hermes update can break them.
- **Broad observation.** A body-subtree MutationObserver and document/window listeners inspect changes beyond one composer, even though spelling mutation is filtered by the internal composer selector. This is not compatible with the current catalog's SDK-only policy.
- **Fixed timing.** The 250 ms hit-test override is a timing workaround. Modal menus, latency, accessibility tools and platform differences may invalidate the assumption.
- **Activation is immediate.** `defaultEnabled: true` is retained from the original local file. A watched-folder copy is not passive storage; do not stage reviews in an auto-loaded plugin directory.
- **Restoration scope is limited.** Attribute restoration applies to tracked connected editors. It does not prove recovery of unsaved application state or native spelling/selection state. Existing unrelated values of the plugin-specific hit-test attribute are not a supported coexistence contract.

These are reasons to withhold installation recommendation and catalog submission, not reasons to hide the source behind a different package label.

## Data and privileges

The plugin has renderer authority. It reads the selected word/range and native spelling payload in memory. The source contains no network client, remote code loading, credential reads, shell subprocesses, telemetry, auto-update, or persistent storage writes. Electron's native dictionary downloads and Hermes/gateway transport are separate behaviors.

Do not capture real messages, clipboard dumps, authentication screens or account data while testing. Use only synthetic unsent drafts and explicitly approved evidence storage. Never submit a test message or modify the chat hosting an automated test.

## Conditions for a safer successor

1. Replace private DOM/bridge access and the body observer with supported, released composer APIs. Do not disguise private access to evade a scanner.
2. Avoid saved-range replay; use host-owned validated current-target replacement and explicit cancellation/session lifecycle semantics.
3. Use an opt-in lifecycle with documented restore behavior and no default activation surprise.
4. Exercise real Electron underlines, suggestions, exact replacement, surrounding text preservation, cancel/reopen, typing after cancel, multiple composers, session switches, disable/restore, and unsupported languages.
5. Conduct independent review of the exact successor commit before installing it or proposing a catalog entry. Test doubles cannot certify these native behaviors.

Do not post credentials or private drafts in GitHub issues. Non-sensitive compatibility reports should identify the desktop build, OS, plugin commit, and a synthetic reproduction only.
