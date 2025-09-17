import { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Renders a form for users to reset their password using a token provided
 * in the URL. It handles password confirmation, communicates with the backend
 * API to update the password, and provides feedback to the user.
 * @returns {JSX.Element} The rendered password reset component.
 */
const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  /**
   * Handles the form submission to set a new password. It validates that the
   * passwords match and sends a request to the server with the new password
   * and reset token. On success, it displays a message and redirects to the
   * login page.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/reset-password/${token}`, { password });
      setMessage(res.data.message || 'Password reset successful');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 transition-colors duration-500 dark:bg-gray-900">
      <div className="w-full max-w-md transform rounded-2xl bg-white p-8 shadow-xl transition duration-500 hover:scale-[1.015] dark:bg-gray-800">
        <h2 className="mb-6 text-center text-2xl font-bold text-[#1D3C87] dark:text-[#F05623]">Reset Password</h2>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        {message && <p className="mb-4 text-sm text-green-500">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-[#F05623] py-2 px-4 font-semibold text-white shadow-md transition duration-300 hover:scale-105 hover:bg-[#d74918]"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;