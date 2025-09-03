import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';

/**
 * Renders the user login page. It provides a form for users to enter their
 * credentials, handles the authentication request to the backend, and uses
 * the AuthContext to manage the user's session upon a successful login.
 * @returns {JSX.Element} The rendered login page component.
 */
const Login = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Updates the form data state as the user types in the input fields.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * Handles the form submission for user login. It sends the user's credentials
   * to the backend API. On success, it updates the authentication context with
   * the user's data and token, then navigates to the projects page. On failure,
   * it displays an error message.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/login`, formData);

      const userToStore = {
        ...res.data.user,
        token: res.data.token
      };

      auth.login(userToStore);
      navigate('/projects');

    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 transition-colors duration-500 dark:bg-gray-900">
      <div className="w-full max-w-md transform rounded-2xl bg-white p-8 shadow-xl transition duration-500 hover:scale-[1.015] dark:bg-gray-800">
        <h2 className="mb-6 text-center text-3xl font-bold text-[#1D3C87] dark:text-[#F05623]">
          Login
        </h2>

        {error && <p className="mb-4 text-center text-sm text-red-500">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#F05623] py-2 px-4 font-semibold text-white shadow-md transition duration-300 hover:scale-105 hover:bg-[#d74918] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Don’t have an account?{' '}
          <a href="/signup" className="text-[#1D3C87] transition duration-200 hover:underline dark:text-[#F05623]">
            Sign up
          </a>
        </p>
        <p className="mt-2 text-center text-sm">
          <a href="/forgot-password" className="text-[#1D3C87] transition duration-200 hover:underline dark:text-[#F05623]">
            Forgot Password?
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;