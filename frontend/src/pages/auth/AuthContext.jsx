import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * @description React Context for managing and providing authentication state
 * across the entire application.
 */
const AuthContext = createContext(null);

/**
 * A provider component that encapsulates the authentication logic and state.
 * It manages the user session, provides login/logout functions, and tracks the
 * initial loading state while checking for a persisted session.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components that will have access to the context.
 * @returns {JSX.Element} The AuthContext provider wrapping the children components.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Effect that runs on component mount to rehydrate authentication state.
   * It checks localStorage for a saved user session and updates the state
   * accordingly. This ensures user sessions persist across page reloads.
   */
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logs a user in by updating the user state and persisting the session data
   * to localStorage.
   * @param {object} userData - The user data object received upon successful login.
   */
  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  /**
   * Logs the current user out by clearing the user state and removing the session
   * data from localStorage.
   */
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user && !!user.token,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to provide easy access to the authentication context.
 * @returns {{
 * user: object|null,
 * isAuthenticated: boolean,
 * loading: boolean,
 * login: (userData: object) => void,
 * logout: () => void
 * }} The authentication context value.
 */
export const useAuth = () => {
  return useContext(AuthContext);
};