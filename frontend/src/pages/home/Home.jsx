import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  FaArrowDown,
  FaArrowUp,
  FaYoutube,
  FaLinkedin,
  FaGlobe,
  FaArrowRight,
} from "react-icons/fa";
import { RiUploadCloud2Fill } from "react-icons/ri";
import { FaSitemap } from "react-icons/fa6";
import { LuWorkflow } from "react-icons/lu";
import { BiSolidBarChartAlt2 } from "react-icons/bi";
import { useAuth } from "../auth/AuthContext";
import Logo from "../theme/Logo.jsx";
import HomePageAnimation from "./HomePageAnimation";
import TextType from "./TextType.jsx";
import "./TextType.css";
import ETLogo from "./et-logo.png";
import etLogo from "./logo.png";


const Home = () => {
  const { isAuthenticated } = useAuth();
  const featuresRef = useRef(null);
  const [currentSection, setCurrentSection] = useState(0);

  const featuresContainerRef = useRef(null);
  const isInView = useInView(featuresContainerRef, { amount: 0.2 });

  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let isScrolling = false;
    const handleWheel = (e) => {
      if (isScrolling) return;
      isScrolling = true;
      if (e.deltaY > 0 && currentSection === 0) {
        setCurrentSection(1);
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
        });
      } else if (e.deltaY < 0 && currentSection === 1) {
        setCurrentSection(0);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setTimeout(() => {
        isScrolling = false;
      }, 800);
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentSection]);

  const scrollToFeatures = () => {
    setCurrentSection(1);
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  const scrollToTop = () => {
    setCurrentSection(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  };

  const features = [
    {
      icon: <RiUploadCloud2Fill className="w-10 h-10 text-[#FF7E39]" />,
      title: "Import & Transcribe",
      desc: "Seamlessly import text and audio files. Our built-in transcription service converts interviews into analyzable text, keeping all your data in one organized project.",
    },
    {
      icon: <FaSitemap className="w-10 h-10 text-[#FF7E39]" />,
      title: "Dynamic Analysis",
      desc: "Code text with a contextual, on-the-fly toolbar. Effortlessly manage your codebook with powerful features to merge, split, and refine codes as your insights evolve",
    },
    {
      icon: <BiSolidBarChartAlt2 className="w-10 h-10 text-[#FF7E39]" />,
      title: "Validate with Statistics",
      desc: "Bridge qualitative insights and quantitative validation. Run statistical tests with a guided workflow that checks assumptions and presents results with interactive charts.",
    },
    {
      icon: <LuWorkflow className="w-10 h-10 text-[#FF7E39]" />,
      title: "Accessible & Intuitive",
      desc: "Designed for students, educators, and researchers. QUAiL eliminates the cost and learning curve of traditional software with an intuitive, all-in-one web platform.",
    },
  ];

  return (
    <div className="relative w-full overflow-x-hidden text-gray-800 dark:text-white">
      <div className="relative flex h-screen w-full items-start pt-24 bg-gradient-to-b from-gray-100 via-white to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-8 px-6 md:grid-cols-2 md:gap-16 md:px-15">
          <div className="relative flex flex-col items-center text-center md:items-start md:text-left md:pl-1">
            <div className="absolute md:-top-24 md:left-[-80px] z-30 flex items-center">
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Logo className="md:h-62 md:w-62 text-[#132142] dark:text-gray-300 -translate-y-4" />
              </motion.div>

              <motion.span
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="el-messiri-bold text-5xl md:text-9xl font-extrabold text-[#132142] dark:text-gray-300 leading-tight -ml-10"
              >
                QUAiL
              </motion.span>
            </div>

            <div className="md:h-32" />

            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mb-8 w-full min-h-[7rem] md:min-h-[8rem] max-w-prose"
            >
              <h1 className="text-4xl md:text-7xl julius-sans-one-regular font-extrabold">
                <span className="flex items-start gap-2">
                  <i className="bx bxs-quote-left text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[#1D3C87] to-[#F05623] dark:from-[#F05623] dark:to-[#1D3C87]" />
                  <span className="bg-gradient-to-br from-[#1D3C87] to-[#F05623] bg-clip-text text-transparent dark:from-[#1D3C87] dark:via-[#FF7E39] dark:to-[#F05623]">
                    <TextType
                      as="span"
                      text={["Master", "Your", "Qualitative", "Workflow..."]}
                      loop={false}
                      typingSpeed={70}
                      pauseDuration={150}
                      className="font-extrabold inline-block w-full"
                      cursorClassName="bg-gradient-to-br from-[#1D3C87] to-[#F05623] bg-clip-text text-transparent dark:from-[#1D3C87] dark:via-[#FF7E39] dark:to-[#F05623]"
                      onComplete={() => setTypingDone(true)}
                    />
                  </span>
                </span>
              </h1>
            </motion.div>
          </div>

          {/* RIGHT: animation and new button */}
          <div className="flex flex-col items-center">
            <motion.div
              className="max-w-4xl justify-self-center md:translate-y-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <HomePageAnimation />
            </motion.div>

            {/* GET STARTED BUTTON */}
            <motion.div
              className="md:mt-11"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <Link to={isAuthenticated ? "/projects" : "/login"}>
                <motion.div
                  animate={{ y: [0, -15] }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                    repeat: Infinity,
                    repeatType: "mirror",
                  }}
                  whileHover={{
                    scale: 1.05,
                    y: -3,
                    boxShadow: "0px 10px 30px -5px rgba(240, 86, 35, 0.4)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="group flex items-center gap-3 rounded-full bg-black/5 dark:bg-white/10 px-6 py-3 text-lg font-semibold text-gray-800 dark:text-gray-200 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-transparent hover:bg-[#F05623] hover:text-white dark:hover:bg-[#F05623]"
                >
                  <span>Get Started</span>
                  <FaArrowRight className="transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div ref={featuresRef} className="bg-gray-200 dark:bg-gray-900">
        <section className="px-6 py-16">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-gray-300">
            Features That Empower Your Research
          </h2>
          <motion.div
            ref={featuresContainerRef}
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-xl bg-gray-100 p-6 text-center shadow-lg dark:bg-gray-800"
              >
                <div className="mb-4 flex justify-center">{feature.icon}</div>
                <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-400 bg-gray-200 py-1 dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-y-3 px-6 md:flex-row">
            <div className="flex items-center">
              <Logo className="h-22 w-22 text-[#132142] dark:text-gray-300 -translate-y-1" />
              <span className="el-messiri-bold -ml-3.5 text-4xl font-extrabold leading-none text-[#132142] dark:text-gray-300">
                QUAiL
              </span>
            </div>

            <div className="flex items-center gap-x-2">
              <div className="flex flex-col items-center md:items-end -translate-y-1">
                <a
                  href="https://sites.google.com/view/learning-analytics-iitb/team-members"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 text-lg font-medium text-gray-700 transition-colors hover:text-[#FF7E39] dark:text-gray-300"
                >
                  About Us
                </a>
                <div className="flex items-center space-x-6 text-gray-600 dark:text-gray-400">
                  <a
                    href="https://youtube.com/@educationaltechnology-iitb2594?si=OrDsiZlJj1VD1OwB"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="transition-transform hover:scale-110"
                  >
                    <FaYoutube size={22} className="hover:text-[#FF0000]" />
                  </a>
                  <a
                    href="https://www.linkedin.com/school/edtech-iitb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="transition-transform hover:scale-110"
                  >
                    <FaLinkedin size={22} className="hover:text-[#0A66C2]" />
                  </a>
                  <a
                    href="https://www.et.iitb.ac.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Website"
                    className="transition-transform hover:scale-110"
                  >
                    <FaGlobe size={22} className="hover:text-[#FF7E39]" />
                  </a>
                </div>
              </div>
              {/* <img 
                src={etLogo} 
                alt="ET Department Logo" 
                className="h-25 w-25 -translate-y-1"
              /> */}
            </div>
          </div>
        </footer>
      </div>

      {/* SMOOTH Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          top: currentSection === 0 ? "auto" : "2rem",
          bottom: currentSection === 0 ? "2rem" : "auto",
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        onClick={currentSection === 0 ? scrollToFeatures : scrollToTop}
        className="fixed left-1/2 z-50 -translate-x-1/2 cursor-pointer text-gray-500 transition-colors duration-300 hover:text-[#F05623]"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
          }}
        >
          {currentSection === 0 ? (
            <FaArrowDown size={28} />
          ) : (
            <FaArrowUp size={28} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;




