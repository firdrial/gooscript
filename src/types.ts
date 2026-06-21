// src/types.ts

export interface Character {
  id: string;
  name: string;
  bio: string;
  // We can add "Voice Fingerprints" and "Arc Spines" later!
}

export interface Location {
  id: string;
  name: string;
  description: string;
}

export interface StoryObject {
  id: string;
  name: string;
  description: string;
}

export interface Beat {
  id: string;
  title: string;
  description: string;
  act: number; // 1, 2, or 3
}

export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  // Later we'll add connections to other nodes
}

// The Master Project File
export interface Project {
  id: string;
  title: string;
  lastModified: number;
  characters: Character[];
  locations: Location[];
  objects: StoryObject[];
  beats: Beat[];
  mindMapNodes: MindMapNode[];
  scriptContent: string; // For now, just raw text. We'll upgrade this to structured blocks later.
}