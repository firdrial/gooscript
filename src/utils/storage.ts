// src/utils/storage.ts
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { Project } from '../types';

// Create a blank project template
export const createNewProject = (title: string): Project => {
  return {
    id: crypto.randomUUID(),
    title,
    lastModified: Date.now(),
    characters: [],
    locations: [],
    objects: [],
    beats: [],
    mindMapNodes: [],
    scriptContent: '<div data-type="scene-heading"></div>', 
  };
};

// Save the project to a .gooscript file
export const saveProject = async (project: Project) => {
  try {
    console.log('[SAVE] Attempting to save project...');
    
    const filePath = await save({
      filters: [{
        name: 'Gooscript Project',
        extensions: ['gooscript']
      }],
      defaultPath: `${project.title.replace(/\s+/g, '_')}.gooscript`
    });

    if (filePath) {
      const data = JSON.stringify(project, null, 2);
      await writeTextFile(filePath, data);
      console.log('[SAVE] Project saved to:', filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SAVE] Error saving project:', error);
    alert('Failed to save: ' + error);
    return false;
  }
};

// Load a project from a .gooscript file
export const loadProject = async (): Promise<Project | null> => {
  try {
    console.log('[LOAD] Starting load process...');
    
    const filePath = await open({
      filters: [{
        name: 'Gooscript Project',
        extensions: ['gooscript']
      }],
      multiple: false
    });

    if (!filePath) {
      console.log('[LOAD] User cancelled dialog');
      return null;
    }

    console.log('[LOAD] Reading file:', filePath);
    const data = await readTextFile(filePath as string);
    const project = JSON.parse(data) as Project;
    
    // Fallback for older saves that might not have scriptContent
    if (!project.scriptContent) {
      project.scriptContent = '<div data-type="scene-heading"></div>'; 
    }

    console.log('[LOAD] Successfully parsed project:', project.title);
    return project;
  } catch (error) {
    console.error('[LOAD] Error loading project:', error);
    alert('Failed to load: ' + error);
    return null;
  }
};