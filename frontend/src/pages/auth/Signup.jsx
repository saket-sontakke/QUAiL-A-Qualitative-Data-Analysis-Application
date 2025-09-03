import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Renders the user registration page. It provides a form for new users to
 * create an account. Upon successful registration, it automatically logs the
 * user in using the AuthContext and navigates them to the projects page.
 * @returns {JSX.Element} The rendered signup page component.
 */
const Signup = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Updates the form data state as the user types in the input fields.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  /**
   * Handles the form submission for user registration. It sends the user's
   * details to the backend API. On success, it logs the user in via the
   * AuthContext and redirects them to the main application. On failure,
   * it displays an error message.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, formData);

      const userToStore = {
        ...res.data.user,
        token: res.data.token
      };

      auth.login(userToStore);
      navigate('/projects');

    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 transition-colors duration-500 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl transition-all duration-500 hover:scale-[1.015] dark:bg-gray-800">
        <h2 className="mb-6 text-center text-3xl font-extrabold tracking-wide text-[#1D3C87] dark:text-[#F05623]">
          Create Account
        </h2>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
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
            className="w-full transform rounded-xl bg-[#F05623] py-2 px-4 font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F05623] focus:ring-offset-2 hover:bg-[#d74918] dark:bg-[#F05623] dark:hover:bg-[#d74918] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-[#1D3C87] transition duration-200 hover:underline dark:text-[#F05623]">
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;