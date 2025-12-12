import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext.jsx';

/**
 * @description A functional component that handles user authentication via a login form.
 * It manages form state, handles API interactions for logging in, and manages UI states
 * for loading, errors, and unverified account scenarios.
 * * Key features:
 * - Email/Password authentication using the backend API.
 * - Password visibility toggle.
 * - Handling of unverified accounts (triggering a "Resend Verification" option).
 * - Integration with AuthContext to update global user state upon success.
 * * @returns {JSX.Element} The rendered login page component.
 */
const Login = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  /**
   * Updates the form data state as the user types.
   * Special Logic: If the user modifies the 'email' field, we assume they might be
   * correcting a typo, so we reset the verification requirements and error messages.
   * * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    if (e.target.name === 'email') {
        setNeedsVerification(false);
        setResendStatus('');
        setError('');
    }
  };

  /**
   * Triggers an API call to resend the verification email to the address currently
   * in the form state. Updates the `resendStatus` to reflect the progress/outcome.
   */
  const handleResend = async () => {
    setResendStatus('sending');
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/resend-verification`, { 
        email: formData.email 
      });
      setResendStatus('sent');
      setError('');
    } catch (err) {
      setResendStatus('error');
      setError(err.response?.data?.error || 'Failed to resend email');
    }
  };

  /**
   * Handles the form submission for logging in.
   * * Process:
   * 1. Validates inputs (implicit via HTML required attributes).
   * 2. Sends credentials to the backend login endpoint.
   * 3. On Success: updates the global AuthContext and navigates to the dashboard.
   * 4. On Failure: Checks if the error is due to an unverified email (401 + 'verify')
   * to conditionally render the "Resend Verification" button.
   * * @param {React.FormEvent} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
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
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);

      if (err.response?.status === 401 && errorMessage.toLowerCase().includes('verify')) {
        setNeedsVerification(true);
      }

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

        {/* Conditionally render Resend Verification button if account is unverified */}
        {needsVerification && resendStatus !== 'sent' && (
          <div className="mb-4 animate-fade-in text-center">
             <button
              type="button"
              onClick={handleResend}
              disabled={resendStatus === 'sending'}
              className="text-sm font-semibold dark:text-blue-400 text-blue-500 hover:underline disabled:opacity-50"
            >
              {resendStatus === 'sending' ? 'Sending email...' : 'Resend Verification Email?'}
            </button>
          </div>
        )}

        {/* Success message for email resend */}
        {resendStatus === 'sent' && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
            Link sent! Please check your inbox.
          </div>
        )}

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
              autoComplete="username" 
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 text-gray-900 dark:text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
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