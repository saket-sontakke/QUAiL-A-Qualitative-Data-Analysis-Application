import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { jStat } from 'jstat';

/**
 * A custom tooltip component for the Recharts library to provide specific
 * formatting for the Chi-Square distribution chart's data points.
 *
 * @param {object} props - The component props provided by Recharts.
 * @param {boolean} props.active - A boolean indicating if the tooltip is active.
 * @param {Array<object>} props.payload - An array of data points for the hovered item.
 * @returns {JSX.Element|null} The rendered custom tooltip or null.
 */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded border bg-white p-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
        {payload.map((pld) => (
          <p key={pld.name} style={{ color: pld.color || pld.stroke }}>
            {`${pld.name}: ${pld.value.toFixed(4)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Renders a probability density function curve for a Chi-Square distribution.
 * It dynamically generates the data points for the curve, highlights the
 * critical region corresponding to the p-value, and marks the calculated
 * test statistic on the chart.
 *
 * @param {object} props - The component props.
 * @param {number} props.df - The degrees of freedom for the distribution.
 * @param {number} props.statistic - The calculated Chi-Square test statistic.
 * @param {number} props.pValue - The p-value associated with the test statistic.
 * @returns {JSX.Element|null} The rendered distribution chart or null if data is unavailable.
 */
const ChiSquareDistributionChart = ({ df, statistic, pValue }) => {
  const chartData = React.useMemo(() => {
    if (!df || !statistic) return [];

    const xMax = Math.max(statistic * 1.5, df * 2.5, 20);
    const data = [];
    const step = xMax / 200;

    for (let x = 0; x <= xMax; x += step) {
      const y = jStat.chisquare.pdf(x, df);
      const point = { x: parseFloat(x.toFixed(2)), y: y };
      if (x >= statistic) {
        point.area = y;
      }
      data.push(point);
    }
    return data;
  }, [df, statistic]);

  if (chartData.length === 0) return null;

  return (
    <div>
      <h5 className="no-export mb-2 text-center font-semibold">Chi-Square Distribution (df={df})</h5>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 'dataMax']}
            label={{ value: "Chi-Square Value (χ²)", position: 'insideBottom', offset: -10 }}
          />
          <YAxis label={{ value: 'Probability Density', angle: -90, position: 'insideLeft', offset: 0, dy: 65 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="y" stroke="#8884d8" strokeWidth={2} dot={false} name="Density" />
          <Area type="monotone" dataKey="area" fill="#f97316" stroke="none" name={`p-value Area (${pValue.toFixed(4)})`} />
          <ReferenceLine x={statistic} stroke="#ef4444" strokeWidth={2}>
            <Label
              value={`χ² = ${statistic.toFixed(2)}`}
              position="insideTop"
              dy={10}
              dx={38}
              fill="#ef4444"
              style={{ fontSize: '14px', fontWeight: 'bold' }}
            />
          </ReferenceLine>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChiSquareDistributionChart;