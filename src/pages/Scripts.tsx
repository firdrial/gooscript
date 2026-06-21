// src/pages/Scripts.tsx
import { useState, useEffect, useCallback } from 'react';
import { loadProject, saveProject, createNewProject } from '../utils/storage';
import { Project } from '../types';
import ScreenplayEditor from '../components/ScreenplayEditor';

const Scripts = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      setProject(createNewProject('Untitled Screenplay'));
    }
  }, []);

  const handleEditorUpdate = useCallback((htmlContent: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scriptContent: htmlContent,
        lastModified: Date.now()
      };
    });
  }, []);

  // FIX: Use functional setState to always get the latest project state
  const handleNewCharacter = useCallback((name: string) => {
    setProject(prev => {
      if (!prev) return prev;
      // Check if character already exists (case-insensitive)
      if (prev.characters.find(c => c.name.toUpperCase() === name)) {
        return prev; // Already exists, no change
      }
      return {
        ...prev,
        characters: [
          ...prev.characters, 
          { id: Date.now().toString() + Math.random(), name, bio: '' }
        ]
      };
    });
  }, []);

  const handleNewLocation = useCallback((name: string) => {
    setProject(prev => {
      if (!prev) return prev;
      // Check if location already exists (case-insensitive)
      if (prev.locations.find(l => l.name.toUpperCase() === name)) {
        return prev; // Already exists, no change
      }
      return {
        ...prev,
        locations: [
          ...prev.locations, 
          { id: Date.now().toString() + Math.random(), name, description: 'BOTH' }
        ]
      };
    });
  }, []);

  const handleSave = async () => {
    if (project) {
      const success = await saveProject(project);
      if (success) alert('Script saved successfully!');
    }
  };

  const handleLoad = async () => {
    setIsLoading(true);
    setError(null);
    const loaded = await loadProject();
    if (loaded) setProject(loaded);
    setIsLoading(false);
  };

  if (error) {
    return (
      <div className="p-8 text-white">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
        <p className="mb-4">{error}</p>
        <button onClick={() => { setError(null); setProject(createNewProject('Recovery Project')); }} className="px-4 py-2 bg-blue-600 rounded">Create New Project</button>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 text-white">Loading project...</div>;
  if (!project) return <div className="p-8 text-white"><button onClick={() => setProject(createNewProject('New Screenplay'))} className="px-4 py-2 bg-blue-600 rounded">Create New Project</button></div>;

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-gray-950 border-b border-gray-800 p-4 flex justify-between items-center text-white">
        <div>
          <h1 className="text-xl font-bold">{project.title}</h1>
          <p className="text-xs text-gray-400">Last modified: {new Date(project.lastModified).toLocaleString()}</p>
          <p className="text-xs text-green-400 mt-1">
            Auto-detected: {project.characters.length} Characters, {project.locations.length} Locations
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLoad} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm">Load</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm">Save</button>
        </div>
      </div>

      <ScreenplayEditor 
        key={project.id} 
        initialContent={project.scriptContent} 
        characters={project.characters}
        locations={project.locations}
        onUpdate={handleEditorUpdate} 
        onNewCharacter={handleNewCharacter}
        onNewLocation={handleNewLocation}
      />
    </div>
  );
};

export default Scripts;