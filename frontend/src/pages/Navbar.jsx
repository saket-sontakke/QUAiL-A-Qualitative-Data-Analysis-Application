import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaFolderOpen, FaFolderPlus } from 'react-icons/fa';
import { BiImport } from 'react-icons/bi';

const Navbar = ({ onFileImport, projectName, projectID }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef(null);

  const isProjectView = location.pathname.startsWith('/project/');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserName(user.name);
      setUserEmail(user.email);
    }

    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleProfile = () => setShowProfile(!showProfile);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    // console.log('File selected in Navbar:', file);
    if (file && onFileImport) {
      onFileImport(file, projectID);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1D3C87] dark:bg-gray-900 shadow-lg px-6 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Link to="/home" className="text-2xl font-bold tracking-tight" style={{ color: '#F05623' }}>
          ETQDA
        </Link>

        {isProjectView && (
          <>
            {projectName && (
              <span className="text-white text-lg font-semibold ml-4">{projectName}</span>
            )}
            <div className="flex items-center space-x-4 ml-4">
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
              <label
                htmlFor="importFileNavbar"
                className="cursor-pointer text-white hover:text-[#F05623] transition-colors duration-200"
                title="Import File"
              >
                <BiImport className="text-xl" />
                <input
                  type="file"
                  accept=".txt,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="importFileNavbar"
                />
              </label>
            </div>
          </>
        )}
      </div>

      <div className="relative" ref={profileDropdownRef}>
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
    </nav>
  );
};

export default Navbar;
