import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

async function enableMocking() {
  const mode = import.meta.env.VITE_API_MODE ?? 'mock';
  if (!import.meta.env.DEV || mode !== 'mock') {
    return;
  }

  const { worker } = await import('./shared/mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

void enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
