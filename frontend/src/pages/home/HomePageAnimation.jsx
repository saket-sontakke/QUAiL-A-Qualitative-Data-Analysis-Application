import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuMousePointer2, LuTextCursor } from "react-icons/lu";
import {
  FaStickyNote,
  FaHighlighter,
  FaFileUpload,
  FaMicrophoneAlt,
  FaPlay,
  FaSpinner,
  FaChartBar,
  FaChartPie,
  FaCloud,
} from "react-icons/fa";
import { TbRewindForward10, TbRewindBackward10, TbChartRadar } from "react-icons/tb";
import { BsKanban } from "react-icons/bs";
import { MdCode } from "react-icons/md";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell,
  PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, Radar, Treemap,
  ComposedChart, Line, Area, CartesianGrid, ReferenceLine, Label
} from 'recharts';
import Logo from "../theme/Logo";
import { CURRENT_VERSION } from '../../../version.js';

// ============================================================================
//  CONFIGURATIONS & CONSTANTS
// ============================================================================

const TIMING_CONFIG = {
  SCENE_PAUSE_LONG: 1500,
  CHART_DISPLAY_TIME: 250,
  STATS_SCENE_TIME: 2500,
  LOGO_SCENE_TIME: 1800,
  CURSOR_MOVE_SPEED: 700,
  TEXT_SELECT_SPEED: 800,
  SCENE_TRANSITION: 0.4,
  CHART_TRANSITION: 0.4,
  VISUALIZATION_ICONS_DISPLAY_TIME: 2000,
};

const PRE_TEXT =
  "Bring your entire research workflow together with QUAiL. From raw transcripts to rich analysis, seamlessly uniting all the qualitative data analysis needs in a single platform. ";
const HIGHLIGHT_TEXT = "Transcribe, code, visualize, and validate";
const POST_TEXT =
  " with integrated statistical tools in an intutive, user-friendly workspace.";

const CODES = {
  FEATURES: { name: "Cool Features", color: "#E57373" },
  FREE_ACCESS: { name: "Free Access", color: "#A1887F" },
  EASE_OF_USE: { name: "Ease-of-use", color: "#9575CD" },
};

const SELECTED_CODE = CODES.FEATURES;

const ANIMATION_SCENES = {
  LOGO: "LOGO",
  TAGLINE: "TAGLINE",
  IMPORT: "IMPORT",
  LOADING: "LOADING",
  WORKSPACE: "WORKSPACE",
  VISUALIZATION: "VISUALIZATION",
  STATISTICS: "STATISTICS",
};

const WORKSPACE_STEPS = {
  IDLE: "IDLE",
  SELECTING: "SELECTING",
  TOOLBAR_VISIBLE: "TOOLBAR_VISIBLE",
  PANEL_VISIBLE: "PANEL_VISIBLE",
  CODED: "CODED",
};

const VISUALIZATION_STEPS = {
    IDLE: 'IDLE',
};

const DIST_CHART_DATA_DF5 = [
  { x: 0, y: 0 }, { x: 1, y: 0.13 }, { x: 2, y: 0.19 }, { x: 3, y: 0.21 },
  { x: 5, y: 0.15 }, { x: 8, y: 0.08 }, { x: 11.07, y: 0.04, area: 0.04 },
  { x: 14, y: 0.02, area: 0.02 }, { x: 18, y: 0.005, area: 0.005 }, { x: 22, y: 0, area: 0 }
];


// ============================================================================
//  CHILD & HELPER COMPONENTS
// ============================================================================

const SceneWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: TIMING_CONFIG.SCENE_TRANSITION, ease: "easeInOut" }}
    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
  >
    {children}
  </motion.div>
);

