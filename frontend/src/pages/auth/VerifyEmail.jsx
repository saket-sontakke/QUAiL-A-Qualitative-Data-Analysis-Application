import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

/**
 * @description A functional component that handles the email verification process.
 * It is typically the destination page when a user clicks the verification link sent to their email.
 * * Key features:
 * - Extracts the verification token from the URL parameters.
 * - Prevents duplicate API calls using a ref (React Strict Mode guard).
 * - Manages UI states for loading (spinner), success, and error scenarios.
 * * @returns {JSX.Element} The rendered verification status page.
 */
const VerifyEmail = () => {
  const { token } = useParams();
  
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  
  /**
   * Ref to track if the verification logic has already been executed.
   * This is crucial for preventing the useEffect from firing twice in React.Strict Mode,
   * which could cause race conditions or false negatives (e.g., token invalid because it was just used).
   */
  const processedRef = useRef(false);

  /**
   * Effect that triggers the account verification immediately upon component mount.
   * It ensures the API call is made only once per mount lifecycle.
   */
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const verifyAccount = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed or link expired.');
      }
    };

    if (token) {
      verifyAccount();
    }
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center dark:bg-gray-800">
        
        {/* LOADING STATE: Displayed while the API call is in progress */}
        {status === 'verifying' && (
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#F05623] border-t-transparent mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Verifying your email...</h2>
          </div>
        )}

        {/* SUCCESS STATE: Displayed when the backend confirms valid token */}
        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">Verified!</h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300">{message}</p>
            <Link 
              to="/login" 
              className="rounded-lg bg-[#F05623] px-6 py-2 font-semibold text-white shadow-md transition hover:bg-[#d74918]"
            >
              Go to Login
            </Link>
          </div>
        )}

        {/* ERROR STATE: Displayed if token is invalid, expired, or server fails */}
        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">Verification Failed</h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300">{message}</p>
            <Link 
              to="/signup" 
              className="text-[#1D3C87] hover:underline dark:text-[#F05623]"
            >
              Back to Sign Up
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default VerifyEmail;