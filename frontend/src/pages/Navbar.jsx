import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle } from 'react-icons/fa';

const Navbar = () => {
  const [showProfile, setShowProfile] = useState(false);
  const [userName, setUserName] = useState(''); // State for username
  const [userEmail, setUserEmail] = useState(''); // State for user email
  const navigate = useNavigate();

  useEffect(() => {
    // Retrieve user data from local storage when the component mounts
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserName(user.name);
      setUserEmail(user.email);
    }
  }, []); // Empty dependency array means this runs once on mount

  const toggleProfile = () => setShowProfile(!showProfile);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // <--- REMOVE USER DATA ON LOGOUT
    navigate('/');
  };

  return (
    <div className="w-full flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-md fixed top-0 z-50">
      {/* ETQDA text on the left */}
      <Link to="/home" className="text-2xl font-bold text-[#1D3C87] dark:text-[#F05623] ml-4">
        ETQDA
      </Link>

      <div className="relative">
        <FaUserCircle
          className="text-3xl text-gray-700 dark:text-white cursor-pointer"
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
              {userName && <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{userName}</p>}
              {userEmail && <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 break-words">{userEmail}</p>}
              {!userName && !userEmail && <p className="text-sm text-gray-800 dark:text-gray-200">Logged in</p>} {/* Fallback */}
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
  );
};

export default Navbar;
