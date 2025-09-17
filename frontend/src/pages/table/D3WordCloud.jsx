import React, { useState, useEffect, useRef } from 'react';
import cloud from 'd3-cloud';
import { scaleLog } from 'd3-scale';

/**
 * A React component that wraps the `d3-cloud` library to render a word cloud
 * visualization. It uses a logarithmic scale for font sizes and features a
 * recursive layout algorithm that attempts to fit all words by progressively
 * reducing their size if they don't initially fit within the container.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.data - An array of word objects, each with `name`, `count`, and `fill` properties.
 * @param {boolean} props.isDarkMode - A flag to adjust the default text color for dark mode.
 * @param {Function} props.setIsChartAnimating - A state setter from the parent to indicate when the layout animation is active.
 * @param {number} props.refreshKey - A key that, when changed, triggers a re-render and re-layout of the word cloud.
 * @returns {JSX.Element} The rendered SVG word cloud component.
 */
const D3WordCloud = ({ data, isDarkMode, setIsChartAnimating, refreshKey }) => {
  const [words, setWords] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) {
      if (data.length === 0) setIsChartAnimating(false);
      return;
    }

    const attemptLayout = (scaleFactor) => {
      if (scaleFactor < 0.1) {
        console.error("WordCloud Error: Could not fit all words even at the smallest font size.");
        setIsChartAnimating(false);
        return;
      }

      const { offsetWidth: width, offsetHeight: height } = containerRef.current;
      const counts = data.map(d => d.count);
      const minCount = Math.max(1, Math.min(...counts));
      const maxCount = Math.max(...counts);

      const fontSizeScale = scaleLog()
        .domain([minCount, maxCount])
        .range([12 * scaleFactor, 60 * scaleFactor]);

      const layout = cloud()
        .size([width, height])
        .words(data.map(d => ({ text: d.name, value: d.count, fill: d.fill })))
        .padding(5)
        .rotate(() => (Math.random() > 0.5 ? 0 : 90))
        .font('Arial')
        .fontSize(d => fontSizeScale(d.value))
        .on('end', (resultWords) => {
          if (resultWords.length < data.length) {
            console.warn(`Word cloud dropped ${data.length - resultWords.length} words. Retrying with smaller fonts.`);
            attemptLayout(scaleFactor * 0.95);
          } else {
            setWords(resultWords);
            if (setIsChartAnimating) {
              setIsChartAnimating(false);
            }
          }
        });

      layout.start();
    };

    const timer = setTimeout(() => {
      if (containerRef.current) {
        attemptLayout(1.0);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [data, isDarkMode, setIsChartAnimating, refreshKey]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg width="100%" height="100%">
        {words.length > 0 && containerRef.current && (
          <g transform={`translate(${containerRef.current.offsetWidth / 2}, ${containerRef.current.offsetHeight / 2})`}>
            {words.map((word, i) => (
              <text
                key={i}
                textAnchor="middle"
                transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
                style={{
                  fontSize: word.size,
                  fontFamily: word.font,
                  fill: word.fill || (isDarkMode ? '#FFF' : '#000'),
                  transition: 'opacity 0.5s ease',
                  opacity: 1,
                }}
              >
                {word.text}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};

export default D3WordCloud;