import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaFolderOpen, FaFolderPlus } from 'react-icons/fa';
import ThemeToggle from '../theme/ThemeToggle.jsx';

/**
 * @component Navbar
 * @description A fixed navigation bar that displays the application logo, project-specific
 * information, and user controls like theme toggling and profile management.
 * @param {object} props - The component props.
 * @param {string} props.projectName - The name of the currently active project.
 * @param {string} props.projectID - The ID of the currently active project.
 */
const Navbar = ({ projectName, projectID }) => {
    // State for managing the visibility of the profile dropdown
    const [showProfile, setShowProfile] = useState(false);
    // State for storing the user's name and email
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');

    // Hooks for navigation and getting the current URL location
    const navigate = useNavigate();
    const location = useLocation();

    // Ref for the profile dropdown to detect outside clicks
    const profileDropdownRef = useRef(null);

    // Determines if the current view is a project page
    const isProjectView = location.pathname.startsWith('/project/');

    // Effect to fetch user data and set up click-outside listener for the profile dropdown
    useEffect(() => {
        // Retrieve user information from local storage on component mount
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserName(user.name);
            setUserEmail(user.email);
        }

        // Event listener to close the profile dropdown when clicking outside of it
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        // Cleanup function to remove the event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    /**
     * @function toggleProfile
     * @description Toggles the visibility of the user profile dropdown.
     */
    const toggleProfile = () => setShowProfile(!showProfile);

    /**
     * @function handleLogout
     * @description Clears user data from local storage and navigates to the login page.
     */
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1D3C87] dark:bg-gray-800 shadow-lg px-6 py-3 flex justify-between items-center transition-colors duration-300">
            {/* Left Section: Logo and Project Context */}
            <div className="flex items-center space-x-1">
                <Link to="/home" className="text-2xl font-bold tracking-tight" style={{ color: '#F05623' }}>
                    ETQDA
                </Link>

                {/* Displays project-specific info and actions only on project pages */}
                {isProjectView && (
                    <>
                        {projectName && (
                            <span className="text-white text-lg font-semibold ml-3">{projectName}</span>
                        )}
                        <div className="flex items-center space-x-4 ml-3">
                            <Link
                                to="/create-project"
                                className="text-white hover:text-[#F05623] transition-colors duration-200"
                                title="New Project"
                            >
                                <FaFolderPlus className="text-xl" />
                            </Link>
                            <Link
                                to="/home"
                                className="text-white hover:text-[#F05623] transition-colors duration-200"
                                title="Open Project"
                            >
                                <FaFolderOpen className="text-xl" />
                            </Link>
                        </div>
                    </>
                )}
            </div>

            {/* Right Section: Theme Toggle and User Profile */}
            <div className="flex items-center space-x-4">
                <ThemeToggle navbar />
                <div className="relative" ref={profileDropdownRef}>
                    <FaUserCircle
                        className="text-3xl text-white cursor-pointer"
                        title='User Profile'
                        onClick={toggleProfile}
                    />
                    <AnimatePresence>
                        {showProfile && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg p-4 z-50"
                            >
                                {userName && (
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        {userName}
                                    </p>
                                )}
                                {userEmail && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 break-words">
                                        {userEmail}
                                    </p>
                                )}
                                {!userName && !userEmail && (
                                    <p className="text-sm text-gray-800 dark:text-gray-200">Logged in</p>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md transition duration-200"
                                >
                                    Logout
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
