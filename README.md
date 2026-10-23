# Hermes Composer Spell Check — experimental

The actual JavaScript desktop plugin behind a local Hermes spell-check demonstration. **This is a plugin, not an agent skill.** It enables Chromium's spelling attribute on Hermes composer inputs and includes compatibility workarounds for native context-menu hit-testing and selection.

> **Source publication for review and reproducibility, not a production-ready or catalog-approved release.** The existing implementation uses private Hermes UI details and has an unresolved stale-selection risk. Do not enable it on valuable drafts. Publishing this repository does not install or update anything in your running Hermes app.

## What is included

- `plugin.js`: the existing local plugin, published without functional changes.
- `tests/plugin.test.mjs`: dependency-free characterization tests using Node's test runner and a small simulated DOM/lifecycle. These do not emulate Electron's spelling engine.
- `SECURITY.md`: behavior, unresolved risks, and the catalog boundary.
- `TESTING.md`: actual verification and coverage limits.

Plugin identity: `composer-spellcheck`; display name: **Chat Spell Check**. Repository/package version: `0.1.0-experimental`. The package is private to npm; this repository is the source distribution. It ships no dictionary, server, Python backend, agent tool, or model dependency.

## Existing behavior

1. Find composer elements matching the internal `data-slot="composer-rich-input"` selector and set their `spellcheck` attribute to `true`, retaining the original value.
2. Observe dynamically added composers and spelling-attribute changes.
3. On a context-menu gesture in an editable composer, temporarily retain pointer hit-testing for that editor. This is a fixed 250 ms workaround, not a universal timing guarantee.
4. Listen to the private native-spelling bridge and retain a matching selected range for restoration on composer focus.
5. Restore tracked attributes and remove registered observers/styles/listeners/timers when the host disposes the plugin.

The plugin does not itself invoke a word-replacement API or send a message. Corrections depend on Hermes/Electron's native menu and replacement path. **It does change selection**, so lack of direct text-replacement calls does not make stale selection harmless.

## Compatibility and installation boundary

This is a version-specific local workaround. No general Hermes version floor or cross-platform compatibility is asserted. A previous local Windows demonstration showed an actual spelling correction; that observation is not a fresh compatibility test, a regression suite, or evidence that every build works.

The implementation is **not eligible for the current Hermes plugin catalog as written**: it queries internal composer markup, observes `document.body`, and uses a private bridge. The catalog requires supported SDK integration instead. Renaming selectors or hiding these accesses would not fix that design.

There is intentionally no `plugin.yaml`, catalog entry, auto-installer, or one-click install command. `plugin.js` is the standalone desktop entrypoint, not a `SKILL.md`. Copying it into a watched desktop-plugin directory can execute it immediately; its existing `defaultEnabled` flag is `true`. Do not do that merely to review this repository.

Before any installation, enablement, or upgrade:

- Independently review the exact commit and all behavior in `SECURITY.md`.
- Resolve the actual app-level plugin root and preserve existing files and unsent drafts; the selected chat profile alone does not identify that root.
- Obtain explicit post-review approval for the exact candidate and destination.
- Resolve the stale-selection and supported-SDK issues, then perform actual native UI QA on synthetic drafts in an isolated, approved test surface.

The user's existing local plugin was not modified during this source publication. A future supported implementation should be a separately tested version, not a silent replacement of this snapshot.

## Local characterization tests

Requires an already installed modern Node.js with the built-in test runner. No npm install or third-party packages are required.

```sh
node --check plugin.js
node --test tests/plugin.test.mjs
```

Tests run against simulated DOM and plugin-context boundaries. TODO cases are unverified, not passes; see `TESTING.md`. Do not interpret a green unit test run as native spelling, focus safety, or catalog validation.

## Privacy and scope

The plugin contains no network requests, telemetry, credential access, shell execution, or persistent data writes. It inspects matching composer elements, spelling payloads and the selected word/range in memory. Its document-level observer/listeners are broader than a public composer SDK contribution.

Electron may download native dictionaries; the rest of Hermes and any connected gateway have their own data flows. This repository therefore makes no whole-app offline or privacy guarantee. Keep diagnostics and screenshots synthetic and free of private messages.

## Upstream status

This repository is not approved, merged, or endorsed by Nous Research. It is not submitted to the plugin catalog in this form. The earlier instruction-only skill proposal was withdrawn because it was not the actual feature. Hands Free is a separate skill and is unaffected.

Relevant official references:

- [Desktop Plugin SDK](https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk)
- [Plugin catalog submission rules](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins/catalog-submission)
- [Electron spelling](https://www.electronjs.org/docs/latest/tutorial/spellchecker)

## License and authorship

MIT. Nour (`nourms`), with Hermes Agent assistance. The initial publication preserves the existing local implementation rather than claiming it was rewritten against a stable SDK.
