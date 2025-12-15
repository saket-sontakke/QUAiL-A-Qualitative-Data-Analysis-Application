import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useScroll, useSpring, AnimatePresence } from "framer-motion";
import {
  FaArrowUp,
  FaYoutube,
  FaLinkedin,
  FaGlobe,
  FaArrowRight,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBug,
  FaUsers,
  FaChartLine,
  FaGithub, 
  FaFileAlt, 
  FaTools, 
  FaExternalLinkAlt, 
  FaUniversity
} from "react-icons/fa";
import { TbTargetArrow } from "react-icons/tb";
import { RiUploadCloud2Fill } from "react-icons/ri";
import { FaSitemap } from "react-icons/fa6";
import { LuWorkflow, LuMailCheck } from "react-icons/lu";
import { BiSolidBarChartAlt2 } from "react-icons/bi";
import { useAuth } from "../auth/AuthContext";
import Logo from "../theme/Logo.jsx";
import HomePageAnimation from "./HomePageAnimation";
import TextType from "./TextType.jsx";
import "./TextType.css";
import { CURRENT_VERSION } from '../../../version.js';

const smoothHoverProps = {
  whileHover: { 
    y: -10, 
    scale: 1.02,
    boxShadow: "0px 20px 30px -10px rgba(0, 0, 0, 0.15)"
  },
  transition: { 
    type: "spring", 
    stiffness: 250, 
    damping: 30 
  }
};

