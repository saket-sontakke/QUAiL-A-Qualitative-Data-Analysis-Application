import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import './index.css'

import Signup from './pages/Signup.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import PrivateRoute from './pages/PrivateRoute.jsx';
import Home from './pages/Home.jsx'
import CreateProject from './pages/CreateProject.jsx';
import EditProject from './pages/EditProject.jsx';
import ProjectView from './pages/ProjectView.jsx';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route path="/home" element={<PrivateRoute> <Home /> </PrivateRoute>} />
        <Route path="/create-project" element={<PrivateRoute> <CreateProject/> </PrivateRoute>} />
        <Route path="/edit-project/:id" element={<PrivateRoute> <EditProject /> </PrivateRoute>} />
        <Route path="/project/:id" element={<PrivateRoute> <ProjectView /> </PrivateRoute> } />

      </Routes>
    </BrowserRouter>
  );
}

export default App

