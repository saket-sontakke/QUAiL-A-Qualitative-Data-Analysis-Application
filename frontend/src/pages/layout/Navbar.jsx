import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUserCircle, 
  FaFolderOpen, 
  FaFolderPlus, 
  FaList, 
  FaCog, 
  FaBug, 
  FaCommentAlt, 
  FaDownload, 
  FaFileImport,
  FaKey 
} from 'react-icons/fa'; 
import axios from 'axios'; 
import FileSaver from 'file-saver'; 
import ThemeToggle from '../theme/ThemeToggle.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import Logo from '../theme/Logo.jsx';
import { CURRENT_VERSION } from '../../../version.js';
import ApiKeyModal from '../components/ApiKeyModal.jsx';

/**
 * A responsive, fixed-position navigation bar for the application.
 */
const Navbar = ({
  projectName,
  isImported,
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
  const [isBackingUp, setIsBackingUp] = useState(false); 
  const [showApiModal, setShowApiModal] = useState(false);

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

  const handleBackup = async () => {
    if (isBackingUp) return;
    
    const pathParts = location.pathname.split('/');
    const projectId = pathParts[2];
    
    if (!projectId || !user?.token) return;

    setIsBackingUp(true);

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-quail`, 
        { 
          headers: { Authorization: `Bearer ${user.token}` },
          responseType: 'blob' 
        }
      );
      FileSaver.saveAs(res.data, `${projectName || 'project'}.quail`);
    } catch (err) {
      console.error("Backup failed", err);
      if (setConfirmModalData && setShowConfirmModal) {
        setConfirmModalData({
          title: 'Backup Failed',
          shortMessage: 'Could not create project backup.',
          onConfirm: () => setShowConfirmModal(false),
          confirmText: 'OK',
          showCancelButton: false
        });
        setShowConfirmModal(true);
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-6 py-3 shadow-lg transition-colors duration-300">
        <div className="flex items-center space-x-1">
          <div
            onClick={() => handleNavigation('/home')}
            className="flex cursor-pointer items-baseline text-2xl font-extrabold tracking-tight text-gray-800 dark:text-[#F05623]"
          >
            <Logo className="mr-3 h-8 w-8 scale-290 translate-y-0.5" />
            <div className="flex flex-col">
              <span className="el-messiri-bold leading-none text-4xl">
                QUAiL
              </span>
              
              {CURRENT_VERSION && CURRENT_VERSION.trim() !== "" && (
                <span className="el-messiri-bold text-xs font-medium text-gray-400 -mt-2 self-end">
                  {CURRENT_VERSION}
                </span>
              )}
            </div>
          </div>

          {isProjectView && (
            <>
              {projectName && (
                <div className="ml-3 flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-800 dark:text-white">
                    {projectName}
                  </span>
                  
                  {/* --- IMPORTED BADGE --- */}
                  {isImported && (
                    <span 
                      title="This project was imported" 
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm translate-y-0.5
                                 bg-blue-100 text-blue-800 border border-blue-200 
                                 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-400/30"
                    >
                      <FaFileImport />
                      Imported
                    </span>
                  )}
                </div>
              )}
              
              <div className="ml-3 flex items-center space-x-4">
                <button 
                  onClick={() => handleNavigation('/projects', { state: { openCreateModal: true } })} 
                  className="text-gray-800 dark:text-white transition-colors duration-200 hover:text-[#F05623] dark:hover:text-[#F05623]" 
                  title="New Project"
                >
                  <FaFolderPlus className="text-xl" />
                </button>

                <button 
                  onClick={() => handleNavigation('/projects')} 
                  className="text-gray-800 dark:text-white transition-colors duration-200 hover:text-[#F05623] dark:hover:text-[#F05623]" 
                  title="Open Project"
                >
                  <FaFolderOpen className="text-xl" />
                </button>

                {/* BACKUP BUTTON */}
                <button
                  onClick={handleBackup}
                  className="text-gray-800 dark:text-white transition-colors duration-200 hover:text-[#F05623] dark:hover:text-[#F05623] disabled:cursor-not-allowed disabled:opacity-50"
                  title="Download Project (.quail)"
                  disabled={isEditing || isBackingUp}
                >
                  {isBackingUp ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-800 dark:border-white border-t-transparent" />
                  ) : (
                    <FaDownload className="text-lg" />
                  )}
                </button>

                <button
                  onClick={onOpenProjectOverviewModal}
                  className="text-gray-800 dark:text-white transition-colors duration-200 hover:text-[#F05623] dark:hover:text-[#F05623] disabled:cursor-not-allowed disabled:opacity-50"
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
                className="cursor-pointer text-3xl text-gray-800 dark:text-white transition-colors duration-200"
                title='User Profile'
                onClick={toggleProfile}
              />
              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 z-50 mt-2 w-56 rounded-lg bg-white p-4 shadow-xl dark:bg-gray-700 ring-1 ring-black ring-opacity-5"
                  >
                    {user?.name && (
                      <p className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {user.name}
                      </p>
                    )}
                    {user?.email && (
                      <p className="mb-3 wrap-break-word text-xs text-gray-600 dark:text-gray-400">
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

                    <button
                      onClick={() => {
                        setShowApiModal(true);
                        setShowProfile(false);
                      }}
                      className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      <FaKey />
                      <span>Manage API Key</span>
                    </button>

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

      {/* --- RENDER API MODAL --- */}
      <ApiKeyModal 
        show={showApiModal} 
        onClose={() => setShowApiModal(false)}
        onSaveSuccess={() => {}}
      />
    </>
  );
};

export default Navbar;