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
      <TopBarMenu />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Scripts />} />
          <Route path="characters" element={<Characters />} />
          <Route path="beatboard" element={<BeatBoard />} />
          <Route path="mindmap" element={<MindMap />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;