import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import './index.css'

import Signup from './pages/Signup'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import PrivateRoute from './pages/PrivateRoute';
import Home from './pages/Home'
import CreateProject from './pages/CreateProject';
import EditProject from './pages/EditProject';
import ProjectView from './pages/ProjectView';

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