/* --- Updated: Bottom Bar for Stats & Copyright --- */
const FooterBottomBar = () => {
  const [stats, setStats] = useState({ visits: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const hasVisited = sessionStorage.getItem("hasVisited");
        const endpoint = hasVisited 
          ? `${BACKEND_URL}/api/site-stats` 
          : `${BACKEND_URL}/api/site-stats/increment`;

        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setStats({ 
            visits: data.totalVisits || 0, 
            users: data.totalUsers || 0 
          });
          sessionStorage.setItem("hasVisited", "true");
        }
      } catch (error) {
        console.error("Failed to fetch site stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [BACKEND_URL]);

  return (
    <div className="w-full bg-slate-100 dark:bg-black/20 border-t border-slate-200 dark:border-gray-800 py-6 mt-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Copyright Section */}
        <div className="text-sm text-gray-500 dark:text-gray-500 text-center md:text-left">
          <p>
            Copyright © {new Date().getFullYear()}
            {/* The link is added here: */}
            <a
              href="https://edarts.online/"
              target="_blank" // Optional: Opens the link in a new tab
              rel="noopener noreferrer" // Recommended for security when using target="_blank"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200"
            >
              {' '}Educational Data Analytics Research Tools (EDART)
            </a>
            .
          </p>
          <p className="text-xs mt-1 opacity-70">All rights reserved.</p>
        </div>

        {/* Horizontal Stats Section */}
        <div className="flex items-center gap-8 divide-x divide-gray-300 dark:divide-gray-700">
          
          <div className="flex items-center gap-3 pr-8 first:pl-0">
             <div className="text-[#1D3C87] dark:text-blue-400 opacity-80"><FaUsers size={28} /></div>
             <div className="flex flex-col">
               <span className="text-s font-bold text-gray-700 dark:text-gray-300 leading-none pb-1">
                  {loading ? "..." : stats.users}
                  <span className="text-[#F05623] text-xs align-top ml-0.5">+</span>
               </span>
               <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Registered Users</span>
             </div>
          </div>

          <div className="flex items-center gap-3 pl-1">
             <div className="text-[#FF7E39] opacity-80"><FaChartLine size={28} /></div>
             <div className="flex flex-col">
               <span className="text-s font-bold text-gray-700 dark:text-gray-300 leading-none pb-1">
                  {loading ? "..." : stats.visits.toLocaleString()}
               </span>
               <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Total Visits</span>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

/* --- Helper for Footer Links --- */
const FooterLink = ({ href, icon: Icon, text, external = true }) => (
  <a
    href={href}
    target={external ? "_blank" : "_self"}
    rel={external ? "noopener noreferrer" : ""}
    className="group flex items-center gap-2 text-gray-700 dark:text-gray-400 hover:text-[#1D3C87] dark:hover:text-blue-400 transition-colors py-1"
  >
    {Icon && <Icon className="text-gray-400 group-hover:text-[#F05623] transition-colors" size={14} />}
    <span className="text-sm font-medium">{text}</span>
    {external && <FaExternalLinkAlt className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]" />}
  </a>
);

/* --- Updated Footer Component --- */
const Footer = () => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 dark:bg-[#0B1120] dark:border-gray-800 pt-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Column 1: Brand Info (Stats moved to bottom) */}
          <div className="flex flex-col items-start mt-1">
            <div 
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} 
              className="flex items-center gap-3 cursor-pointer -mb-4"
            >
              <Logo className="h-20 w-20 md:h-32 md:w-32 text-[#132142] dark:text-gray-200 -translate-x-3 -translate-y-11" />
                <div className="flex flex-col items-start">
                    <h1 className="el-messiri-bold text-5xl md:text-6xl font-extrabold text-[#132142] dark:text-gray-200 leading-none -ml-12 -mt-10">
                        QUAiL
                    </h1>
                    <span className="el-messiri-bold md:text-1xl font-medium text-gray-500 dark:text-gray-400 tracking-wider ml-10 block min-h-[1.2em]">
                        {CURRENT_VERSION && CURRENT_VERSION.trim() !== "" ? CURRENT_VERSION : "\u00A0"}
                    </span>
                </div>
            </div>
            <p className="text-sm text-justify text-gray-600 dark:text-gray-400 leading-relaxed mb-4 max-w-xs">
              A Web-Based Qualitative Analysis Tool for Textual Data developed at the Centre for Educational Technology, IIT Bombay.
            </p>
          </div>

          {/* Column 2: Ecosystem */}
          <div className="lg:pl-18">
            <h4 className="text-[#132142] dark:text-white font-bold mb-6 flex items-center gap-2">
              <FaUniversity className="text-[#F05623]" /> The EDART Ecosystem
            </h4>
            <div className="flex flex-col gap-3">
              <FooterLink 
                href="https://edarts.online/" 
                text="EDART Home" 
                icon={TbTargetArrow}
              />
              <FooterLink 
                href="https://edarts.online/tools.html" 
                text="Explore All Tools" 
                icon={FaTools}
              />
              <FooterLink 
                href="https://edarts.online/about.html" 
                text="About Us" 
                icon={FaUsers}
              />
            </div>
          </div>

          {/* Column 3: Resources */}
          <div className="lg:pl-18">
            <h4 className="text-[#132142] dark:text-white font-bold mb-6 flex items-center gap-2">
              <FaFileAlt className="text-[#F05623]" /> Resources
            </h4>
            <div className="flex flex-col gap-3">
              <FooterLink 
                href="https://archive.org/details/w-05-02-quai-l-a-web-based-qualitative-analysis-tool-for-textual-data-icce-2025/mode/2up" 
                text="ICCE 2025 Paper" 
                icon={FaFileAlt}
              />
              <FooterLink 
                href="https://github.com/EDART-Labs/QUAiL" 
                text="Documentation" 
                icon={FaGithub}
              />
            </div>
          </div>

          {/* Column 4: Connect */}
          <div className="lg:pl-4">
            <h4 className="text-[#132142] dark:text-white font-bold mb-4 flex items-center gap-2">
              <FaUsers className="text-[#F05623]" /> Connect
            </h4>
            <a 
              href="https://maps.app.goo.gl/bDQnLyMKRHej4Ucb8" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-700 dark:text-gray-400 hover:text-[#1D3C87] dark:hover:text-blue-400 mb-5 block transition-colors"
            >
              Centre for Educational Technology,<br />
              IIT Bombay, Mumbai - 400076
            </a>
            <div className="flex gap-4 mt-4">
              <a href="https://youtube.com/@educationaltechnology-iitb2594" target="_blank" rel="noopener noreferrer" 
                 className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-[#FF0000] hover:scale-110 transition-all">
                <FaYoutube size={20} />
              </a>
              <a href="https://www.linkedin.com/school/edtech-iitb/" target="_blank" rel="noopener noreferrer"
                 className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-[#0A66C2] hover:scale-110 transition-all">
                <FaLinkedin size={20} />
              </a>
              <a href="https://www.et.iitb.ac.in/" target="_blank" rel="noopener noreferrer"
                 className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-[#F05623] hover:scale-110 transition-all">
                <FaGlobe size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Inserted Bottom Bar here */}
      <FooterBottomBar />
    </footer>
  );
};

const ContactSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.2, once: true });

  const BUG_REPORT_URL = import.meta.env.VITE_GOOGLE_FORM_URL; 
  const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_FORM_URL;
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL;
  const CONTACT_EMAIL_2 = import.meta.env.VITE_CONTACT_EMAIL_2;

  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("idle"); 
  const [errorMessage, setErrorMessage] = useState(""); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong.");
      }
    } catch (error) {
      console.error("Network error:", error);
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  return (
    <section ref={ref} className="w-full relative z-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12" 
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[#132142] dark:text-gray-100 mb-4">
            Get in Touch
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Have questions about QUAiL? We're here to help.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-5 flex flex-col gap-6"
          >
            <motion.a 
              href="https://maps.app.goo.gl/bDQnLyMKRHej4Ucb8"
              target="_blank" 
              rel="noopener noreferrer"
              {...smoothHoverProps}
              className="flex items-start gap-4 p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer"
            >
              <div className="p-3 rounded-full bg-[#FF7E39]/10 text-[#FF7E39] shrink-0">
                <FaMapMarkerAlt size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200">Visit Us</h3>
                <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                  Centre for Educational Technology<br />
                  IIT Bombay, Mumbai - 400076
                </p>
              </div>
            </motion.a>

            <motion.div 
              {...smoothHoverProps}
              className="flex items-start gap-4 p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 cursor-default"
            >
              <div className="p-3 rounded-full bg-[#1D3C87]/10 text-[#1D3C87] dark:text-blue-400 shrink-0">
                <FaEnvelope size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200">Email Us</h3>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-base text-gray-500 dark:text-gray-400 hover:text-[#FF7E39] block transition-colors mt-1 break-all">
                  {CONTACT_EMAIL}
                </a>
                <a href={`mailto:${CONTACT_EMAIL_2}`} className="text-base text-gray-500 dark:text-gray-400 hover:text-[#FF7E39] block transition-colors mt-1 break-all">
                  {CONTACT_EMAIL_2}
                </a>
              </div>
            </motion.div>

            <motion.div 
              {...smoothHoverProps}
              className="flex items-start gap-4 p-6 rounded-2xl border border-[#FF7E39]/30 bg-[#FF7E39]/5 cursor-default"
            >
              <div className="p-3 rounded-full bg-[#FF7E39]/20 text-[#FF7E39] shrink-0">
                <FaBug size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-200">Feedback & Support</h3>
                <p className="text-sm text-gray-500 mb-3">Found a bug or have a feature request?</p>
                <div className="flex flex-wrap gap-4">
                    <a href={BUG_REPORT_URL} target="_blank" rel="noopener noreferrer" className="text-base font-bold text-[#FF7E39] hover:underline flex items-center gap-1">
                      Report Bug <FaArrowRight size={14} />
                    </a>
                    <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="text-base font-bold text-[#1D3C87] dark:text-blue-400 hover:underline flex items-center gap-1">
                      General Feedback <FaArrowRight size={14} />
                    </a>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            whileHover={smoothHoverProps.whileHover}
            transition={{ 
                opacity: { duration: 0.5, delay: 0.2 },
                x: { duration: 0.5, delay: 0.2 },
                scale: smoothHoverProps.transition,
                y: smoothHoverProps.transition,
                boxShadow: smoothHoverProps.transition
            }}
            className="lg:col-span-7 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700"
          >
            {status === "success" ? (
              <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                <div className="text-[#FF7E39] text-6xl mb-6">
                  <LuMailCheck  />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white">Message Sent!</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg mt-3">
                  Thank you for reaching out. We'll get back to you shortly.
                </p>
                <button 
                  onClick={() => { setStatus("idle"); setFormData({ name: "", email: "", message: "" }); }}
                  className="mt-8 px-6 py-2 rounded-full border border-[#1D3C87] text-[#1D3C87] dark:text-blue-400 dark:border-blue-400 text-base font-bold uppercase tracking-wide hover:bg-[#1D3C87]/5 transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <label className="text-sm uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider ml-1">Name</label>
                      <input
                      type="text" required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:border-[#FF7E39] focus:ring-2 focus:ring-[#FF7E39]/20 outline-none text-base transition-all placeholder-gray-400"
                      placeholder="Your Name"
                      />
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider ml-1">Email</label>
                      <input
                      type="email" required
                      pattern="[^@\s]+@[^@\s]+\.[^@\s]+" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:border-[#FF7E39] focus:ring-2 focus:ring-[#FF7E39]/20 outline-none text-base transition-all placeholder-gray-400"
                      placeholder="you@example.com"
                      />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider ml-1">Message</label>
                  <textarea
                    rows="5" required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:border-[#FF7E39] focus:ring-2 focus:ring-[#FF7E39]/20 outline-none resize-none text-base transition-all placeholder-gray-400 min-h-[120px] custom-scrollbar"
                    placeholder="How can we help you?"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full py-4 rounded-xl bg-linear-to-r from-[#1D3C87] to-[#F05623] text-white text-lg font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Sending..." : "Send Message"}
                </button>
                {status === "error" && (
                  <p className="text-red-500 text-center text-sm mt-3 bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">{errorMessage || "Error sending message."}</p>
                )}
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  const { isAuthenticated } = useAuth();
  
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const contactRef = useRef(null);
  
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  
  const [typingDone, setTypingDone] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isBottom = 
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50;
      
      setShowBackToTop(isBottom);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (!window.location.hash) {
        window.scrollTo(0, 0);
    }

    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
        window.scrollTo(0, 0);
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const features = [
    {
      icon: <RiUploadCloud2Fill className="w-12 h-12 text-[#FF7E39]" />,
      title: "Import & Transcribe",
      desc: "Seamlessly import text and audio files. Our built-in transcription service converts interviews into analyzable text immediately.",
    },
    {
      icon: <FaSitemap className="w-12 h-12 text-[#FF7E39]" />,
      title: "Dynamic Analysis",
      desc: "Code text with a contextual, on-the-fly toolbar. Effortlessly manage your codebook with powerful merge and split features.",
    },
    {
      icon: <BiSolidBarChartAlt2 className="w-12 h-12 text-[#FF7E39]" />,
      title: "Validate with Statistics",
      desc: "Bridge qualitative insights and quantitative validation. Run statistical tests with a guided workflow and export results.",
    },
    {
      icon: <LuWorkflow className="w-12 h-12 text-[#FF7E39]" />,
      title: "Accessible & Intuitive",
      desc: "Designed for students, educators, and researchers. QUAiL eliminates the cost and learning curve of traditional qualitative software.",
    },
  ];

  return (
    <div className="relative w-full overflow-x-hidden bg-linear-to-b from-orange-50 via-slate-50 to-blue-50 dark:bg-none dark:bg-gray-950 text-gray-800 dark:text-white">
      
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[#F05623] origin-left z-50"
        style={{ scaleX }}
      />

      {/* Hero Section */}
      <div 
        ref={heroRef} 
        className="relative min-h-dvh w-full flex items-center pt-4 pb-12 bg-transparent dark:bg-linear-to-b dark:from-gray-950 dark:via-gray-900 dark:to-gray-900"
      >
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 px-6 lg:px-8 items-start">
          
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left order-2 lg:order-1">
            
            <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6 }}
                className="flex flex-row items-center gap-4 md:gap-6 mb-4 -translate-x-35"
            >
                <Logo className="h-20 w-20 md:h-70 md:w-70 text-[#132142] dark:text-gray-200 translate-x-18 -translate-y-7" />
                <div className="flex flex-col items-start">
                    <h1 className="el-messiri-bold text-5xl md:text-9xl font-extrabold text-[#132142] dark:text-gray-200 leading-none">
                        QUAiL
                    </h1>
                    <span className="el-messiri-bold md:text-3xl font-medium text-gray-500 dark:text-gray-400 tracking-wider ml-52 block min-h-[1.2em]">
                        {CURRENT_VERSION && CURRENT_VERSION.trim() !== "" ? CURRENT_VERSION : "\u00A0"}
                    </span>
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6, delay: 0.2 }} 
                className="mb-6 w-full max-w-2xl lg:translate-x-10 min-h-[225px] flex flex-col justify-center lg:justify-start"
            >
              <h2 className="text-3xl md:text-5xl lg:text-6xl julius-sans-one-regular font-extrabold leading-tight">
                <span className="flex flex-row items-start gap-3"> 
                  <i className="bx bxs-quote-left text-4xl md:text-6xl text-[#F05623] opacity-80 leading-none -translate-y-5" />
                  <span className="bg-linear-to-br from-[#1D3C87] to-[#F05623] bg-clip-text text-transparent dark:from-[#3b82f6] dark:via-[#FF7E39] dark:to-[#F05623]">
                    <TextType 
                        as="span" 
                        text={["Master", "Your", "Qualitative", "Workflow..."]} 
                        loop={false} 
                        typingSpeed={90} 
                        pauseDuration={120} 
                        className="font-extrabold inline-block" 
                        cursorClassName="bg-[#F05623]" 
                        onComplete={() => setTypingDone(true)} 
                    />
                  </span>
                </span>
              </h2>
            </motion.div>
          </div>

          <div className="flex flex-col items-center justify-center w-full order-1 lg:order-2 lg:mt-15">
            <motion.div 
                className="w-full max-w-md lg:max-w-xl lg:-translate-x-12 mt-8" 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.8, delay: 0.3 }}
            >
              <HomePageAnimation />
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-8 lg:-translate-x-12"
            >
              <Link to={isAuthenticated ? "/projects" : "/login"}>
                <motion.button 
                  whileHover={{ scale: 1.05, boxShadow: "0px 10px 20px -5px rgba(240, 86, 35, 0.4)" }} 
                  whileTap={{ scale: 0.95 }} 
                  className="group flex items-center gap-3 rounded-full bg-[#132142] dark:bg-white px-8 py-4 text-lg font-bold text-white dark:text-[#132142] shadow-lg transition-all duration-300"
                >
                  <span>Get Started</span>
                  <FaArrowRight className="transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section ref={featuresRef} className="py-18 bg-transparent dark:bg-gray-900">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
            >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Features That Empower Your Research
                </h2>
            </motion.div>
            
            <motion.div 
                variants={containerVariants} 
                initial="hidden" 
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
            >
                {features.map((feature, idx) => (
                <motion.div 
                    key={idx} 
                    variants={cardVariants} 
                    {...smoothHoverProps}
                    className="flex flex-col items-center text-center rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-sm border border-gray-100 dark:border-gray-700 h-full cursor-default"
                >
                    <div className="mb-6 p-4 rounded-full bg-[#FF7E39]/10">{feature.icon}</div>
                    <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
                ))}
            </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <div ref={contactRef} className="bg-transparent dark:bg-linear-to-b dark:from-gray-900 dark:to-black py-6 pb-18">
        <ContactSection />
      </div>

      {/* New Professional Footer */}
      <Footer />

      <AnimatePresence>
        {showBackToTop && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                title="Back to Top"
                className="fixed right-8 bottom-30 z-40 p-3 rounded-full bg-[#132142] dark:bg-white text-white dark:text-[#132142] shadow-lg cursor-pointer hover:bg-[#F05623] dark:hover:bg-[#F05623] dark:hover:text-white transition-colors"
            >
                <FaArrowUp size={20} />
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Home;

