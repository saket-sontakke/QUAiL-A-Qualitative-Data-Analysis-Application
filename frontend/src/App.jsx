import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import Signup from './pages/auth/Signup.jsx';
import Login from './pages/auth/Login.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import PrivateRoute from './pages/auth/PrivateRoute.jsx';
import Home from './pages/home/Home.jsx';
import Projects from './pages/project/Projects.jsx';
import CreateProject from './pages/project/CreateProject.jsx';
import EditProject from './pages/project/EditProject.jsx';
import ProjectView from './pages/layout/ProjectView.jsx';
import { ProjectContext } from './pages/ProjectContext.jsx';
import ThemeToggle from './pages/theme/ThemeToggle.jsx';

/**
 * The root component of the application.
 * It establishes the main routing structure using React Router, wraps the application
 * in a global ProjectContext, and includes a theme toggling component.
 * @returns {JSX.Element} The rendered application with all configured routes.
 */
const App = () => {
  const contextValue = {};

  return (
    <ProjectContext.Provider value={contextValue}>
      <BrowserRouter>
        <div className="relative min-h-screen">
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

              <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
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