import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCopy, FaCheck, FaQuoteRight, FaExternalLinkAlt } from 'react-icons/fa';
import ThemeToggle from "../theme/ThemeToggle.jsx";

const ICCEPaper = () => {
  const [copied, setCopied] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const citationText = `Sontakke, S., Badhe, V., Paikrao, A., & Rajendran, R. (2025). QUAiL: A web-based qualitative analysis tool for textual data. In B. Jiang et al. (Eds.), Proceedings of the 33rd International Conference on Computers in Education. Asia-Pacific Society for Computers in Education. https://archive.org/details/w-05-02-quai-l-a-web-based-qualitative-analysis-tool-for-textual-data-icce-2025/`;

  const handleCopy = () => {
    navigator.clipboard.writeText(citationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
      
      {/* Navbar / Header */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-slate-200 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Left: Back Link */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-2 rounded-full bg-slate-100 dark:bg-gray-800 group-hover:bg-[#F05623]/10 transition-colors">
                <FaArrowLeft className="text-gray-600 dark:text-gray-400 group-hover:text-[#F05623]" />
              </div>
              <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-[#F05623] transition-colors hidden sm:inline">
                Home
              </span>
            </Link>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1 hidden sm:block"></div>
          </div>

          {/* Right: Theme Toggle */}
          <div className="flex items-center">
            <ThemeToggle navbar={true} />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#132142] dark:text-white mb-2">
            ICCE 2025 GenAIED Workshop Paper
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Read the official publication detailing the development and methodology behind QUAiL.
          </p>
        </motion.div>

        {/* Citation Box - Redesigned Layout */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-l-4 border-gray-200 dark:border-gray-700 border-l-[#F05623] p-6 mb-8"
        >
            {/* Top Row: Header and Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <FaQuoteRight className="text-[#F05623] opacity-80" size={20} />
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Cite this Work</h3>
                </div>

                <button
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm border shrink-0 ${
                    copied 
                        ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                        : "bg-white border-gray-200 text-gray-700 hover:border-[#F05623] hover:text-[#F05623] dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:border-[#F05623]"
                    }`}
                >
                    {copied ? <FaCheck /> : <FaCopy />}
                    {copied ? "Copied!" : "Copy Citation"}
                </button>
            </div>
            
            {/* Citation Text */}
            <div className="bg-slate-50 dark:bg-gray-900/50 p-4 rounded-xl border border-slate-200 dark:border-gray-700 font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-300 break-words">
                {citationText}
            </div>

            {/* Note Footer */}
            <div className="mt-3 flex items-start sm:items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-[#1D3C87] dark:text-blue-400 shrink-0">Note:</span>
                <span>If you use QUAiL in your research, please cite our paper to support the project.</span>
            </div>
        </motion.div>

        {/* PDF Embed */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-[800px] relative"
        >
           {/* Loading / Fallback Layer */}
           <div className="absolute inset-0 flex items-center justify-center -z-10">
              <p className="text-gray-400 animate-pulse">Loading Document...</p>
           </div>

           <iframe 
             src="https://archive.org/embed/w-05-02-quai-l-a-web-based-qualitative-analysis-tool-for-textual-data-icce-2025" 
             width="100%" 
             height="100%" 
             frameBorder="0" 
             allowFullScreen 
             title="QUAiL ICCE 2025 Paper"
             className="w-full h-full"
           ></iframe>
        </motion.div>

        <div className="mt-6 text-center">
            <a 
                href="https://archive.org/details/w-05-02-quai-l-a-web-based-qualitative-analysis-tool-for-textual-data-icce-2025/mode/2up" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1D3C87] dark:text-blue-400 hover:underline transition-colors"
            >
                View on Internet Archive <FaExternalLinkAlt size={12}/>
            </a>
        </div>

      </main>
    </div>
  );
};

export default ICCEPaper;