import React, { forwardRef, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Treemap
} from 'recharts';
import D3WordCloud from './D3WordCloud';
import { LuRefreshCw } from "react-icons/lu";

/**
 * A utility function to truncate long string labels for display on chart axes.
 * @param {string} tick - The label string to truncate.
 * @returns {string} The truncated label, with an ellipsis if shortened.
 */
const formatXAxisTick = (tick) => {
  const limit = 12;
  if (tick.length > limit) {
    return `${tick.substring(0, limit)}...`;
  }
  return tick;
};

/**
 * A custom tick component for the Recharts XAxis that handles word wrapping
 * for long labels, displaying them horizontally instead of at an angle.
 * @param {object} props - The props provided by Recharts, including x, y, payload, and isDarkMode.
 * @returns {JSX.Element} The rendered SVG text element with wrapped lines.
 */
const CustomAxisTick = ({ x, y, payload, isDarkMode }) => {
  const label = payload.value;
  const maxCharsPerLine = 12;
  const words = label.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).length > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  });
  lines.push(currentLine);

  const tickColor = isDarkMode ? "#D1D5DB" : "#4B5563";

  return (
    <g transform={`translate(${x},${y + 15})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill={tickColor} fontSize={16}>
        {lines.map((line, index) => (
          <tspan x={0} dy={index > 0 ? '1.1em' : 0} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const RADIAN = Math.PI / 180;
/**
 * A custom label component for Recharts Pie charts to render percentage
 * values inside the pie slices.
 * @param {object} props - The props provided by Recharts.
 * @returns {JSX.Element|null} The rendered text label or null if the percentage is zero.
 */
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent === 0) {
    return null;
  }
  const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="black" textAnchor="middle" dominantBaseline="central">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

/**
 * A custom content renderer for the Recharts Treemap component. It handles
 * text wrapping and styling for the labels within each treemap rectangle.
 * @param {object} props - The props provided by Recharts.
 * @returns {JSX.Element|null} The rendered content for a treemap cell, or null if it's not a leaf node or too small.
 */
const CustomTreemapContent = ({ root, depth, x, y, width, height, index, name, isDarkMode }) => {
  if (depth !== 1) return null;

  const textPadding = 8;
  const availableWidth = width - (textPadding * 2);
  const fontSize = 14;

  const wrapText = (text) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      if ((currentLine.length + words[i].length + 1) * (fontSize * 0.6) > availableWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine += ` ${words[i]}`;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const lines = wrapText(name);
  const lineHeight = 16;
  const totalTextHeight = lines.length * lineHeight;

  if (totalTextHeight > height - (textPadding * 2) || width < 30) {
    return null;
  }

  const startY = y + height / 2 - totalTextHeight / 2 + lineHeight / 2;
  const textColor = '#1F2937';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: root.children[index].fill,
          stroke: isDarkMode ? '#1F2937' : '#FFFFFF',
          strokeWidth: 2,
        }}
      />
      <text
        x={x + width / 2}
        y={startY}
        textAnchor="middle"
        fill={textColor}
        fontSize={fontSize}
        fontWeight="bold"
        style={{ pointerEvents: 'none' }}
      >
        {lines.map((line, i) => (
          <tspan key={i} x={x + width / 2} dy={i === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

/**
 * A versatile component that renders one of several chart types based on the
 * `selectedChart` prop. It handles chart animations and provides specific
 * functionality for refreshing the word cloud layout.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.chartData - The data array to be visualized.
 * @param {'bar'|'pie'|'radar'|'treemap'|'wordcloud'} props.selectedChart - The type of chart to render.
 * @param {boolean} props.isDarkMode - A flag to apply dark mode styles to the charts.
 * @param {Function} props.setIsChartAnimating - A state setter to control the parent's animation loading state.
 * @param {React.Ref} ref - The ref forwarded to the main container div.
 * @returns {JSX.Element} The rendered chart component.
 */
const ChartRenderer = forwardRef(function ChartRenderer({
  chartData,
  selectedChart,
  isDarkMode,
  setIsChartAnimating
}, ref) {
  const [wordCloudKey, setWordCloudKey] = useState(0);

  useEffect(() => {
    setIsChartAnimating(true);
    setWordCloudKey(0);
    const failsafeTimer = setTimeout(() => {
      setIsChartAnimating(false);
    }, 700);
    return () => clearTimeout(failsafeTimer);
  }, [selectedChart, setIsChartAnimating]);

  const handleAnimationComplete = () => {
    setIsChartAnimating(false);
  };

  const handleWordCloudRefresh = () => {
    setIsChartAnimating(true);
    setWordCloudKey(prevKey => prevKey + 1);
  };

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', background: isDarkMode ? '#1F2937' : '#FFFFFF', padding: '1rem', borderRadius: '8px' }}>
      {selectedChart === 'bar' && (
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 1 }}
            onAnimationEnd={handleAnimationComplete}
          >
            <XAxis
              dataKey="name"
              interval={0}
              stroke={isDarkMode ? "#9CA3AF" : "#4B5563"}
              tick={<CustomAxisTick isDarkMode={isDarkMode} />}
              height={70}
            />
            <YAxis allowDecimals={false} stroke={isDarkMode ? "#9CA3AF" : "#4B5563"} tick={{ fill: isDarkMode ? "#D1D5DB" : "#374151", fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'rgba(206, 206, 206, 0.2)' }}
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#D1D5DB', color: '#000000' }}
            />
            <Bar dataKey="count" name="Frequency" animationDuration={500}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || '#F05623'} />
              ))}
              <LabelList dataKey="count" position="top" style={{ fill: isDarkMode ? '#F9FAFB' : '#1F2937' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {selectedChart === 'pie' && (
        <ResponsiveContainer>
          <PieChart onAnimationEnd={handleAnimationComplete}>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="95%"
              labelLine={false}
              label={renderCustomizedLabel}
              isAnimationActive={true}
              animationDuration={500}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}

      {selectedChart === 'radar' && (
        <ResponsiveContainer>
          <RadarChart
            data={chartData}
            outerRadius="80%"
            onAnimationEnd={handleAnimationComplete}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="name" tick={{ fill: isDarkMode ? '#F9FAFB' : '#1F2937' }} />
            <PolarRadiusAxis />
            <Radar name="Frequency" dataKey="count" stroke="#F05623" fill="#F05623" fillOpacity={0.6} animationDuration={500} />
            <Tooltip />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {selectedChart === 'treemap' && (
        <ResponsiveContainer>
          <Treemap
            data={chartData}
            dataKey="count"
            nameKey="name"
            ratio={4 / 3}
            isAnimationActive={true}
            animationDuration={500}
            onAnimationEnd={handleAnimationComplete}
            content={<CustomTreemapContent isDarkMode={isDarkMode} />}
          />
        </ResponsiveContainer>
      )}

      {selectedChart === 'wordcloud' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <D3WordCloud
            data={chartData}
            isDarkMode={isDarkMode}
            setIsChartAnimating={setIsChartAnimating}
            refreshKey={wordCloudKey}
          />
          <button
            onClick={handleWordCloudRefresh}
            title="Refresh Word Cloud"
            className="no-export transition-colors hover:text-[#F05623] dark:hover:text-[#F05623]"
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isDarkMode ? '#9CA3AF' : '#4B5563',
              zIndex: 10,
            }}
          >
            <LuRefreshCw size={18} />
          </button>
        </div>
      )}
    </div>
  );
});

export default ChartRenderer;