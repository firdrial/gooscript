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
    File: ['New', 'Open', 'Save', 'Export', 'Print'],
    Edit: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste'],
    Document: ['Page Setup'],
  };

  return (
    <div className="top-bar-menu" ref={menuBarRef}>
      {Object.keys(menus).map((menuName) => (
        <div
          key={menuName}
          className={`menu-item ${activeMenu === menuName ? 'active' : ''}`}
          onClick={() => handleTopLevelClick(menuName)}
          onMouseEnter={() => handleTopLevelHover(menuName)}
        >
          <span className="menu-title">{menuName}</span>
          {activeMenu === menuName && (
            <div className="dropdown-menu">
              {menus[menuName as keyof typeof menus].map((item) => (
                <div
                  key={item}
                  className="dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuAction(item)
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