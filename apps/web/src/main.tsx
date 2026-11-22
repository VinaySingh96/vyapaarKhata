import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { generateUuid } from './utils/uuid.js';
import './styles.css';

// Ensure crypto.randomUUID is available across all mobile/LAN contexts (e.g. testing over http://192.168.x.x)
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  if (typeof window.crypto.randomUUID !== 'function') {
    window.crypto.randomUUID = function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
      return generateUuid() as `${string}-${string}-${string}-${string}-${string}`;
    };
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
