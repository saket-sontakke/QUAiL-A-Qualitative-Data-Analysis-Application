import React, { createContext, useState, useEffect, useContext } from 'react';

/**
 * @constant ThemeContext
 * @description Creates a context for the application's theme.
 */
const ThemeContext = createContext();

/**
 * @function useTheme
 * @description A custom hook to provide easy access to the theme context (theme and toggleTheme function).
 * @returns {object} The theme context value.
 */
export const useTheme = () => useContext(ThemeContext);

/**
 * @component ThemeProvider
 * @description A component that provides theme state and a toggle function to its children.
 * It handles persisting the theme to localStorage and applying the 'dark' class to the root HTML element.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to be wrapped by the provider.
 */
export const ThemeProvider = ({ children }) => {
    // Initialize theme state from localStorage or default to 'light'.
    const [theme, setTheme] = useState(
        () => localStorage.getItem('theme') || 'light'
    );

    /**
     * @effect
     * @description This effect runs when the theme state changes. It performs two side effects:
     * 1. Toggles the 'dark' class on the root HTML element to apply Tailwind CSS dark mode styles.
     * 2. Persists the current theme choice to localStorage.
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
     * @function toggleTheme
     * @description Toggles the theme between 'light' and 'dark'.
     */
    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // Provide the theme and toggle function to all descendant components.
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
