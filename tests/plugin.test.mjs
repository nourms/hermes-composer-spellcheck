import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../plugin.js';

// Characterization only: no browser, Electron, native spelling, or production edits.
// This tiny DOM models attribute selectors and ancestry, not layout/event propagation.
// Mutation records and timer firing are explicit; no browser scheduling is simulated.
// ctx models assumed managed-listener/timer disposal, not the real Hermes SDK.
// No DOMRange/selection simulation: replacement and stale-range safety remain TODOs.
class ElementDouble {
  constructor(attrs = {}, children = []) {
    this.attrs = new Map(Object.entries(attrs));
    this.children = [];
    this.nodeType = 1;
    this.parentElement = null;
    children.forEach(child => this.appendChild(child));
  }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  removeAttribute(name) { this.attrs.delete(name); }
  matches(selector) {
    const [, name, value] = /^\[([^=]+)="([^"]*)"\]$/.exec(selector) ?? [];
    assert.ok(name, `Unsupported modeled selector: ${selector}`);
    return this.getAttribute(name) === value;
  }
  closest(selector) {
    return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null;
  }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }
  appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter(child => child !== this);
      this.parentElement = null;
    }
  }
  get isConnected() { return Boolean(this.root || this.parentElement?.isConnected); }
}
const editor = (attrs = {}, children = []) => new ElementDouble({
  'data-slot': 'composer-rich-input', contenteditable: 'true', ...attrs,
}, children);
const hitAttribute = 'data-hermes-spellcheck-hit-test';

