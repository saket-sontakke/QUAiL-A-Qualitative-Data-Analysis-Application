/**
 * @file main.jsx
 * @description The entry point for the React application.
 * This file handles the initial rendering of the root component (`App`)
 * into the DOM. It also wraps the application with essential context
 * providers, such as ThemeProvider for theme management and AuthProvider
 * for authentication state.
 */
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './pages/theme/ThemeContext.jsx';
import { AuthProvider } from './pages/auth/AuthContext.jsx';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);