import React, { useState, useRef, useEffect } from 'react';

const TopBarMenu: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle menu on click
  const handleTopLevelClick = (menuName: string) => {
    setActiveMenu(prev => (prev === menuName ? null : menuName));
  };

  // Switch menu on hover (only if a menu is already open)
  const handleTopLevelHover = (menuName: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuName);
    }
  };

  // Handle dropdown item selection
  const handleMenuAction = (action: string) => {
    // Dispatch a custom event so other components can listen and react
    window.dispatchEvent(new CustomEvent('menu-action', { detail: action }));
    setActiveMenu(null); 
  };

  // Define the menu structure
  const menus = {
    File: ['New', 'Open', 'Save', 'Save As', 'Export', 'Print'],
    Edit: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste'],
    Document: ['Page Setup'],
  };

  return (
    <div 
      className="flex items-center bg-gray-900 border-b border-gray-700 px-2.5 h-8 shrink-0 font-sans text-sm select-none" 
      ref={menuBarRef}
    >
      {Object.keys(menus).map((menuName) => (
        <div
          key={menuName}
          className={`relative px-2.5 py-1 cursor-pointer rounded transition-colors ${
            activeMenu === menuName 
              ? 'bg-gray-700 text-white' 
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
          onClick={() => handleTopLevelClick(menuName)}
          onMouseEnter={() => handleTopLevelHover(menuName)}
        >
          <span>{menuName}</span>
          {activeMenu === menuName && (
            <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-40 py-1 z-50 mt-0.5">
              {menus[menuName as keyof typeof menus].map((item) => (
                <div
                  key={item}
                  className="px-3 py-1.5 cursor-pointer text-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuAction(item);
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TopBarMenu;