const StaticAudioPlayer = () => (
  <div className="absolute bottom-0 left-1 right-1 flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white/70 p-2 text-gray-800 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/70 dark:text-gray-200">
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-900 text-white dark:bg-[#F05623]">
      <FaPlay size={16} className="ml-0.5" />
    </div>
    <button>
      <TbRewindBackward10 size={24} />
    </button>
    <button>
      <TbRewindForward10 size={24} />
    </button>
    <div className="flex flex-1 items-center gap-4">
      <span className="w-14 shrink-0 text-right font-mono text-sm">06:12</span>
      <div className="group relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600">
        <div className="h-full rounded-full bg-cyan-900 dark:bg-[#F05623]" style={{ width: "68.5%" }} />
      </div>
      <span className="w-12 shrink-0 font-mono text-sm">09:03</span>
    </div>
  </div>
);

const StaticChiSquareDistributionChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={DIST_CHART_DATA_DF5} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis type="number" dataKey="x" domain={[0, 'dataMax']} fontSize={12} stroke="#9CA3AF" label={{ value: "Chi-Square Value (χ²)", position: 'insideBottom', offset: -2, fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis domain={[0, 0.25]} fontSize={12} stroke="#9CA3AF" label={{ value: 'Probability Density', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12, dy: 70, dx: -5 }}/>
            <Line type="monotone" dataKey="y" stroke="#8884d8" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="area" fill="#f97316" stroke="none" />
            <ReferenceLine x={11.07} stroke="#ef4444" strokeWidth={2}>
                <Label value={`χ² = 11.07`} position="top" dy={30} dx={40} fill="#ef4444" style={{ fontSize: '14px', fontWeight: 'bold' }} />
            </ReferenceLine>
        </ComposedChart>
    </ResponsiveContainer>
);

// ============================================================================
//  MAIN COMPONENT
// ============================================================================

const HomePageAnimation = () => {
  const [scene, setScene] = useState(ANIMATION_SCENES.TAGLINE);
  const [workspaceStep, setWorkspaceStep] = useState(WORKSPACE_STEPS.IDLE);
  const [loopKey, setLoopKey] = useState(0);
  const [isAudioButtonHovered, setIsAudioButtonHovered] = useState(false);

  const containerRef = useRef(null);
  const highlightTextRef = useRef(null);
  const codeButtonRef = useRef(null);
  const selectedCodeItemRef = useRef(null);
  const audioButtonRef = useRef(null);

  const rafRef = useRef(null);
  const seqAbortRef = useRef(false);
  const isMountedRef = useRef(true);

  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [cursorType, setCursorType] = useState("pointer");
  const [isClicking, setIsClicking] = useState(false);
  const [selectionProgress, setSelectionProgress] = useState(0);
  const [isCodeButtonHovered, setIsCodeButtonHovered] = useState(false);
  const [isCodeItemHovered, setIsCodeItemHovered] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);

  const delay = (ms) =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      seqAbortRef.current = true;
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        seqAbortRef.current = true;
        setIsTabHidden(true);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      } else {
        setIsTabHidden(false);
        setTimeout(() => {
          setLoopKey((k) => k + 1);
        }, 60);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const runFullSequence = async () => {
      seqAbortRef.current = false;
      if (!isMountedRef.current) return;

      const shouldAbort = () => !isMountedRef.current || seqAbortRef.current;

      await delay(100);
      if (shouldAbort()) return;
      
      const moveCursorTo = (ref, duration = TIMING_CONFIG.CURSOR_MOVE_SPEED) => {
        return new Promise(async (resolve) => {
          if (shouldAbort()) return resolve();
          if (ref.current && containerRef.current) {
            const rect = ref.current.getBoundingClientRect();
            const parentRect = containerRef.current.getBoundingClientRect();
            setCursorPosition({
              x: rect.left - parentRect.left + rect.width / 2,
              y: rect.top - parentRect.top + rect.height / 2,
            });
          }
          const step = Math.max(60, duration);
          await delay(step);
          resolve();
        });
      };

      const click = async () => {
        if (shouldAbort()) return;
        await delay(200);
        if (shouldAbort()) {
          setIsClicking(false);
          return;
        }
        setIsClicking(true);
        await delay(150);
        if (shouldAbort()) {
          setIsClicking(false);
          return;
        }
        setIsClicking(false);
        await delay(200);
      };

      setSelectionProgress(0);
      setCursorType("pointer");
      setIsClicking(false);
      setWorkspaceStep(WORKSPACE_STEPS.IDLE);
      if (containerRef.current) {
        const cr = containerRef.current.getBoundingClientRect();
        setCursorPosition({ x: cr.width - 40, y: cr.height - 40 });
      }
      if (shouldAbort()) return;

      setScene(ANIMATION_SCENES.TAGLINE);
      await delay(TIMING_CONFIG.SCENE_PAUSE_LONG);
      if (shouldAbort()) return;

      setScene(ANIMATION_SCENES.IMPORT);
      await delay(500);
      if (shouldAbort()) return;

      setIsAudioButtonHovered(true);
      await moveCursorTo(audioButtonRef); 
      if (shouldAbort()) {
        setIsAudioButtonHovered(false);
        return;
      }
      await click();
      setIsAudioButtonHovered(false);
      if (shouldAbort()) return;

      setScene(ANIMATION_SCENES.LOADING);
      await delay(TIMING_CONFIG.SCENE_PAUSE_LONG);
      if (shouldAbort()) return;

      setScene(ANIMATION_SCENES.WORKSPACE);
      await delay(1000);
      if (shouldAbort()) return;

      if (!highlightTextRef.current || !containerRef.current) return;

      const textRect = highlightTextRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const startX = textRect.left - containerRect.left;
      const endX = textRect.right - containerRect.left;
      const yPos = textRect.top - containerRect.top + textRect.height / 2;

      setCursorType("text");
      setCursorPosition({ x: startX, y: yPos });
      await delay(500);
      if (shouldAbort()) return;

      setWorkspaceStep(WORKSPACE_STEPS.SELECTING);
      await delay(100);
      if (shouldAbort()) return;
      
      const selectionDuration = TIMING_CONFIG.TEXT_SELECT_SPEED;
      const startTime = performance.now();
      let finished = false;

      const animateSelection = (time) => {
        if (seqAbortRef.current || !isMountedRef.current) {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          return;
        }

        const elapsed = time - startTime;
        const progress = Math.min(elapsed / selectionDuration, 1);
        setCursorPosition({ x: startX + (endX - startX) * progress, y: yPos });
        setSelectionProgress(progress);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animateSelection);
        } else {
          finished = true;
          rafRef.current = null;
        }
      };

      rafRef.current = requestAnimationFrame(animateSelection);

      const waitForSelection = () =>
        new Promise((resolve) => {
          const check = () => {
            if (seqAbortRef.current || !isMountedRef.current) return resolve();
            if (finished) return resolve();
            setTimeout(check, 40);
          };
          check();
        });

      await waitForSelection();
      if (shouldAbort()) return;

      setCursorType("pointer");

      const toolbarRect = highlightTextRef.current.getBoundingClientRect();
      const parentRect = containerRef.current.getBoundingClientRect();
      setToolbarPosition({
        top: toolbarRect.bottom - parentRect.top - 25,
        left: toolbarRect.right - parentRect.left - 100,
      });

      setWorkspaceStep(WORKSPACE_STEPS.TOOLBAR_VISIBLE);
      await delay(300);
      if (shouldAbort()) return;

      setIsCodeButtonHovered(true);
      await moveCursorTo(codeButtonRef);
      if (shouldAbort()) {
        setIsCodeButtonHovered(false);
        return;
      }
      await click();
      setIsCodeButtonHovered(false);
      if (shouldAbort()) return;

      setWorkspaceStep(WORKSPACE_STEPS.PANEL_VISIBLE);
      await delay(300);
      if (shouldAbort()) return;

      setIsCodeItemHovered(true);
      await moveCursorTo(selectedCodeItemRef);
      if (shouldAbort()) {
        setIsCodeItemHovered(false);
        return;
      }
      await click();
      setIsCodeItemHovered(false);
      if (shouldAbort()) return;

      setWorkspaceStep(WORKSPACE_STEPS.CODED);
      await delay(TIMING_CONFIG.SCENE_PAUSE_LONG);
      if (shouldAbort()) return;

      setScene(ANIMATION_SCENES.VISUALIZATION);
      setCursorPosition({ x: 1000, y: 1000 }); 
      await delay(TIMING_CONFIG.VISUALIZATION_ICONS_DISPLAY_TIME);
      if (shouldAbort()) return;

      setScene(ANIMATION_SCENES.STATISTICS);
      setCursorPosition({ x: 1000, y: 1000 }); 
      await delay(TIMING_CONFIG.STATS_SCENE_TIME);
      if (shouldAbort()) return;

      setScene(ANIMATION_SCENES.LOGO);
      await delay(TIMING_CONFIG.LOGO_SCENE_TIME);
      if (shouldAbort()) return;

      if (isMountedRef.current && !seqAbortRef.current) {
        setLoopKey((prev) => prev + 1);
      }
    };

    runFullSequence();

    return () => {
      isMountedRef.current = false;
      seqAbortRef.current = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [loopKey]);

  const toolVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } },
    exit: { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.2 } },
  };

  const LeftPanel = () => (
    <div className="w-28 flex-shrink-0 border-r border-gray-200 bg-gray-100/50 p-3 dark:border-gray-700/50 dark:bg-gray-800/50">
      <div className="space-y-4">
        <div>
          <div className="mb-2 h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-700"></div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-600"></div>
            <div className="h-3 w-5/6 rounded bg-gray-300 font-bold dark:bg-gray-500"></div>
          </div>
        </div>
        <div>
          <div className="mb-2 h-4 w-2/3 rounded bg-gray-300 dark:bg-gray-700"></div>
          <div className="space-y-2">
            {Object.values(CODES).map((code) => (
              <div key={code.name} className="flex items-center space-x-2">
                <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: code.color }} />
                <div className="h-2 w-full rounded-sm bg-gray-200 dark:bg-gray-600"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      ref={containerRef}
      className="relative pointer-events-none w-[600px] h-[420px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700/50 dark:bg-gray-800"
      initial={{ y: 0, boxShadow: "0 10px 15px rgba(0, 0, 0, 0.1), 18px -8px 10px rgba(0, 0, 0, 0.1)" }}
      whileHover={{
        y: -5,
        boxShadow: "0 20px 25px rgba(0, 0, 0, 0.15), 0 8px 10px rgba(0, 0, 0, 0.1), 15px -12px 25px rgba(0, 0, 0, 0.1)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        className="absolute z-50 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{
          left: cursorPosition.x,
          top: cursorPosition.y,
          scale: isClicking ? 0.8 : 1,
          opacity:
            isTabHidden ||
            scene === ANIMATION_SCENES.LOGO ||
            scene === ANIMATION_SCENES.TAGLINE ||
            scene === ANIMATION_SCENES.VISUALIZATION ||
            scene === ANIMATION_SCENES.STATISTICS
              ? 0
              : 1,
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <div className="relative">
          {cursorType === "pointer" ? (
            <LuMousePointer2
              size={24}
              className="text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] dark:text-white dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
            />
          ) : (
            <LuTextCursor
              size={24}
              className="text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] dark:text-white dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
            />
          )}
        </div>
      </motion.div>

      <div className="flex items-center gap-x-2 bg-gray-200 px-4 py-3 dark:bg-gray-900">
        <div className="h-3 w-3 rounded-full bg-red-500"></div>
        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
        <div className="h-3 w-3 rounded-full bg-green-500"></div>
      </div>

      <div className="relative flex h-[calc(100%-40px)]">
        <AnimatePresence mode="wait">
          {scene === ANIMATION_SCENES.LOGO && (
            <SceneWrapper key="logo">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0 }}
                className="flex -translate-x-6"
              >
                <Logo className="h-36 w-36 text-[#132142] dark:text-gray-300 -translate-y-9" />
                <div className="flex flex-col -ml-6">
                  <motion.span
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    className="el-messiri-bold text-5xl md:text-7xl font-extrabold text-[#132142] dark:text-gray-300 leading-tight"
                  >
                    QUAiL
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="el-messiri-bold text-lg font-medium text-gray-500 self-end -mt-6"
                  >
                    {CURRENT_VERSION}
                  </motion.span>
                </div>
              </motion.div>
            </SceneWrapper>
          )}

          {scene === ANIMATION_SCENES.TAGLINE && (
            <SceneWrapper key="tagline">
              <p className="text-4xl font-semibold leading-relaxed text-gray-700 dark:text-gray-300 -translate-y-8">
                A single platform <br />for all your Qualitative
                <br />
                Research needs.
              </p>
            </SceneWrapper>
          )}

          {scene === ANIMATION_SCENES.IMPORT && (
            <SceneWrapper key="import">
              <h2 className="-mt-7 mb-6 text-2xl font-bold text-gray-800 dark:text-gray-200">
                Import Your Data
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div
                  ref={audioButtonRef}
                  className={`flex transform flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all duration-300 ${
                    isAudioButtonHovered
                      ? "scale-105 border-[#F05623] bg-orange-50 dark:bg-gray-600"
                      : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
                  }`}
                >
                  <FaMicrophoneAlt className="mb-3 text-4xl text-[#F05623]" />
                  <span className="font-semibold text-gray-800 dark:text-white">Import Audio</span>
                </div>
                <div className="flex transform flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 dark:border-gray-600 dark:bg-gray-700">
                  <FaFileUpload className="mb-3 text-4xl text-blue-500" />
                  <span className="font-semibold text-gray-800 dark:text-white">Import Text</span>
                </div>
              </div>
            </SceneWrapper>
          )}

          {scene === ANIMATION_SCENES.LOADING && (
            <SceneWrapper key="loading">
              <p className="-mt-17 mb-5 text-xl font-semibold text-gray-700 dark:text-gray-300">
                Built-in transcription service...
              </p>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <FaSpinner className="h-16 w-16 text-[#F05623]" />
              </motion.div>
            </SceneWrapper>
          )}

        {/* MODIFICATION START */}
          {scene === ANIMATION_SCENES.WORKSPACE && (
          <motion.div
            key="workspace"
            className="flex w-full h-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: TIMING_CONFIG.SCENE_TRANSITION, ease: "easeInOut" }}
          >
            <LeftPanel />
            <div className="relative flex-1 p-8 pb-24">
              <div className="select-none text-lg leading-relaxed text-gray-800 dark:text-gray-300 text-justify">
                {PRE_TEXT}
                <span ref={highlightTextRef} className="relative whitespace-nowrap">
                  <span className="relative z-10">{HIGHLIGHT_TEXT}</span>
                  <AnimatePresence>
                    {(workspaceStep === WORKSPACE_STEPS.SELECTING ||
                      workspaceStep === WORKSPACE_STEPS.TOOLBAR_VISIBLE ||
                      workspaceStep === WORKSPACE_STEPS.PANEL_VISIBLE) && (
                        <div className="absolute inset-y-0 left-0 z-0 bg-blue-800/60" style={{ width: `${selectionProgress * 100}%` }} />
                      )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {workspaceStep === WORKSPACE_STEPS.CODED && (
                      <motion.div
                        className="absolute inset-0 z-0 rounded"
                        style={{
                          backgroundColor: `${SELECTED_CODE.color}4D`,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )}
                  </AnimatePresence>
                </span>
                {POST_TEXT}
              </div>

              <div
                className="absolute z-40 origin-top-right"
                style={{
                  top: toolbarPosition.top,
                  left: toolbarPosition.left,
                  transform: "translate(-100%, 0%)",
                }}
              >
                <AnimatePresence mode="wait">
                  {workspaceStep === WORKSPACE_STEPS.TOOLBAR_VISIBLE && (
                    <motion.div
                      key="toolbar"
                      variants={toolVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex items-center space-x-1 rounded-lg border bg-white/80 p-0.5 shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80"
                    >
                      <button ref={codeButtonRef} className={`rounded-md px-2 py-1 transition-colors ${isCodeButtonHovered ? "bg-gray-200 dark:bg-gray-700" : ""}`}>
                        <MdCode size={16} />
                      </button>
                      <button className="rounded-md px-2 py-1">
                        <FaStickyNote size={14} />
                      </button>
                      <button className="rounded-md px-2 py-1">
                        <FaHighlighter size={14} />
                      </button>
                    </motion.div>
                  )}

                  {workspaceStep === WORKSPACE_STEPS.PANEL_VISIBLE && (
                    <motion.div
                      key="code-panel"
                      variants={toolVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="w-48 flex-col space-y-1 rounded-lg border bg-white/80 p-2 shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80"
                    >
                      {Object.values(CODES).map((code) => (
                        <div
                          key={code.name}
                          ref={code.name === SELECTED_CODE.name ? selectedCodeItemRef : null}
                          className={`flex items-center space-x-3 rounded px-2 py-1.5 text-sm transition-colors ${
                            isCodeItemHovered && code.name === SELECTED_CODE.name ? "bg-gray-200 dark:bg-gray-700" : ""
                          }`}
                        >
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: code.color }} />
                          <span>{code.name}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <StaticAudioPlayer />
            </div>
          </motion.div>
          )}
        {/* MODIFICATION END */}

          {scene === ANIMATION_SCENES.VISUALIZATION && (
            <SceneWrapper key="visualization">
              <div className="flex h-full w-full flex-col items-center justify-center">
                <h2 className="mb-8 text-3xl font-bold text-gray-800 dark:text-gray-200">
                  Dynamic Visualizations
                </h2>
                <div className="flex flex-col items-center gap-6">
                  <div className="flex gap-10">
                    <IconDisplay icon={FaChartBar} title="Bar Chart" />
                    <IconDisplay icon={FaChartPie} title="Pie Chart" />
                    <IconDisplay icon={TbChartRadar} title="Radar Chart" />
                  </div>
                  <div className="flex gap-10">
                    <IconDisplay icon={FaCloud} title="Word Cloud" />
                    <IconDisplay icon={BsKanban} title="Treemap" />
                  </div>
                </div>
              </div>
            </SceneWrapper>
          )}

          {scene === ANIMATION_SCENES.STATISTICS && (
            <SceneWrapper key="statistics">
              <div className="flex h-full w-full flex-col">
                <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
                  Statistical Analysis
                </h2>
                <div className="mx-auto w-full max-w-lg flex-grow">
                   <div className="flex h-full flex-col rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                     <h3 className="mb-2 text-center text-base font-semibold text-gray-700 dark:text-gray-300">Chi-Square Distribution (df=5)</h3>
                     <div className="flex-grow">
                       <StaticChiSquareDistributionChart />
                     </div>
                   </div>
                </div>
              </div>
            </SceneWrapper>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const IconDisplay = ({ icon: Icon, title }) => (
  <div className="flex flex-col items-center p-3 text-gray-600 dark:text-gray-300">
{/*     <Icon size={48} className="mb-2 text-[#F05623]" /> */}
    <Icon size={48} className="mb-2 text-gray-500 dark:text-gray-400" />
    <span className="text-lg font-semibold">{title}</span>
  </div>
);

export default HomePageAnimation;