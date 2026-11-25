import { migrateBrowserStorage } from './storage';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import sprite from './design/icons.svg?raw';
import './design/tokens.css';
import './forge.css';
import './pulim.css';
import './harueum/harueum.css';

migrateBrowserStorage();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="svg-library" aria-hidden="true" dangerouslySetInnerHTML={{ __html: sprite }} />
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(() => {});
  });
}
