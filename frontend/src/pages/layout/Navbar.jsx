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
  FaKey,
  FaTrash,
  FaTimes,
  FaExclamationTriangle
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
  
  // -- State --
  const [showProfile, setShowProfile] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false); 
  const [showApiModal, setShowApiModal] = useState(false);
  
  // -- Delete Account State --
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState('');
  const [liabilityChecked, setLiabilityChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    if (typeof onLogoutAttempt === 'function') {
      onLogoutAttempt();
      return;
    }

    // Use generic modal for simple logout
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

  // --- DELETE ACCOUNT LOGIC ---
  const handleDeleteClick = () => {
    setShowProfile(false);
    setDeleteConfirmationEmail(''); // Reset input
    setLiabilityChecked(false); // Reset checkbox
    setShowDeleteModal(true); // Open custom modal
  };

  const executeAccountDeletion = async () => {
    if (deleteConfirmationEmail !== user?.email || !liabilityChecked) return;

    setIsDeleting(true);
    try {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/auth/delete-account`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setShowDeleteModal(false);
      logout();
      navigate('/');
    } catch (err) {
      console.error("Delete account failed:", err);
      alert("Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
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
      // Fallback simple alert if modal props missing
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
                    className="absolute right-0 z-50 mt-2 w-58 rounded-lg bg-white p-4 shadow-xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
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

                    <div className="my-2 border-t border-gray-200 dark:border-gray-600"></div>

                    {/* DELETE ACCOUNT - Text Link Style */}
                    <button
                      onClick={handleDeleteClick}
                      className="mb-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <FaTrash />
                      <span>Delete Account</span>
                    </button>

                    {/* LOGOUT - Solid Red Button (Restored) */}
                    <button
                      onClick={handleLogout}
                      className="w-full rounded-md bg-red-600 py-2 font-bold text-white shadow transition-all duration-200 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
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

      {/* --- CUSTOM DELETE ACCOUNT MODAL --- */}
      {showDeleteModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
             {/* Header */}
             <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
               <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full text-red-600 dark:text-red-200">
                 <FaExclamationTriangle className="text-lg" />
               </div>
               <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Delete Account</h3>
               <button 
                 onClick={() => setShowDeleteModal(false)}
                 className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
               >
                 <FaTimes />
               </button>
             </div>

             {/* Body */}
             <div className="p-6 space-y-5">
               
               {/* Step 1: Email Confirmation */}
               <div className="space-y-2">
                 <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                   To confirm, type your email below:
                 </label>
                 <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 text-center font-mono text-sm select-all">
                   {user?.email}
                 </div>
                 <input
                   type="text"
                   name="delete_confirmation_random_id" 
                   autoComplete="off"
                   data-lpignore="true"
                   placeholder="Type your email here"
                   value={deleteConfirmationEmail}
                   onChange={(e) => setDeleteConfirmationEmail(e.target.value)}
                   className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                   autoFocus
                 />
               </div>

               {/* Step 2: Liability Checkbox */}
               <div 
                 onClick={() => setLiabilityChecked(!liabilityChecked)}
                 className="flex items-start gap-3 p-3 rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
               >
                 <div className="pt-0.5">
                   <input 
                     type="checkbox" 
                     checked={liabilityChecked}
                     onChange={() => {}} // Handled by parent div
                     className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                   />
                 </div>
                 <p className="text-sm text-gray-700 dark:text-gray-300 select-none">
                   I understand that all my projects, files, and data will be permanently wiped from QUAiL servers and <span className="font-bold text-red-600 dark:text-red-400">cannot be recovered</span>.
                 </p>
               </div>

             </div>

             {/* Footer */}
             <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
               <button
                 onClick={() => setShowDeleteModal(false)}
                 className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={executeAccountDeletion}
                 disabled={!liabilityChecked || deleteConfirmationEmail !== user?.email || isDeleting}
                 className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
               >
                 {isDeleting ? (
                   <>Processing...</>
                 ) : (
                   <>
                     <FaTrash className="text-xs" /> Yes, Delete Everything
                   </>
                 )}
               </button>
             </div>
           </div>
         </div>
      )}
    </>
  );
};

export default Navbar;