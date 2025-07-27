import React, { forwardRef, memo, useEffect } from 'react';
import { useTheme } from '../theme/ThemeContext.jsx';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, LabelList,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Radar, Treemap
} from 'recharts';
import { FaChartBar, FaChartPie, FaCloud } from 'react-icons/fa';
import { TbChartRadar } from "react-icons/tb";

/**
 * @component ChartRenderer
 * @description A memoized and forward-ref component responsible for rendering different types of charts
 * using the Recharts library based on the selected chart type. It also handles the animation state
 * to prevent exporting the chart while it's rendering.
 * @param {object} props - The component props.
 * @param {Array} props.chartData - The data array to be visualized.
 * @param {string} props.selectedChart - The type of chart to render ('bar', 'pie', etc.).
 * @param {boolean} props.isDarkMode - Flag indicating if dark mode is active.
 * @param {function} props.setIsChartAnimating - State setter to control the animation status.
 * @param {React.Ref} ref - The forwarded ref attached to the main container div.
 */
const ChartRenderer = forwardRef(function ChartRenderer({
    chartData,
    selectedChart,
    isDarkMode,
    setIsChartAnimating
}, ref) {

    /**
     * @effect
     * @description Manages the animation state of the chart. It sets animating to true when a new
     * chart is selected and uses a failsafe timer to reset the state in case the
     * onAnimationEnd callback doesn't fire.
     */
    useEffect(() => {
        setIsChartAnimating(true);
        const failsafeTimer = setTimeout(() => {
            setIsChartAnimating(false);
        }, 700); // Failsafe duration, slightly longer than the chart animation.
    
        return () => clearTimeout(failsafeTimer);
    }, [selectedChart, setIsChartAnimating]);

    /**
     * @function handleAnimationComplete
     * @description Callback function triggered by Recharts when a chart animation finishes.
     */
    const handleAnimationComplete = () => {
        setIsChartAnimating(false);
    };
    
    return (
        <div ref={ref} style={{ width: '100%', height: '100%', background: isDarkMode ? '#1F2937' : '#FFFFFF', padding: '1rem' }}>
            {/* Bar Chart */}
            {selectedChart === 'bar' && (
                <ResponsiveContainer>
                    <BarChart 
                        data={chartData} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        onAnimationEnd={handleAnimationComplete}
                    >
                        <XAxis dataKey="name" interval={0} stroke={isDarkMode ? "#9CA3AF" : "#4B5563"} tick={{ fill: isDarkMode ? "#D1D5DB" : "#374151", fontSize: 12 }} />
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

            {/* Pie Chart */}
            {selectedChart === 'pie' && (
                <ResponsiveContainer>
                    <PieChart onAnimationEnd={handleAnimationComplete}>
                        <Pie
                            data={chartData}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius="75%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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

            {/* Radar Chart */}
            {selectedChart === 'radar' && (
                <ResponsiveContainer>
                    <RadarChart 
                        data={chartData} 
                        outerRadius="80%"
                        onAnimationEnd={handleAnimationComplete}
                    >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="name" />
                        <PolarRadiusAxis />
                        <Radar name="Frequency" dataKey="count" stroke="#F05623" fill="#F05623" fillOpacity={0.6} animationDuration={500} />
                        <Tooltip />
                        <Legend />
                    </RadarChart>
                </ResponsiveContainer>
            )}

            {/* Treemap */}
            {selectedChart === 'treemap' && (
                <ResponsiveContainer>
                    <Treemap
                        data={chartData}
                        dataKey="count"
                        nameKey="name"
                        ratio={4 / 3}
                        stroke="#fff"
                        isAnimationActive={true} 
                        animationDuration={500}
                        onAnimationEnd={handleAnimationComplete}
                        fill="transparent"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Treemap>
                </ResponsiveContainer>
            )}

            {/* Word Cloud (Custom Implementation) */}
            {selectedChart === 'wordcloud' && (
                <div className="flex items-center justify-center h-full">
                    <div className="flex flex-wrap justify-center items-center">
                        {chartData.map((item, idx) => {
                            const maxCount = Math.max(...chartData.map(d => d.count), 1);
                            const fontSize = Math.max(12, (item.count / maxCount) * 50 + 12);
                            return (
                                <span
                                    key={idx}
                                    className="m-1 p-1 inline-block whitespace-nowrap"
                                    style={{ fontSize: `${fontSize}px`, color: item.fill }}
                                >
                                    {item.name}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});

/**
 * @component Visualization
 * @description The main component for the visualization tab. It includes a sidebar for selecting
 * the chart type and renders the selected chart via the `ChartRenderer` component.
 * @param {object} props - The component props.
 * @param {Array} props.chartData - The data array for visualization.
 * @param {number} props.totalFrequency - The total number of data points.
 * @param {string} props.selectedChart - The currently selected chart type.
 * @param {function} props.setSelectedChart - State setter for the selected chart.
 * @param {function} props.setIsChartAnimating - State setter for the chart's animation status.
 * @param {React.Ref} ref - The forwarded ref to be passed to the ChartRenderer.
 */
const Visualization = memo(forwardRef(function Visualization({
    chartData,
    totalFrequency,
    selectedChart,
    setSelectedChart,
    setIsChartAnimating
}, ref) {
    const { theme } = useTheme();

    // Configuration for the available chart types and their corresponding icons.
    const chartTypes = [
        { id: 'bar', title: 'Bar Chart', icon: FaChartBar },
        { id: 'pie', title: 'Pie Chart', icon: FaChartPie },
        { id: 'radar', title: 'Radar Chart', icon: TbChartRadar },
        { id: 'wordcloud', title: 'Word Cloud', icon: FaCloud },
        { id: 'treemap', title: 'Treemap', icon: TbChartRadar }
    ];

    // Display a message if there is no data to visualize.
    if (totalFrequency === 0) {
        return (
            <div className="flex justify-center items-center h-full">
                <p className="text-center text-gray-500 dark:text-gray-400">
                    No data to visualize.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Main Chart Display Area */}
            <div className="flex-grow pr-6 rounded-lg">
                <ChartRenderer
                    ref={ref}
                    chartData={chartData}
                    selectedChart={selectedChart}
                    isDarkMode={theme === 'dark'}
                    setIsChartAnimating={setIsChartAnimating}
                />
            </div>

            {/* Sidebar for Chart Selection */}
            <div className="w-32 flex flex-col space-y-4 overflow-y-auto">
                {chartTypes.map(chart => {
                    const IconComponent = chart.icon;
                    const isSelected = selectedChart === chart.id;
                    return (
                        <button
                            key={chart.id}
                            onClick={() => setSelectedChart(chart.id)}
                            className={`flex flex-col items-center p-2 rounded-lg focus:outline-none transition-colors duration-200 ${
                                isSelected
                                ? 'text-[#F05623] bg-gray-100 dark:bg-gray-600'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <IconComponent size={24} />
                            <span className="text-xs mt-1 text-center">{chart.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}));

export default Visualization;
