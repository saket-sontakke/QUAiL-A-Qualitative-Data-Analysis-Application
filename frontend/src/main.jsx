import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './pages/theme/ThemeContext.jsx';
import { AuthProvider } from './pages/auth/AuthContext.jsx';

/**
 * Application Entry Point.
 *
 * Initializes the React application root and renders the main App component
 * wrapped within necessary global context providers and strict mode.
 */
// --- Root Initialization ---
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

// --- Application Rendering ---
root.render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);