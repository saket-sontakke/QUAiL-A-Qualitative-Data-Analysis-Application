// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';

// const Login = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);
//     try {
//       const res = await axios.post('http://localhost:5000/api/auth/login', formData);
//       // localStorage.setItem('token', res.data.token);
//       localStorage.setItem('token', res.data.token);
//       localStorage.setItem('user', JSON.stringify(res.data.user)); 
//       navigate('/home');
//     } catch (err) {
//       setError(err.response?.data?.error || 'Login failed');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4 transition-colors duration-500">
//       <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md transform transition duration-500 hover:scale-[1.015]">
//         <h2 className="text-3xl font-extrabold mb-6 text-center text-[#1D3C87] dark:text-[#F05623] tracking-wide">
//           Login
//         </h2>

//         {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div>
//             <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//               Email
//             </label>
//             <input
//               type="email"
//               name="email"
//               id="email"
//               required
//               value={formData.email}
//               onChange={handleChange}
//               className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87] transition duration-300"
//             />
//           </div>

//           <div>
//             <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//               Password
//             </label>
//             <input
//               type="password"
//               name="password"
//               id="password"
//               required
//               value={formData.password}
//               onChange={handleChange}
//               className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87] transition duration-300"
//             />
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full py-2 px-4 bg-[#F05623] hover:bg-[#d74918] text-white font-semibold rounded-lg shadow-md transition duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {loading ? 'Logging in...' : 'Login'}
//           </button>
//         </form>

//         <p className="text-sm mt-4 text-center text-gray-600 dark:text-gray-400">
//           Don’t have an account?{' '}
//           <a href="/signup" className="text-[#1D3C87] dark:text-[#F05623] hover:underline transition duration-200">
//             Sign up
//           </a>
//         </p>
//         <p className="text-sm text-center mt-2">
//           <a
//             href="/forgot-password"
//             className="text-gray-500 dark:text-gray-400 hover:underline transition duration-200"
//           >
//             Forgot password?
//           </a>
//         </p>
//       </div>
//     </div>
//   );
// };

// export default Login;




import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      // Store user data
      localStorage.setItem('user', JSON.stringify(res.data.user)); // <--- ADD THIS LINE
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4 transition-colors duration-500">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md transform transition duration-500 hover:scale-[1.015]">
        <h2 className="text-3xl font-bold mb-6 text-center text-[#1D3C87] dark:text-[#F05623]">
          Login
        </h2>

        {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
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
            className="w-full py-2 px-4 bg-[#F05623] hover:bg-[#d74918] text-white font-semibold rounded-lg shadow-md transition duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-sm mt-4 text-center text-gray-600 dark:text-gray-400">
          Don’t have an account?{' '}
          <a href="/signup" className="text-[#1D3C87] dark:text-[#F05623] hover:underline transition duration-200">
            Sign up
          </a>
        </p>
        <p className="text-sm text-center mt-2">
          <a href="/forgot-password" className="text-[#1D3C87] dark:text-[#F05623] hover:underline transition duration-200">
            Forgot Password?
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;