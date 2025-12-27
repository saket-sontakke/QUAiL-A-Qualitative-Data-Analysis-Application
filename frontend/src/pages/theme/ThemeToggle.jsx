import React from 'react';
import { useTheme } from './ThemeContext.jsx';
import { MdLightMode, MdDarkMode } from "react-icons/md";

/**
 * A button component that allows the user to switch between light and dark themes.
 * It adapts its styling based on whether it is placed within a navbar or another
 * part of the UI.
 *
 * @param {object} props - The component props.
 * @param {boolean} [props.navbar=false] - If true, applies specific styling suitable for use in the navbar.
 * @returns {JSX.Element} The rendered theme toggle button.
 */
const ThemeToggle = ({ navbar = false }) => {
  const { theme, toggleTheme } = useTheme();

  const baseClasses = 'p-1 rounded-full focus:outline-none transition-colors duration-300';

  let themeClasses;
  
  if (theme === 'light') {
    // FIX: Even if it's in the navbar, we want dark text for Light Mode 
    // because the navbar background is now white.
    themeClasses = navbar 
      ? 'text-gray-800 hover:bg-gray-200' 
      : 'text-gray-800 hover:bg-gray-200';
  } else {
    // Dark mode always uses white text
    themeClasses = 'text-white hover:bg-white/20';
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${baseClasses} ${themeClasses}`}
      aria-label="Toggle theme"
      title='Toggle Theme'
    >
      {theme === 'light' ? <MdDarkMode size={23} /> : <MdLightMode size={23} />}
    </button>
  );
};

export default ThemeToggle;