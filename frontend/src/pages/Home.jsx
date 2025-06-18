import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-500 px-6 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 40 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-4xl sm:text-5xl font-bold text-[#1D3C87] dark:text-[#F05623] mb-4">
          Welcome to Your App!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          MERN + Vite + Tailwindcss
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mt-16 text-sm text-gray-500 dark:text-gray-400 text-center"
      >
      </motion.div>
    </div>
  );
};

export default Home;
