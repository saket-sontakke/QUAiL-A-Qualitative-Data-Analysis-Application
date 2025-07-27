import React from 'react';
import { useTheme } from './ThemeContext.jsx';
import { MdLightMode, MdDarkMode } from "react-icons/md";

/**
 * @component ThemeToggle
 * @description A button component that allows the user to switch between light and dark themes.
 * It adapts its styling based on whether it's placed in a navbar or another part of the UI.
 * @param {object} props - The component props.
 * @param {boolean} [props.navbar=false] - A boolean to indicate if the toggle is used within the Navbar, which applies specific styling.
 */
const ThemeToggle = ({ navbar = false }) => {
    // Use the custom hook to access the current theme and the function to toggle it.
    const { theme, toggleTheme } = useTheme();
    
    // Base CSS classes for the button, applied in all variants.
    const baseClasses = 'p-1 rounded-full focus:outline-none transition-colors duration-300';

    // Determine the specific styling based on the current theme and the 'navbar' prop.
    let themeClasses;
    if (theme === 'light') {
        if (navbar) {
            // Light theme, inside the navbar
            themeClasses = 'text-white hover:bg-white/20';
        } else {
            // Light theme, outside the navbar
            themeClasses = 'text-gray-800 hover:bg-gray-200';
        } 
    } else {
        // Dark theme (styling is the same for navbar and other locations)
        themeClasses = 'text-white hover:bg-white/20';
    }

    return (
        <button
            onClick={toggleTheme}
            className={`${baseClasses} ${themeClasses}`}
            aria-label="Toggle theme"
            title='Toggle Theme'
        >
            {/* Conditionally render the appropriate icon based on the current theme. */}
            {theme === 'light' ? <MdDarkMode size={23} /> : <MdLightMode size={23} />}
        </button>
    );
};

export default ThemeToggle;
