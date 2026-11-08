import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installAnalytics } from './lib/analytics';
import { initMonitoring, reportError } from './lib/monitoring';
// Self-hosted fonts: unicode-range makes the browser fetch only the Cyrillic / Latin subsets it needs.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
// Site headings (landing, cabinet). Covers Kyrgyz ң ө ү via the cyrillic-ext subset.
import '@fontsource-variable/montserrat';
import '@fontsource/playfair-display/500.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/500-italic.css';
import './styles/kyrgyz-serif.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

installAnalytics();
void initMonitoring();

createRoot(rootElement, {
  onUncaughtError: (error, info) => {
    reportError(error);
    console.error(error, info.componentStack);
  },
  onCaughtError: (error) => reportError(error),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
