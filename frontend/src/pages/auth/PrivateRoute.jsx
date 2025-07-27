/**
 * @file PrivateRoute.jsx
 * @description This component acts as a guard for routes that require authentication.
 * It checks for the presence of an authentication token in localStorage. If the token
 * does not exist, it redirects the user to the login page. Otherwise, it renders
 * the intended child component.
 */

import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  // Retrieve the authentication token from local storage.
  const token = localStorage.getItem('token');

  // If no token is found, redirect the user to the root path (login page).
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // If a token exists, render the child component passed to the route.
  return children;
};

export default PrivateRoute;
