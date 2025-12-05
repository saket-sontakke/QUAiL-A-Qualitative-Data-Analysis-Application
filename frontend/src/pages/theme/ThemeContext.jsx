import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

/**
 * A custom hook to provide easy access to the theme context, which includes
 * the current theme ('light' or 'dark') and a function to toggle it.
 * @returns {{theme: string, toggleTheme: () => void}} The theme context value.
 */
export const useTheme = () => useContext(ThemeContext);

/**
 * A provider component that manages and distributes the application's theme state.
 * It handles persisting the selected theme to `localStorage` and applies the
 * corresponding 'dark' class to the root HTML element for CSS styling.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to be wrapped by the provider.
 * @returns {JSX.Element} The ThemeContext provider wrapping its children.
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  );

  /**
   * Effect to apply theme changes to the DOM and persist them.
   */
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  /**
   * Toggles the application theme between 'light' and 'dark'.
   */
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};