import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaFolderOpen, FaFolderPlus, FaList, FaCog, FaBug, FaCommentAlt } from 'react-icons/fa';
import ThemeToggle from '../theme/ThemeToggle.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import Logo from '../theme/Logo.jsx';

const Navbar = ({
  projectName,
  onOpenProjectOverviewModal,
  onOpenPreferencesModal,
  isEditing,
  onNavigateAttempt,
  onLogoutAttempt,
  setShowConfirmModal,
  setConfirmModalData
}) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const profileDropdownRef = useRef(null);

  const isProjectView = location.pathname.startsWith('/project/');

  useEffect(() => {
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

    const handleNavigation = (path, options) => {
    if (typeof onNavigateAttempt === 'function') {
      onNavigateAttempt(path, options);
    } else {
      navigate(path, options);
    }
  };


  const handleLogout = () => {
    if (typeof onLogoutAttempt === 'function') {
      onLogoutAttempt();
      return;
    }

    if (typeof setConfirmModalData === 'function' && typeof setShowConfirmModal === 'function') {
      const executeLogout = () => {
          logout();
          navigate('/');
      };
      
      setConfirmModalData({
        title: 'Confirm Logout',
        shortMessage: 'Are you sure you want to log out?',
        confirmText: 'Logout',
        showCancelButton: true,
        onConfirm: () => {
          setShowConfirmModal(false);
          executeLogout();
        },
      });
      setShowConfirmModal(true);
    } else {
      logout();
      navigate('/');
    }
  };


  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-cyan-800 px-6 py-3 shadow-lg transition-colors duration-300 dark:bg-gray-800">
      <div className="flex items-center space-x-1">
        <div
          onClick={() => handleNavigation('/home')}
          className="flex cursor-pointer items-baseline text-2xl font-extrabold tracking-tight text-[#F05623]"
        >
          <Logo className="mr-3 h-8 w-8 scale-290 translate-y-[2px]" />
          <span className="el-messiri-bold leading-none text-4xl">
            QUAiL
          </span>
        </div>

        {isProjectView && (
          <>
            {projectName && (
              <span className="ml-3 text-lg font-semibold text-white">{projectName}</span>
            )}
              <div className="ml-3 flex items-center space-x-4">
              <button onClick={() => handleNavigation('/projects', { state: { openCreateModal: true } })} className="text-white transition-colors duration-200 hover:text-[#F05623]" title="New Project">
                <FaFolderPlus className="text-xl" />
              </button>

              <button onClick={() => handleNavigation('/projects')} className="text-white transition-colors duration-200 hover:text-[#F05623]" title="Open Project">
                <FaFolderOpen className="text-xl" />
              </button>
              <button
                onClick={onOpenProjectOverviewModal}
                className="text-white transition-colors duration-200 hover:text-[#F05623] disabled:cursor-not-allowed disabled:opacity-50"
                title="Project Overview & Stats"
                disabled={isEditing}
              >
                <FaList className="text-lg" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <ThemeToggle navbar />
        {isAuthenticated && (
          <div className="relative" ref={profileDropdownRef}>
            <FaUserCircle
              className="cursor-pointer text-3xl text-white"
              title='User Profile'
              onClick={toggleProfile}
            />
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 z-50 mt-2 w-56 rounded-lg bg-white p-4 shadow-xl dark:bg-gray-700"
                >
                  {user?.name && (
                    <p className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {user.name}
                    </p>
                  )}
                  {user?.email && (
                    <p className="mb-3 break-words text-xs text-gray-600 dark:text-gray-400">
                      {user.email}
                    </p>
                  )}
                  <div className="my-2 border-t border-gray-200 dark:border-gray-600"></div>

                  {isProjectView && (
                    <button
                      onClick={() => {
                        onOpenPreferencesModal();
                        setShowProfile(false);
                      }}
                      className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      <FaCog />
                      <span>Preferences</span>
                    </button>
                  )}

                  <a
                    href={import.meta.env.VITE_GOOGLE_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                    onClick={() => setShowProfile(false)}
                  >
                    <FaBug />
                    <span>Report a Bug</span>
                  </a>

                  <a
                    href={import.meta.env.VITE_FEEDBACK_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                    onClick={() => setShowProfile(false)}
                  >
                    <FaCommentAlt />
                    <span>Give Feedback</span>
                  </a>

                  <button
                    onClick={handleLogout}
                    className="mt-2 w-full rounded-md bg-red-500 py-1.5 font-semibold text-white transition duration-200 hover:bg-red-600"
                  >
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;