function mount(t, ...children) {
  const head = new ElementDouble();
  const body = new ElementDouble({}, children);
  head.root = body.root = true;
  const listeners = new Set();
  const timers = new Map();
  const cancelled = [];
  const disposers = [];
  const observers = [];
  let nextTimer = 0;
  let disposed = false;
  let bridgeOff = 0;
  const window = { hermesDesktop: {
    onContextMenuSpellcheck(callback) {
      assert.equal(typeof callback, 'function');
      return () => { bridgeOff++; };
    },
  } };
  const document = { head, body, createElement: () => new ElementDouble() };
  class ObserverDouble {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(target, options) { this.target = target; this.options = options; }
    disconnect() { this.disconnected = true; }
  }
  const replacements = { Element: ElementDouble, MutationObserver: ObserverDouble, document, window };
  const saved = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  function dispose() {
    if (disposed) return;
    disposed = true;
    disposers.forEach(callback => callback());
    listeners.clear();
    timers.clear();
  }
  t.after(() => {
    try { dispose(); } finally {
      for (const [key, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  plugin.register({
    addEventListener(target, type, callback, capture) { listeners.add({ target, type, callback, capture }); },
    onDispose(callback) { disposers.push(callback); },
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, delay });
      return () => { cancelled.push(id); timers.delete(id); };
    },
  });
  assert.equal(observers.length, 1);
  return {
    head, body, window, document, listeners, timers, cancelled, dispose,
    observer: observers[0], bridgeOff: () => bridgeOff,
    contextmenu(target) {
      for (const listener of listeners) {
        if (listener.target === window && listener.type === 'contextmenu') listener.callback({ target });
      }
    },
    fireTimers() {
      for (const [id, timer] of [...timers]) { timers.delete(id); timer.callback(); }
    },
  };
}

test('only data-slot matching inputs get spellcheck, even when not editable', t => {
  const matched = [editor(), editor({ spellcheck: 'false' }), editor({ contenteditable: 'false' })];
  const unrelated = [new ElementDouble(), new ElementDouble({ spellcheck: 'false' }),
    new ElementDouble({ 'data-slot': 'other-input', contenteditable: 'true' })];
  mount(t, new ElementDouble({}, [...matched, ...unrelated]));
  matched.forEach(element => assert.equal(element.getAttribute('spellcheck'), 'true'));
  assert.deepEqual(unrelated.map(element => element.getAttribute('spellcheck')), [null, 'false', null]);
});

test('disposal restores original false, absent, and true attributes', t => {
  const elements = [editor({ spellcheck: 'false' }), editor(), editor({ spellcheck: 'true' })];
  const app = mount(t, ...elements);
  elements.forEach(element => assert.equal(element.getAttribute('spellcheck'), 'true'));
  app.dispose();
  assert.deepEqual(elements.map(element => element.getAttribute('spellcheck')), ['false', null, 'true']);
});

test('real observer callback handles added roots, descendants, and attribute mutations', t => {
  const app = mount(t);
  assert.equal(app.observer.target, app.body);
  assert.deepEqual(app.observer.options, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['spellcheck'],
  });
  const direct = editor({ spellcheck: 'false' });
  const nested = editor();
  const unrelated = new ElementDouble({ spellcheck: 'false' });
  const wrapper = new ElementDouble({}, [nested, unrelated]);
  app.body.appendChild(direct);
  app.body.appendChild(wrapper);
  app.observer.callback([{ type: 'childList', addedNodes: [direct, wrapper, { nodeType: 3 }] }]);
  assert.equal(direct.getAttribute('spellcheck'), 'true');
  assert.equal(nested.getAttribute('spellcheck'), 'true');
  direct.setAttribute('spellcheck', 'false');
  app.observer.callback([direct, unrelated].map(target => ({ type: 'attributes', target })));
  assert.equal(direct.getAttribute('spellcheck'), 'true');
  assert.equal(unrelated.getAttribute('spellcheck'), 'false');
  app.dispose();
  assert.equal(direct.getAttribute('spellcheck'), 'false');
  assert.equal(nested.getAttribute('spellcheck'), null);
});

test('contextmenu marks only the editable ancestor, replaces its timer, then clears it', t => {
  const child = new ElementDouble();
  const active = editor({}, [child]);
  const other = editor();
  const readonly = editor({ contenteditable: 'false' });
  const unrelated = new ElementDouble({ contenteditable: 'true' });
  const app = mount(t, active, other, readonly, unrelated);
  [readonly, unrelated, {}].forEach(target => app.contextmenu(target));
  assert.equal(app.timers.size, 0);
  app.contextmenu(child);
  assert.equal(active.getAttribute(hitAttribute), 'true');
  [other, readonly, unrelated, child].forEach(element => assert.equal(element.getAttribute(hitAttribute), null));
  assert.deepEqual([...app.timers.values()].map(timer => timer.delay), [250]);
  const previous = [...app.timers.keys()][0];
  app.contextmenu(child);
  assert.deepEqual(app.cancelled, [previous]);
  assert.equal(app.timers.size, 1);
  app.fireTimers();
  assert.equal(active.getAttribute(hitAttribute), null);
  assert.equal(app.timers.size, 0);
  app.dispose();
  assert.deepEqual(app.cancelled, [previous]); // Expired hit-test entry was deleted.
});

test('disposal disconnects, removes style, cancels hit timers and releases managed listeners', t => {
  const first = editor();
  const second = editor();
  const app = mount(t, first, second);
  assert.equal(app.head.children.length, 1);
  assert.equal(app.head.children[0].textContent,
    '[data-hermes-spellcheck-hit-test="true"] { pointer-events: auto !important; }');
  assert.deepEqual([...app.listeners].map(({ target, type, capture }) =>
    [target === app.window ? 'window' : target === app.document ? 'document' : 'other', type, capture]),
  [['window', 'contextmenu', true], ['document', 'focusin', true]]);
  app.contextmenu(first);
  app.contextmenu(second);
  const pending = [...app.timers.keys()];
  assert.equal(pending.length, 2);
  app.dispose();
  assert.equal(app.observer.disconnected, true);
  assert.equal(app.head.children.length, 0);
  assert.deepEqual(app.cancelled, pending); // Plugin calls cancel, not just fake ctx clearing timers.
  assert.equal(app.timers.size, 0);
  assert.equal(app.listeners.size, 0); // Managed-ctx contract, not proof of real SDK integration.
  assert.equal(app.bridgeOff(), 1);
  [first, second].forEach(element => assert.equal(element.getAttribute(hitAttribute), null));
  app.contextmenu(first);
  assert.equal(app.timers.size, 0);
});

test('known limitation: observer forgets detached editors, so their originals are not restored', t => {
  const detached = editor({ spellcheck: 'false' });
  const app = mount(t, detached);
  detached.remove();
  app.observer.callback([{ type: 'childList', addedNodes: [] }]);
  app.dispose();
  assert.equal(detached.getAttribute('spellcheck'), 'true');
});

test.todo('real Electron native suggestion replacement and editor-state synchronization');
test.todo('stale saved DOMRange safety after selection or document changes');
test.todo('cancelled spelling-menu safety and saved-selection invalidation');
test.todo('session-switch safety: no stale range/editor restoration into a different session');
