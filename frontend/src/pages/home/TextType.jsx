"use client";

import { useEffect, useRef, useState, createElement, useMemo, useCallback } from "react";
import { gsap } from "gsap";
import "./TextType.css";

/**
 * A versatile React component for creating animated typing effects.
 * It can type out single or multiple sentences, loop the animation,
 * control typing/deleting speeds, and customize the cursor's appearance and behavior.
 *
 * @component
 * @param {object} props - The component props.
 * @param {string|string[]} props.text - The text to be typed. Can be a single string or an array of strings for multiple sentences.
 * @param {string|React.ElementType} [props.as="div"] - The HTML tag or React component to use as the container.
 * @param {number} [props.typingSpeed=50] - The speed of typing in milliseconds per character.
 * @param {number} [props.initialDelay=0] - An initial delay in milliseconds before the animation starts.
 * @param {number} [props.pauseDuration=2000] - The pause duration in milliseconds after a sentence is typed.
 * @param {number} [props.deletingSpeed=30] - The speed of deleting in milliseconds per character.
 * @param {boolean} [props.loop=true] - Whether the animation should loop indefinitely.
 * @param {string} [props.className=""] - Additional CSS class for the container element.
 * @param {boolean} [props.showCursor=true] - Whether to display the typing cursor.
 * @param {boolean} [props.hideCursorWhileTyping=false] - If true, the cursor is hidden during typing and deleting.
 * @param {string} [props.cursorCharacter="|"] - The character to use for the cursor.
 * @param {string} [props.cursorClassName=""] - Additional CSS class for the cursor element.
 * @param {number} [props.cursorBlinkDuration=0.5] - The duration of the cursor's blink animation in seconds.
 * @param {string[]} [props.textColors=[]] - An array of color strings to apply to each sentence in sequence.
 * @param {{min: number, max: number}} [props.variableSpeed] - An object to define a random typing speed range.
 * @param {(sentence: string, index: number) => void} [props.onSentenceComplete] - Callback fired after each sentence is fully typed.
 * @param {() => void} [props.onComplete] - Callback fired once the entire sequence is complete (only when `loop` is `false`).
 * @param {boolean} [props.startOnVisible=false] - If true, the animation starts only when the component enters the viewport.
 * @param {boolean} [props.reverseMode=false] - If true, types out the text in reverse.
 * @returns {JSX.Element} The rendered TextType component.
 */
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
  onSentenceComplete,
  onComplete,
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
  const completeCalledRef = useRef(false);

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  const getCurrentTextColor = () => {
    if (textColors.length === 0) return undefined;
    return textColors[currentTextIndex % textColors.length];
  };

  useEffect(() => {
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
      if (isDeleting) {
        if (displayedText.endsWith(processedText) && displayedText.length === processedText.length) {
          setIsDeleting(false);
          if (currentTextIndex === textArray.length - 1 && !loop) {
            return;
          }
          setCurrentTextIndex((prev) => (prev + 1) % textArray.length);
          setCurrentCharIndex(0);
          setDisplayedText("");
          timeout = setTimeout(() => {}, pauseDuration / 2);
        } else {
          timeout = setTimeout(() => {
            setDisplayedText((prev) => prev.slice(0, -1));
          }, deletingSpeed);
        }
        return;
      }

      if (currentCharIndex < processedText.length) {
        const isLastChar = currentCharIndex === processedText.length - 1;

        timeout = setTimeout(
          () => {
            setDisplayedText((prev) => prev + processedText[currentCharIndex]);
            setCurrentCharIndex((i) => i + 1);

            if (isLastChar) {
              if (typeof onSentenceComplete === "function") {
                try {
                  onSentenceComplete(currentText, currentTextIndex);
                } catch (e) {
                  console.warn("onSentenceComplete callback error", e);
                }
              }

              if (!loop && currentTextIndex === textArray.length - 1 && typeof onComplete === "function" && !completeCalledRef.current) {
                try {
                  onComplete();
                } catch (e) {
                  console.warn("onComplete callback error", e);
                }
                completeCalledRef.current = true;
              }
            }
          },
          variableSpeed ? getRandomSpeed() : typingSpeed
        );
      } else {
        const isLastSentence = currentTextIndex === textArray.length - 1;

        if (!isLastSentence && !loop) {
          timeout = setTimeout(() => {
            setDisplayedText((prev) => prev + "\n");
            setCurrentTextIndex((prev) => prev + 1);
            setCurrentCharIndex(0);
          }, pauseDuration);
        } else if (loop && textArray.length > 1) {
          timeout = setTimeout(() => {
            setIsDeleting(true);
            setCurrentCharIndex(processedText.length);
          }, pauseDuration);
        }
      }
    };

    if (currentCharIndex === 0 && !isDeleting && (displayedText === "" || displayedText.endsWith("\n"))) {
      timeout = setTimeout(executeTypingAnimation, initialDelay);
    } else {
      executeTypingAnimation();
    }

    return () => clearTimeout(timeout);
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
    <span className="text-type__content" style={{ color: getCurrentTextColor() }}>
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