import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

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

const App = () => {
  const contextValue = {};

  return (
    <ProjectContext.Provider value={contextValue}>
      <ThemeProvider> 
        <BrowserRouter>
          <div className="relative min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
            <div className="fixed top-4 right-4 z-50">
              <ThemeToggle />
            </div>

            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/verify-email/:token" element={<VerifyEmail />} /> 

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