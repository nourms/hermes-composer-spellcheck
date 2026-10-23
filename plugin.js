// Local, reversible spelling support. This plugin sends no text to external services.
const SELECTOR = '[data-slot="composer-rich-input"]';

export default {
  id: 'composer-spellcheck',
  name: 'Chat Spell Check',
  description: 'Enable native spelling underlines and correction suggestions in the chat input. Does not automatically replace text.',
  defaultEnabled: true,
  register(ctx) {
    // Radix's modal menu sets body pointer-events:none before Chromium's
    // native context-menu hit test. Preserve only the clicked editor for that
    // single event turn so Electron can identify the misspelled word.
    const hitTestAttribute = 'data-hermes-spellcheck-hit-test';
    const style = document.createElement('style');
    style.textContent = `[${hitTestAttribute}="true"] { pointer-events: auto !important; }`;
    document.head.appendChild(style);
    const hitTests = new Map();
    ctx.addEventListener(window, 'contextmenu', event => {
      const editor = event.target instanceof Element ? event.target.closest(SELECTOR) : null;
      if (!editor || editor.getAttribute('contenteditable') !== 'true') return;
      hitTests.get(editor)?.();
      editor.setAttribute(hitTestAttribute, 'true');
      const cancel = ctx.setTimeout(() => {
        editor.removeAttribute(hitTestAttribute);
        hitTests.delete(editor);
      }, 250);
      hitTests.set(editor, cancel);
    }, true);
    ctx.onDispose(() => {
      for (const [editor, cancel] of hitTests) {
        cancel();
        editor.removeAttribute(hitTestAttribute);
      }
      hitTests.clear();
      style.remove();
    });
    let spellingRange = null;
    let spellingEditor = null;
    const offSpelling = window.hermesDesktop?.onContextMenuSpellcheck?.(payload => {
      const selection = window.getSelection();
      if (selection?.rangeCount && selection.toString() === payload.misspelledWord) {
        const range = selection.getRangeAt(0);
        const parent = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        const editor = parent?.closest(SELECTOR);
        if (editor) { spellingRange = range.cloneRange(); spellingEditor = editor; }
      }

    });
    if (offSpelling) ctx.onDispose(offSpelling);
    ctx.addEventListener(document, 'focusin', event => {
      if (event.target === spellingEditor && spellingRange && !document.querySelector('[role="menu"]')) {

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(spellingRange);
        spellingRange = null;
        spellingEditor = null;
      }
    }, true);
    const originals = new Map();
    function enable(element) {
      if (!element.matches(SELECTOR)) return;
      if (!originals.has(element)) originals.set(element, element.getAttribute('spellcheck'));
      if (element.getAttribute('spellcheck') !== 'true') element.setAttribute('spellcheck', 'true');
    }
    function scan(root) {
      if (root.nodeType !== 1) return;
      if (root.matches(SELECTOR)) enable(root);
      root.querySelectorAll(SELECTOR).forEach(enable);
    }
    scan(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') enable(record.target);
        else record.addedNodes.forEach(scan);
      }
      for (const element of originals.keys()) {
        if (!element.isConnected) originals.delete(element);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['spellcheck']
    });
    ctx.onDispose(() => {
      observer.disconnect();
      for (const [element, value] of originals) {
        if (value === null) element.removeAttribute('spellcheck');
        else element.setAttribute('spellcheck', value);
      }
      originals.clear();
    });
  }
};
