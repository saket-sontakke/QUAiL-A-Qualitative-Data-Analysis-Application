import React, { useState, useRef, useEffect, useMemo } from 'react';

const STANDARD_COLORS = [
  { name: 'Red', hex: '#E57373' },
  { name: 'Blue', hex: '#64B5F6' },
  { name: 'Green', hex: '#81C784' },
  { name: 'Yellow', hex: '#FFD54F' },
  { name: 'Purple', hex: '#BA68C8' },
  { name: 'Brown', hex: '#A1887F' },
];

/**
 * A reusable component for selecting a color. It provides a palette of standard
 * colors and an option to choose a custom color using the browser's native
 * color picker. It can also disable colors that are already in use.
 *
 * @param {object} props - The component props.
 * @param {string} props.color - The currently selected color hex string.
 * @param {(newColor: string) => void} props.onChange - The callback function that is invoked with the new hex string when a color is selected.
 * @param {string[]} [props.usedColors=[]] - An optional array of hex color strings that should be disabled in the palette.
 * @returns {JSX.Element} The rendered color picker component.
 */
const ColorPicker = ({ color, onChange, usedColors = [] }) => {
  const [isCustom, setIsCustom] = useState(false);
  const customColorInputRef = useRef(null);
  const usedColorsSet = useMemo(() => new Set(usedColors), [usedColors]);

  /**
   * Effect to determine if the initial color prop is a standard palette
   * color or a custom one, and sets the component's state accordingly.
   */
  useEffect(() => {
    const isStandard = STANDARD_COLORS.some(sc => sc.hex === color);
    setIsCustom(!isStandard);
  }, [color]);

  /**
   * Handles the selection of a color from the standard palette.
   * @param {string} hex - The hex code of the selected standard color.
   */
  const handleStandardColorClick = (hex) => {
    onChange(hex);
    setIsCustom(false);
  };

  /**
   * Activates the custom color selection mode and triggers the native
   * color picker input.
   */
  const handleCustomButtonClick = () => {
    setIsCustom(true);
    const isStandard = STANDARD_COLORS.some(sc => sc.hex === color);
    if (isStandard) {
      onChange('#FFA500');
    }
    customColorInputRef.current?.click();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STANDARD_COLORS.map((stdColor) => {
        const isUsed = usedColorsSet.has(stdColor.hex);
        return (
          <button
            key={stdColor.hex}
            type="button"
            disabled={isUsed}
            className={`
              relative h-8 w-8 rounded-full border-2 transition-all duration-150
              ${color === stdColor.hex && !isCustom ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-300 dark:border-gray-600'}
              ${isUsed ? 'cursor-not-allowed opacity-40' : 'hover:border-blue-400'}
            `}
            style={{ backgroundColor: stdColor.hex }}
            onClick={() => handleStandardColorClick(stdColor.hex)}
            title={isUsed ? `${stdColor.name} (In Use)` : stdColor.name}
          >
            {isUsed && (
              <div className="absolute top-1/2 left-0 h-0.5 w-full -rotate-45 transform bg-gray-700 dark:bg-gray-200" />
            )}
          </button>
        );
      })}

      <div className="relative">
        <button
          type="button"
          className={`
            flex h-8 items-center justify-center gap-1 rounded-full border-2 px-1 transition-all duration-150
            ${isCustom ? 'border-gray-400 bg-white ring-1 ring-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:ring-gray-600' : 'border-gray-300 bg-gray-100 ring-1 ring-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:ring-gray-500'}
          `}
          onClick={handleCustomButtonClick}
          title="Custom Color"
        >
          <div className="h-6 w-6 rounded-full bg-linear-to-r from-red-500 via-yellow-500 to-blue-500" />
          {isCustom && (
            <>
              <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-500" />
              <div
                className="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-500"
                style={{ backgroundColor: color }}
              />
            </>
          )}
        </button>

        <input
          ref={customColorInputRef}
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="absolute top-0 left-0 -z-10 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
};

export default ColorPicker;