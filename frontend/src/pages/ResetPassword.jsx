import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await axios.post(`http://localhost:5000/api/auth/reset-password/${token}`, { password });
      setMessage(res.data.message || 'Password reset successful');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 transition-colors duration-500">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md transform transition duration-500 hover:scale-[1.015]">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#1D3C87] dark:text-[#F05623]">Reset Password</h2>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        {message && <p className="text-sm text-green-500 mb-4">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87] transition duration-300"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87] transition duration-300"
          />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#F05623] hover:bg-[#d74918] text-white font-semibold rounded-lg shadow-md transition duration-300 hover:scale-105"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
