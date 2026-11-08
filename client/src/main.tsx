import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { readEmbeddedInitialData } from './ssr/initialData';
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

// Scroll-in animations are enabled only once the app runs (server HTML stays fully visible).
document.documentElement.classList.add('js');
installAnalytics();
void initMonitoring();

const rootOptions = {
  onUncaughtError: (error: unknown, info: { componentStack?: string }) => {
    reportError(error);
    console.error(error, info.componentStack);
  },
  onCaughtError: (error: unknown) => reportError(error),
};

// Public pages arrive rendered by the server: take over that HTML instead of drawing it again.
const isServerRendered = rootElement.hasChildNodes();
const app = (
  <StrictMode>
    <App initialData={isServerRendered ? readEmbeddedInitialData() : undefined} />
  </StrictMode>
);
if (isServerRendered) hydrateRoot(rootElement, app, rootOptions);
else createRoot(rootElement, rootOptions).render(app);
