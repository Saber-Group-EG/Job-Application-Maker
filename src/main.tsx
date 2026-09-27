import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from './store/store';
import { queryClient } from './lib/queryClient';
import './index.css';
import 'swiper/swiper-bundle.css';
import 'flatpickr/dist/flatpickr.css';
import App from './router/Router.tsx';
import { AppWrapper } from './components/common/PageMeta.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { LocaleProvider } from './context/LocaleContext.tsx';
import { ErrorBoundary, reloadOnceForNewVersion } from './components/common/ErrorBoundary.tsx';

// Vite fires this when a page file from an older deploy is gone.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ErrorBoundary fullPage>
          <AuthProvider>
            <ThemeProvider>
              <AppWrapper>
                <App />
              </AppWrapper>
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </LocaleProvider>
    </QueryClientProvider>
  </Provider>
);
