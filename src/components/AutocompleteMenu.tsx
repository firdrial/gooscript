// src/components/AutocompleteMenu.tsx
import React from 'react';

interface AutocompleteMenuProps {
  suggestions: { label: string; value: string }[];
  activeIndex: number;
  position: { top: number; left: number };
  onSelect: (text: string) => void;
  onClose: () => void;
}

const AutocompleteMenu: React.FC<AutocompleteMenuProps> = ({
  suggestions,
  activeIndex,
  position,
  onSelect,
}) => {
  if (suggestions.length === 0) return null;

  return (
    // We use `fixed` positioning because `getBoundingClientRect()` in ScreenplayBlock 
    // returns coordinates relative to the viewport, not the parent container.
    <div
      className="fixed bg-white border border-gray-300 rounded-md shadow-lg z-[9999] max-h-60 overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '200px',
      }}
      onMouseDown={(e) => {
        // Prevent the menu container itself from stealing focus
        e.preventDefault();
      }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.value}-${index}`}
          className={`px-4 py-2 cursor-pointer font-mono text-sm transition-colors ${
            index === activeIndex 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-black hover:bg-blue-100'
          }`}
          onMouseDown={(e) => {
            // CRITICAL FIX: 
            // We use onMouseDown instead of onClick. 
            // preventDefault() stops the browser from blurring the contentEditable 
            // block, preserving the caret/selection state so insertSuggestion() works.
            e.preventDefault();
            e.stopPropagation();
            onSelect(suggestion.value);
          }}
        >
          {suggestion.label}
        </div>
      ))}
    </div>
  );
};

export default AutocompleteMenu;