import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Importing global styles for the application.
import App from './App.jsx'; // The root component of the application.
import { ThemeProvider } from './pages/theme/ThemeContext.jsx'; // Importing the theme context provider.

/**
 * Grabs the root DOM element where the React application will be mounted.
 * This is the standard entry point for a modern React application.
 */
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

/**
 * Renders the application into the root DOM element.
 *
 * <StrictMode> is a tool for highlighting potential problems in an application.
 * It activates additional checks and warnings for its descendants.
 *
 * <ThemeProvider> is a context provider that wraps the entire application,
 * making the theme state (e.g., 'light' or 'dark') and a toggle function
 * available to any component within the app.
 *
 * <App /> is the main component that contains all other components and pages.
 */
root.render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
