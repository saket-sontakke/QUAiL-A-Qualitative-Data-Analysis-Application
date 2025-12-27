import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { useState, useEffect } from 'react';
import Signup from './pages/auth/Signup.jsx';
import Login from './pages/auth/Login.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import VerifyEmail from './pages/auth/verifyEmail.jsx';
import PrivateRoute from './pages/auth/PrivateRoute.jsx';
import Home from './pages/home/Home.jsx';
import Projects from './pages/project/Projects.jsx';
import ProjectView from './pages/layout/ProjectView.jsx';
import { ProjectContext } from './pages/ProjectContext.jsx';
import ThemeToggle from './pages/theme/ThemeToggle.jsx';
import { ThemeProvider } from './pages/theme/ThemeContext.jsx'; 
import axios from 'axios';
import MobileOptimizationWarning from './pages/components/MobileOptimizationWarning.jsx';
import PrivacyPolicy from './pages/home/PrivacyPolicy.jsx';
import ICCEPaper from './pages/home/ICCEPaper.jsx';

/**
 * The root application component.
 * * This component initializes the global application state, including fetching backend configuration
 * for file limits. It sets up the global Context Providers (ProjectContext, ThemeProvider) and
 * defines the client-side routing structure using React Router.
 * * @returns {JSX.Element} The complete application tree wrapped in providers and router.
 */
const App = () => {
  
  // --- State Initialization ---
  const [fileLimits, setFileLimits] = useState({
      audioMB: 25, 
      textMB: 5, 
      projectMB: 15
    });

  // --- Configuration Retrieval ---
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get('/api/config');
        if (data?.limits) {
          setFileLimits(data.limits);
          console.log("Global file limits loaded:", data.limits);
        }
      } catch (err) {
        console.error("Failed to load backend config, using defaults:", err);
      }
    };

    fetchConfig();
  }, []);

  // --- Context Setup ---
  const contextValue = {fileLimits};

  return (
    <ProjectContext.Provider value={contextValue}>
      <ThemeProvider> 
        <BrowserRouter>
          <div className="relative min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
            
            {/* --- Global UI Elements --- */}
            <MobileOptimizationWarning />

            <div className="fixed top-4 right-4 z-50">
              <ThemeToggle />
            </div>

            {/* --- Route Definitions --- */}
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/verify-email/:token" element={<VerifyEmail />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/icce-2025-paper" element={<ICCEPaper />} />

                <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
                <Route path="/project/:id" element={<PrivateRoute><ProjectView /></PrivateRoute>} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ThemeProvider>
    </ProjectContext.Provider>
  );
};

export default App;