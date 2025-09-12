import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import Signup from './pages/auth/Signup.jsx';
import Login from './pages/auth/Login.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import PrivateRoute from './pages/auth/PrivateRoute.jsx';
import Home from './pages/home/Home.jsx';
import Projects from './pages/project/Projects.jsx';
import ProjectView from './pages/layout/ProjectView.jsx';
import { ProjectContext } from './pages/ProjectContext.jsx';
import ThemeToggle from './pages/theme/ThemeToggle.jsx';

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
              <Route path="/project/:id" element={<PrivateRoute><ProjectView /></PrivateRoute>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ProjectContext.Provider>
  );
};

export default App;