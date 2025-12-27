import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import PrivacyPolicy from '../home/PrivacyPolicy.jsx';

const Signup = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // -- Modal & Privacy States --
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasReadPolicy, setHasReadPolicy] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const initiateSignup = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Reset read state every time modal opens
    setHasReadPolicy(false);
    setShowPrivacyModal(true);
  };

  const finalizeSignup = async () => {
    setShowPrivacyModal(false);
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, formData);
      setSuccessMessage("Registration successful! Please check your email to verify your account before logging in.");
      setFormData({ name: '', email: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  // Scroll detection
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // 5px tolerance
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      if (!hasReadPolicy) setHasReadPolicy(true);
    }
  };

  /**
   * Wrap the PrivacyPolicy component in a scrollable container
   */
  const PrivacyPolicyScrollableContent = (
    // Added 'relative' to parent so we can absolute position the message
    <div className="relative text-left bg-gray-50 dark:bg-gray-900/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
      <div 
        onScroll={handleScroll}
        className="custom-scrollbar overflow-y-auto max-h-[50vh]"
      >
        {/* Render the actual PrivacyPolicy component but styled for modal */}
        <div className="privacy-policy-modal-wrapper">
          <PrivacyPolicy isModal={true} />
        </div>
        
        {/* Spacer to ensure scroll hits bottom comfortably */}
        <div className="h-10"></div>
      </div>

      {/* --- ADDED: SCROLL INDICATOR --- */}
      {!hasReadPolicy && (
        <div className="absolute bottom-5 left-0 w-full flex justify-center pointer-events-none">
          <span className="bg-gray-800/90 text-white dark:bg-white/90 dark:text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg backdrop-blur-sm animate-bounce">
            Scroll to bottom to agree ↓
          </span>
        </div>
      )}
    </div>
  );

  if (successMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">Verify your Email</h2>
          <p className="mb-6 text-gray-600 dark:text-gray-300">{successMessage}</p>
          <Link to="/login" className="text-[#F05623] hover:underline font-medium">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 transition-colors duration-500 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl transition-all duration-500 hover:scale-[1.015] dark:bg-gray-800">
        <h2 className="mb-6 text-center text-3xl font-extrabold tracking-wide text-[#1D3C87] dark:text-[#F05623]">
          Create Account
        </h2>

        {error && <p className="mb-4 text-sm text-center text-red-500">{error}</p>}

        <form onSubmit={initiateSignup} className="space-y-6">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input
              type="text" name="name" id="name" required autoComplete="name"
              value={formData.name} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email" name="email" id="email" required autoComplete="username"
              value={formData.email} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} name="password" id="password" required autoComplete="new-password"
                value={formData.password} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 text-gray-900 dark:text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full transform rounded-xl bg-[#F05623] py-2 px-4 font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F05623] focus:ring-offset-2 hover:bg-[#d74918] dark:bg-[#F05623] dark:hover:bg-[#d74918] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-[#1D3C87] transition duration-200 hover:underline dark:text-[#F05623]">Login</a>
        </p>
      </div>

      <ConfirmationModal
        show={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onConfirm={finalizeSignup}
        title="Terms & Privacy Policy"
        shortMessage={PrivacyPolicyScrollableContent}
        confirmText="Agree & Register"
        showCheckbox={true}
        isCheckboxRequired={true}
        isCheckboxDisabled={!hasReadPolicy} 
        checkboxLabel="I have read and agree to the Privacy Policy"
        showCancelButton={true}
      />
    </div>
  );
};

export default Signup;