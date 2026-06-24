import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Scripts from './pages/Scripts';
import Characters from './pages/Characters';
import BeatBoard from './pages/BeatBoard';
import MindMap from './pages/MindMap';
import TopBarMenu from './components/TopBarMenu';

function App() {
  return (
    <HashRouter>
      {/* Root container takes exactly 100vh and prevents window scrolling */}
      <div className="flex flex-col h-screen overflow-hidden bg-gray-900">
        <TopBarMenu />
        {/* This wrapper takes up the remaining vertical space */}
        <div className="flex-grow overflow-hidden">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Scripts />} />
              <Route path="characters" element={<Characters />} />
              <Route path="beatboard" element={<BeatBoard />} />
              <Route path="mindmap" element={<MindMap />} />
            </Route>
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}

export default App;