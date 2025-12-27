import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const MobileOptimizationWarning = () => {
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();

  // REMOVED '/' from this list because it acts as a wildcard
  const safeRoutes = [
    '/home',
    '/login',
    '/signup',
    '/forgot-password',
    '/verify-email',
    '/reset-password',
    '/privacy-policy',
    '/icce-2025-paper'
  ];

  const isMobileDevice = () => {
    return window.innerWidth < 1024;
  };

  const isSafeRoute = (currentPath) => {
    // 1. Check EXACT match for the root path
    if (currentPath === '/') return true;

    // 2. Check "startsWith" for other public routes
    return safeRoutes.some(route => currentPath.startsWith(route));
  };

  useEffect(() => {
    const checkconstraints = () => {
      // Logic: If Mobile AND NOT Safe Route -> Show Modal
      if (isMobileDevice() && !isSafeRoute(location.pathname)) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    };

    checkconstraints();
    window.addEventListener('resize', checkconstraints);
    return () => window.removeEventListener('resize', checkconstraints);
  }, [location]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
          <svg className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25" />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Desktop Experience Recommended
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            For the best experience, this application is optimized for desktop/laptop displays. 
            <br/>
          </p>
        </div>
        <button
          onClick={() => setShowModal(false)}
          className="w-full rounded-lg bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-gray-800 dark:hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-all"
        >
          I Understand
        </button>
      </div>
    </div>
  );
};

export default MobileOptimizationWarning;