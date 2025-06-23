import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import './index.css'

import Signup from './pages/Signup'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
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
        <Route path="/home" element={<Home />} />
        <Route path="/create-project" element={<CreateProject/>} />
        <Route path="/edit-project/:id" element={<EditProject />} />
        <Route path="/project/:id" element={<ProjectView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App

