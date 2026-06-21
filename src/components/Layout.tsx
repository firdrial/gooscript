import { NavLink, Outlet } from 'react-router-dom';
import { FileText, Users, LayoutGrid, Network, Settings } from 'lucide-react';

const Layout = () => {
  // Helper for active link styling
  const linkClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-600 text-white' 
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`;

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-950 p-4 flex flex-col border-r border-gray-800">
        <div className="text-2xl font-bold mb-8 px-4 text-blue-400">
          Gooscript
        </div>
        
        <nav className="flex flex-col gap-2 flex-grow">
          <NavLink to="/" end className={linkClass}>
            <FileText size={20} /> Scripts
          </NavLink>
          <NavLink to="/characters" className={linkClass}>
            <Users size={20} /> Characters & Hub
          </NavLink>
          <NavLink to="/beatboard" className={linkClass}>
            <LayoutGrid size={20} /> Beat Board
          </NavLink>
          <NavLink to="/mindmap" className={linkClass}>
            <Network size={20} /> Mind Map
          </NavLink>
        </nav>

        <div className="mt-auto border-t border-gray-800 pt-4">
          <NavLink to="/settings" className={linkClass}>
            <Settings size={20} /> Settings
          </NavLink>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-grow overflow-auto bg-gray-900">
        {/* This is where the page content will render */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;