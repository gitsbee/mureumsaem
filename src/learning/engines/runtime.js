import { inkNamespace, storageKey } from '../../storage';
// The original engines run against their own markup and route within the Pulim document.
function scopedStorage(storage, namespace) {
  const prefix = namespace + ':';
  return new Proxy({
    getItem: key => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: key => storage.removeItem(prefix + key),
  }, {
    ownKeys: () => Object.keys(storage).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length)),
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
  });
}

export function createStudyRuntime(root, { account, subject, vocabulary, report, ask = (_prompt) => {}, updateView, getTheme, setTheme, recordsOnly = false }) {
  const abort = new AbortController();
  const localEvents = new EventTarget();
  const observations = new Set();
  const initialization = [];
  const namespace = storageKey(account + ':' + subject);
  const listen = (target, type, callback, options = {}) =>
    target.addEventListener(type, callback, { ...options, signal: abort.signal });
  const observe = Observer => class extends Observer {
    constructor(callback) {
      super(callback);
      observations.add(this);
    }
  };

  let hash = '';
  const location = {
    get hash() { return hash; },
    replace(value) {
      if (value === hash) return;
      hash = value;
      queueMicrotask(() => {
        if (!abort.signal.aborted) localEvents.dispatchEvent(new Event('hashchange'));
      });
    },
  };

  const scopedDocument = {
    get body() { return root; },
    get documentElement() { return document.documentElement; },
    get activeElement() { return document.activeElement; },
    get fullscreenElement() { return document.fullscreenElement; },
    get hidden() { return document.hidden; },
    createElement: document.createElement.bind(document),
    exitFullscreen: () => document.exitFullscreen(),
    getElementById: id => root.querySelector('#' + CSS.escape(id)),
    querySelector: selector => root.querySelector(selector),
    querySelectorAll: selector => root.querySelectorAll(selector),
    dispatchEvent: event => root.dispatchEvent(event),
    addEventListener(type, callback) {
      if (type === 'DOMContentLoaded') initialization.push(callback);
      else if (type === 'visibilitychange' || type === 'fullscreenchange') listen(document, type, callback);
      else listen(root, type, callback);
    },
  };

  let resize = null;
  listen(window, 'resize', () => resize?.());
  const viewport = window.visualViewport;
  const scopedWindow = {
    crypto: window.crypto,
    AudioContext: window.AudioContext,
    webkitAudioContext: window.webkitAudioContext,
    get devicePixelRatio() { return window.devicePixelRatio; },
    get innerWidth() { return window.innerWidth; },
    get innerHeight() { return window.innerHeight; },
    visualViewport: viewport && {
      get height() { return viewport.height; },
      get offsetTop() { return viewport.offsetTop; },
      addEventListener: (type, callback) => listen(viewport, type, callback),
    },
    scrollBy: (...args) => window.scrollBy(...args),
    scrollTo: (...args) => window.scrollTo(...args),
    set onresize(callback) { resize = callback; },
    addEventListener(type, callback, options) {
      listen(type === 'hashchange' ? localEvents : window, type, callback, options);
    },
    studyBridge: {
      namespace: inkNamespace(account, subject), vocabulary, report, ask,
      local: scopedStorage(localStorage, namespace),
      session: scopedStorage(sessionStorage, namespace),
    },
  };

  listen(root, 'click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    const href = anchor?.getAttribute('href');
    if (!['#practice', '#history', '#inspection'].includes(href)) return;
    event.preventDefault();
    location.replace(href);
  });

  return {
    document: scopedDocument,
    window: scopedWindow,
    location,
    matchMedia(query) {
      const media = window.matchMedia(query);
      return {
        get matches() { return media.matches; },
        addEventListener: (type, callback) => listen(media, type, callback),
      };
    },
    ResizeObserver: observe(ResizeObserver),
    MutationObserver: observe(MutationObserver),
    getTheme, setTheme, updateView, recordsOnly,
    ready() { initialization.forEach(callback => callback()); },
    addEventListener(type, callback) {
      if (type === 'hashchange') listen(localEvents, type, callback);
      else if (type === 'pagehide') {
        listen(window, type, callback);
        listen(localEvents, type, callback);
      } else if (type === 'storage') {
        listen(window, 'storage', event => {
          const prefix = namespace + ':';
          if (event.key === null || event.key.startsWith(prefix)) {
            callback({ key: event.key?.slice(prefix.length) ?? null, newValue: event.newValue });
          }
        });
      }
    },
    destroy() {
      localEvents.dispatchEvent(new Event('pagehide'));
      abort.abort();
      observations.forEach(observer => observer.disconnect());
      for (const dialog of root.querySelectorAll('dialog[open]')) dialog.close();
      if (!recordsOnly) {
        document.documentElement.style.removeProperty('--session-header-height');
        document.documentElement.style.removeProperty('--keyboard-inset');
      }
    },
  };
}
