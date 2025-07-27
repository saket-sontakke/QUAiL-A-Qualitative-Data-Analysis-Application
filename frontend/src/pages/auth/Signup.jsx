/**
 * @file Signup.jsx
 * @description This component renders the user registration page. It includes a
 * form for name, email, and password, handles form submission, creates a new
 * user via the backend, and manages the user session.
 */

import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const navigate = useNavigate();
  // State for form data, submission errors, and loading status.
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Updates the form data state as the user types.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  /**
   * Handles the registration form submission.
   * On success, it stores the new user's auth token and navigates to the login page.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, formData);
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4 transition-colors duration-500">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md transition-all duration-500 hover:scale-[1.015]">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-[#1D3C87] dark:text-[#F05623] tracking-wide">
          Create Account
        </h2>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87] transition duration-300"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87] transition duration-300"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87] transition duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 
                      bg-[#F05623] 
                      hover:bg-[#d74918] 
                      text-white font-semibold 
                      rounded-xl 
                      shadow-md 
                      transition-all duration-300 
                      transform hover:scale-105 hover:shadow-lg 
                      focus:outline-none focus:ring-2 focus:ring-[#F05623] focus:ring-offset-2 
                      dark:bg-[#F05623] 
                      dark:hover:bg-[#d74918] 
                      disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-sm mt-4 text-center text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/" className="text-[#1D3C87] dark:text-[#F05623] hover:underline transition duration-200">
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
