import React, { useState } from 'react';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setMessage(res.data.message || 'Check your email for reset link.');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 transition-colors duration-500">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md transform transition duration-500 hover:scale-[1.015]">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#1D3C87] dark:text-[#F05623]">Forgot Password</h2>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        {message && <p className="text-sm text-green-500 mb-4">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87] transition duration-300"
          />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#F05623] hover:bg-[#d74918] text-white font-semibold rounded-lg shadow-md transition duration-300 hover:scale-105"
          >
            Send Reset Link
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
