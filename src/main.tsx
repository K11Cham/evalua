import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/besley';
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/atkinson-hyperlegible-mono';
import './app.css';
import { App } from './ui/App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
