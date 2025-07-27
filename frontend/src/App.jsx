/**
 * @file App.jsx
 * @description This is the main entry point component for the React application.
 * It sets up the global context, defines the application's routing structure,
 * and renders the primary layout, including the theme toggle.
 */

// --------------------------------------------------------------------------------
// Imports
// --------------------------------------------------------------------------------

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Page and Component Imports
import Signup from './pages/auth/Signup.jsx';
import Login from './pages/auth/Login.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import PrivateRoute from './pages/auth/PrivateRoute.jsx';
import Home from './pages/Home.jsx';
import CreateProject from './pages/project/CreateProject.jsx';
import EditProject from './pages/project/EditProject.jsx';
import ProjectView from './pages/layout/ProjectView.jsx';
import { ProjectContext } from './pages/ProjectContext.jsx';
import ThemeToggle from './pages/theme/ThemeToggle.jsx';

// --------------------------------------------------------------------------------
// App Component
// --------------------------------------------------------------------------------

const App = () => {
  const contextValue = {};

  return (
    // ProjectContext provides a shared state to all descendant components.
    <ProjectContext.Provider value={contextValue}>
      {/* BrowserRouter enables client-side routing for the application. */}
      <BrowserRouter>
        <div className="relative min-h-screen">
          <div className="absolute top-4 right-4 z-10">
            <ThemeToggle />
          </div>

          <main>
            <Routes>
              {/* Public routes accessible to all users. */}
              <Route path="/" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Protected routes requiring authentication. */}
              <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/create-project" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
              <Route path="/edit-project/:id" element={<PrivateRoute><EditProject /></PrivateRoute>} />
              <Route path="/project/:id" element={<PrivateRoute><ProjectView /></PrivateRoute>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ProjectContext.Provider>
  );
};

export default App;
