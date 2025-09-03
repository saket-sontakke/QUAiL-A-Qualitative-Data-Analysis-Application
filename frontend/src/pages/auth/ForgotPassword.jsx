import { useState } from 'react';
import axios from 'axios';

/**
 * Renders a form for users to request a password reset link.
 * It captures the user's email, handles the API request to the backend,
 * and displays appropriate success, error, or loading states.
 * @returns {JSX.Element} The rendered forgot password form component.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Handles the form submission to request a password reset link.
   * It prevents the default form action, sets a loading state, sends a POST
   * request to the server with the user's email, and updates the UI with
   * the response message or an error.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/forgot-password`, { email });
      setMessage(res.data.message || 'Check your email for reset link.');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 transition-colors duration-500 dark:bg-gray-900">
      <div className="w-full max-w-md transform rounded-2xl bg-white p-8 shadow-xl transition duration-500 hover:scale-[1.015] dark:bg-gray-800">
        <h2 className="mb-6 text-center text-2xl font-bold text-[#1D3C87] dark:text-[#F05623]">Forgot Password</h2>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        {message && <p className="mb-4 text-sm text-green-500">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-[#F05623] py-2 px-4 font-semibold text-white shadow-md transition duration-300 hover:scale-105 hover:bg-[#d74918] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;