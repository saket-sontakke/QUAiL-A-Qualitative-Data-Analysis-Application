"use client";

import { useEffect, useRef, useState, createElement, useMemo, useCallback } from "react";
import { gsap } from "gsap";
import "./TextType.css";

const TextType = ({
  text,
  as: Component = "div",
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = "",
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = "|",
  cursorClassName = "",
  cursorBlinkDuration = 0.5,
  textColors = [],
  variableSpeed,
  onSentenceComplete, // called after each sentence finishes typing (immediately when full text is displayed)
  onComplete, // called once when whole run finishes (only when loop === false and last sentence finished)
  startOnVisible = false,
  reverseMode = false,
  ...props
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);
  const cursorRef = useRef(null);
  const containerRef = useRef(null);

  // to ensure onComplete only fires once
  const completeCalledRef = useRef(false);

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  const getCurrentTextColor = () => {
    // FIX FOR GRADIENT: return undefined instead of a color when using gradients
    if (textColors.length === 0) return undefined;
    return textColors[currentTextIndex % textColors.length];
  };

  useEffect(() => {
    // Reset complete flag whenever inputs that affect lifecycle change
    completeCalledRef.current = false;
  }, [textArray.length, loop]);

  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (showCursor && cursorRef.current) {
      gsap.set(cursorRef.current, { opacity: 1 });
      gsap.to(cursorRef.current, {
        opacity: 0,
        duration: cursorBlinkDuration,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, [showCursor, cursorBlinkDuration]);

  useEffect(() => {
    if (!isVisible) return;

    let timeout;
    const currentText = textArray[currentTextIndex] ?? "";
    const processedText = reverseMode ? currentText.split("").reverse().join("") : currentText;

    const executeTypingAnimation = () => {
      // DELETING PHASE
      if (isDeleting) {
        if (displayedText.endsWith(processedText) && displayedText.length === processedText.length) {
          // finished deleting, move to next sentence (or stop if at end and not looping)
          setIsDeleting(false);

          // If we've just deleted and we were at the last sentence and loop === false -> do nothing further.
          if (currentTextIndex === textArray.length - 1 && !loop) {
            // Do not advance index; we remain at last sentence displayed as empty.
            return;
          }

          // advance to next sentence
          setCurrentTextIndex((prev) => (prev + 1) % textArray.length);
          setCurrentCharIndex(0);
          setDisplayedText(""); // Clear text for the next sentence

          // small pause before typing next sentence
          timeout = setTimeout(() => {}, pauseDuration / 2); // Shorter pause when cycling
        } else {
          timeout = setTimeout(() => {
            setDisplayedText((prev) => prev.slice(0, -1));
          }, deletingSpeed);
        }

        return;
      }

      // TYPING PHASE
      if (currentCharIndex < processedText.length) {
        const isLastChar = currentCharIndex === processedText.length - 1;

        timeout = setTimeout(() => {
          // append next character
          setDisplayedText((prev) => prev + processedText[currentCharIndex]);
          setCurrentCharIndex((i) => i + 1);

          // If that was the last character, notify sentence-complete & maybe overall-complete
          if (isLastChar) {
            // notify sentence completed (immediately when full text becomes visible)
            if (typeof onSentenceComplete === "function") {
              try {
                onSentenceComplete(currentText, currentTextIndex);
              } catch (e) {
                // swallow callback errors
                // console.warn("onSentenceComplete callback error", e);
              }
            }

            // if this is the final sentence and loop===false, call onComplete (only once)
            if (!loop && currentTextIndex === textArray.length - 1 && typeof onComplete === "function" && !completeCalledRef.current) {
              try {
                onComplete();
              } catch (e) {
                // console.warn("onComplete callback error", e);
              }
              completeCalledRef.current = true;
            }
          }
        }, variableSpeed ? getRandomSpeed() : typingSpeed);
      } else {
        // finished typing full sentence
        const isLastSentence = currentTextIndex === textArray.length - 1;

        // If there are more sentences and we're not looping, proceed to the next line.
        if (!isLastSentence && !loop) {
          timeout = setTimeout(() => {
            setDisplayedText((prev) => prev + "\n");
            setCurrentTextIndex((prev) => prev + 1);
            setCurrentCharIndex(0);
          }, pauseDuration);
        }
        // If we are looping (and have more than one sentence), start deleting.
        else if (loop && textArray.length > 1) {
          timeout = setTimeout(() => {
            setIsDeleting(true);
            setCurrentCharIndex(processedText.length);
          }, pauseDuration);
        }
      }
    };

    // handle initialDelay only on very first tick for a fresh sentence
    if (currentCharIndex === 0 && !isDeleting && (displayedText === "" || displayedText.endsWith("\n"))) {
      timeout = setTimeout(executeTypingAnimation, initialDelay);
    } else {
      executeTypingAnimation();
    }

    return () => clearTimeout(timeout);
    // intentionally include getRandomSpeed in deps
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    initialDelay,
    isVisible,
    reverseMode,
    variableSpeed,
    getRandomSpeed,
    onSentenceComplete,
    onComplete,
  ]);

  const isTyping = currentCharIndex < (textArray[currentTextIndex] ?? "").length || isDeleting;
  const shouldHideCursor = hideCursorWhileTyping && isTyping;


  return createElement(
    Component,
    {
      ref: containerRef,
      className: `text-type ${className}`,
      ...props,
    },
    <span
      className="text-type__content"
      style={{ color: getCurrentTextColor() }}
    >
      {displayedText}
    </span>,
    showCursor && (
      <span
        ref={cursorRef}
        className={`text-type__cursor ${cursorClassName} ${
          shouldHideCursor ? "text-type__cursor--hidden" : ""
        }`}
      >
        {cursorCharacter}
      </span>
    )
  );
};

export default TextType;