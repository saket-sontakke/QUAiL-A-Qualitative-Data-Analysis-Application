import React from 'react';
import { FaUsers, FaChartPie, FaLayerGroup } from 'react-icons/fa';

const ChiSquareTypeCard = ({ icon, title, description, example, onSelect, disabled = false }) => (
  <div
    onClick={!disabled ? onSelect : undefined}
    className={`
      relative flex h-full flex-col rounded-lg border p-6
      ${disabled ? 'cursor-not-allowed bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800/50' : 'cursor-pointer transition-all duration-300 hover:border-cyan-900 hover:shadow-lg dark:border-gray-700 dark:hover:border-orange-500'}
    `}
  >
    <div className="mb-4 flex items-center">
      <div className={`mr-4 text-3xl ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-cyan-800 dark:text-orange-500'}`}>{icon}</div>
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
    </div>
    <p className="flex-grow text-gray-600 dark:text-gray-300 mb-4">{description}</p>
    <div className="mt-auto rounded-md bg-gray-100 p-3 dark:bg-gray-900/50">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Example with your data:</p>
      <p className="text-sm italic text-gray-600 dark:text-gray-400">{example}</p>
    </div>
  </div>
);

const ChiSquareTypeSelector = ({ onSelect, stats }) => {
  const numSegments = stats?.numSegments || '[X]';
  const topCode = stats?.mostUsedCode?.name || '[Top Code]';
  const secondCode = stats?.codeStats?.[1]?.name || '[Another Code]';

  return (
    <div className="flex h-full flex-col justify-center bg-white p-4 dark:bg-gray-800 motion-safe:animate-[fadeIn_0.5s_ease-in-out]">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Select a Chi-Square Test Type</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Choose the test that best fits your research question.</p>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <ChiSquareTypeCard
          icon={<FaChartPie />}
          title="Chi-Square Goodness-of-Fit"
          description="Checks if the frequency distribution of a single categorical variable matches an expected distribution."
          example={
            <>
              "Based on my <b>{numSegments}</b> coded segments, is there a significant difference in how often each code is used?"
            </>
          }
          onSelect={() => onSelect('goodness-of-fit')}
        />
        <ChiSquareTypeCard
          icon={<FaUsers />}
          title="Chi-Square Test of Independence"
          description="Determines if there's a significant association between two categorical variables in a single population."
          example={
            <>
             "Are instructors more likely to mention '<b>{topCode}</b>' and students more likely to mention '<b>{secondCode}</b>'?"
            </>
          }
          onSelect={() => onSelect('independence')}
        />
        <ChiSquareTypeCard
          icon={<FaLayerGroup />}
          title="Chi-Square Test for Homogeneity"
          description="Compares the distribution of a single categorical variable across different groups."
          example={
            <>
              "Does the usage of the code '<b>{topCode}</b>' differ significantly between two participant groups (e.g., Campus A vs. Campus B)?"
            </>
          }
          onSelect={() => onSelect('homogeneity')}
        />
      </div>
    </div>
  );
};

export default ChiSquareTypeSelector;