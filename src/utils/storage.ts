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
export const saveProject = async (project: Project): Promise<{ success: boolean; updatedProject?: Project }> => {
 try {
 console.log('[SAVE] Attempting to save project...');
 let filePath = project.filePath;

 // If the project doesn't have a filePath, prompt the user to choose one (Save As behavior)
 if (!filePath) {
   const selectedPath = await save({
     filters: [{
       name: 'Gooscript Project',
       extensions: ['gooscript']
     }],
     defaultPath: `${project.title.replace(/\s+/g, '_')}.gooscript` // Fixed regex typo
   });

   if (!selectedPath) {
     return { success: false }; // User cancelled the dialog
   }
   filePath = selectedPath;
 }

 const data = JSON.stringify(project, null, 2);
 await writeTextFile(filePath, data);
 console.log('[SAVE] Project saved to:', filePath);
 
 // Return the updated project with the filePath so the state can be updated
 const updatedProject = { ...project, filePath };
 return { success: true, updatedProject };
 } catch (error) {
 console.error('[SAVE] Error saving project:', error);
 alert('Failed to save: ' + error);
 return { success: false };
 }
};

// Save the project to a new .gooscript file (Save As)
export const saveProjectAs = async (project: Project): Promise<{ success: boolean; updatedProject?: Project }> => {
  try {
    console.log('[SAVE AS] Attempting to save project as...');
    
    // Always prompt the user to choose a new path
    const selectedPath = await save({
      filters: [{
        name: 'Gooscript Project',
        extensions: ['gooscript']
      }],
      defaultPath: `${project.title.replace(/\s+/g, '_')}.gooscript`
    });

    if (!selectedPath) {
      return { success: false }; // User cancelled the dialog
    }

    const data = JSON.stringify(project, null, 2);
    await writeTextFile(selectedPath, data);
    console.log('[SAVE AS] Project saved to:', selectedPath);
    
    // Extract the new file name to update the title
    const pathParts = selectedPath.split(/[\\/]/);
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.replace(/\.gooscript$/i, "");
    
    // Return the updated project with the new filePath and title
    const updatedProject = { ...project, filePath: selectedPath, title: nameWithoutExt };
    return { success: true, updatedProject };
  } catch (error) {
    console.error('[SAVE AS] Error saving project:', error);
    alert('Failed to save: ' + error);
    return { success: false };
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

    // --- ADD THESE LINES TO EXTRACT FILE NAME AND PATH ---
    const pathParts = (filePath as string).split(/[\\/]/);
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.replace(/\.gooscript$/i, "");
    project.title = nameWithoutExt; // Fixes the "UNTITLED_SCREENPLAY" issue
    
    project.filePath = filePath as string; // Enables instant saving
    // -----------------------------------------------------

    console.log('[LOAD] Successfully parsed project:', project.title);
    return project;
  } catch (error) {
    console.error('[LOAD] Error loading project:', error);
    alert('Failed to load: ' + error);
    return null;
  }
};