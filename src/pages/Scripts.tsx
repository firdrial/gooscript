// src/pages/Scripts.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { loadProject, saveProject, saveProjectAs, createNewProject } from '../utils/storage';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Project } from '../types';
import ScreenplayEditor from '../components/ScreenplayEditor';

const Scripts = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showClosePrompt, setShowClosePrompt] = useState(false);
  const isClosing = useRef(false);
  const baselineContentRef = useRef<string | null>(null);
  const isEditorReady = useRef(false);
  const [pendingAction, setPendingAction] = useState<'New' | 'Open' | 'Close' | null>(null);

  useEffect(() => {
    if (!project) {
      setProject(createNewProject('Untitled Screenplay'));
      setIsDirty(false);
    }
  }, []);

  // Reset baseline and start a "grace period" whenever the project changes
  useEffect(() => {
    if (project) {
      baselineContentRef.current = null;
      setIsDirty(false);
      isEditorReady.current = false;
      
      // Give the editor time to mount and run its initial layout passes
      // (useScreenplayLayout updates pages asynchronously after mount)
      const timer = setTimeout(() => {
        isEditorReady.current = true;
      }, 300); 
      
      return () => clearTimeout(timer);
    }
  }, [project?.id]);

  const handleEditorUpdate = useCallback((htmlContent: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scriptContent: htmlContent,
        lastModified: Date.now()
      };
    });

    // During the grace period, the editor is still doing initial layout.
    // Just keep updating the baseline without marking as dirty.
    if (!isEditorReady.current) {
      baselineContentRef.current = htmlContent;
      setIsDirty(false);
      return;
    }

    // Once ready, establish baseline on the first update if it's null
    if (baselineContentRef.current === null) {
      baselineContentRef.current = htmlContent;
      setIsDirty(false);
    } else {
      // Compare against the baseline
      if (htmlContent !== baselineContentRef.current) {
        setIsDirty(true);
      } else {
        setIsDirty(false);
      }
    }
  }, []);

const handleNewCharacter = useCallback((name: string) => {
  // FIX: Only mark as dirty if we have a valid, non-empty name
  const cleanName = name.trim();
  if (!cleanName) return; // Ignore empty names
  
  setProject(prev => {
    if (!prev) return prev;
    // Check if character already exists (case-insensitive)
    if (prev.characters.find(c => c.name.toUpperCase() === cleanName.toUpperCase())) {
      return prev; // Already exists, no change
    }
    setIsDirty(true); // Mark dirty only after confirming it's a new, valid character
    return {
      ...prev,
      characters: [
        ...prev.characters,
        { id: Date.now().toString() + Math.random(), name: cleanName, bio: '' }
      ]
    };
  });
}, []);

const handleNewLocation = useCallback((name: string) => {
  // FIX: Only mark as dirty if we have a valid, non-empty name
  const cleanName = name.trim();
  if (!cleanName) return; // Ignore empty names
  
  setProject(prev => {
    if (!prev) return prev;
    // Check if location already exists (case-insensitive)
    if (prev.locations.find(l => l.name.toUpperCase() === cleanName.toUpperCase())) {
      return prev; // Already exists, no change
    }
    setIsDirty(true); // Mark dirty only after confirming it's a new, valid location
    return {
      ...prev,
      locations: [
        ...prev.locations,
        { id: Date.now().toString() + Math.random(), name: cleanName, description: 'BOTH' }
      ]
    };
  });
}, []);

  const handleSave = useCallback(async () => {
    if (project) {
      const result = await saveProject(project); // Changed from 'success' to 'result'
      if (result.success) {
        // Update the project state with the filePath if it was newly created
        if (result.updatedProject) {
          setProject(result.updatedProject);
        }
        
        // Your original isDirty logic remains exactly the same
        alert('Script saved successfully!');
        baselineContentRef.current = project.scriptContent;
        setIsDirty(false);
      }
    }
  }, [project]);

  const handleSaveAs = useCallback(async () => {
    if (project) {
      const result = await saveProjectAs(project);
      if (result.success) {
        // Update the project state with the new filePath and title
        if (result.updatedProject) {
          setProject(result.updatedProject);
        }
        alert('Script saved successfully!');
        baselineContentRef.current = project.scriptContent;
        setIsDirty(false);
      }
    }
  }, [project]);

  const handleLoad = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const loaded = await loadProject();
    if (loaded) {
      setProject(loaded);
      setIsDirty(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleMenuEvent = (e: Event) => {
      const action = (e as CustomEvent).detail;
      
      if (action === 'New') {
        if (isDirty) {
          setPendingAction('New');
          setShowClosePrompt(true);
        } else {
          setProject(createNewProject('Untitled Screenplay'));
          setIsDirty(false);
        }
      } else if (action === 'Open') {
        if (isDirty) {
          setPendingAction('Open');
          setShowClosePrompt(true);
        } else {
          handleLoad();
        }
      } else if (action === 'Save') {
        handleSave();
      } else if (action === 'Save As') {
        handleSaveAs();
      }
    };

    window.addEventListener('menu-action', handleMenuEvent);
    return () => window.removeEventListener('menu-action', handleMenuEvent);
  }, [project, isDirty, handleLoad, handleSave, handleSaveAs]); // Added handleSaveAs to dependencies

  // Intercept window close to prompt for unsaved changes
  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onCloseRequested((event) => {
      if (isClosing.current) return; 

      if (isDirty) {
        event.preventDefault();
        setPendingAction('Close'); // Track that this was a close attempt
        setShowClosePrompt(true);
      }
    });

    return () => {
      unlistenPromise.then(unlistenFn => unlistenFn());
    };
  }, [isDirty]);

  // Handlers for the custom close prompt modal
  const handleCloseSave = async () => {
    if (project) {
      const result = await saveProject(project); // Changed from 'success' to 'result'
      if (result.success) {
        // Update the project state with the filePath if it was newly created
        if (result.updatedProject) {
          setProject(result.updatedProject);
        }

        // Your original pendingAction logic remains exactly the same
        if (pendingAction === 'Close') {
          isClosing.current = true;
          await getCurrentWindow().destroy();
        } else if (pendingAction === 'New') {
          setProject(createNewProject('Untitled Screenplay'));
          setIsDirty(false);
        } else if (pendingAction === 'Open') {
          handleLoad();
        }
      }
    }
    setShowClosePrompt(false);
    setPendingAction(null);
  };

  const handleCloseDontSave = async () => {
    if (pendingAction === 'Close') {
      isClosing.current = true;
      await getCurrentWindow().destroy();
    } else if (pendingAction === 'New') {
      setProject(createNewProject('Untitled Screenplay'));
      setIsDirty(false);
    } else if (pendingAction === 'Open') {
      handleLoad();
    }
    setShowClosePrompt(false);
    setPendingAction(null);
  };

  const handleCloseCancel = () => {
    setShowClosePrompt(false);
    setPendingAction(null);
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
      {showClosePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white p-6 rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-4">Unsaved Changes</h3>
            <p className="mb-6 text-gray-300">
              {pendingAction === 'New' 
                ? 'You have unsaved changes. Do you want to save before creating a new script?' 
                : pendingAction === 'Open' 
                ? 'You have unsaved changes. Do you want to save before opening a different script?' 
                : 'You have unsaved changes. Do you want to save before closing?'}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleCloseCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCloseDontSave}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded transition-colors"
              >
                Don't Save
              </button>
              <button 
                onClick={handleCloseSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scripts;