// src/utils/scriptParser.ts

export interface ExtractedEntity {
  id: string;
  name: string;
}

export const extractEntitiesFromScript = (html: string, ignoreText: string = '', ignoreType: string = '') => {
  const characters = new Map<string, string>(); 
  const locations = new Map<string, {name: string, prefix: string}>();  // Now tracks INT/EXT context

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const paragraphs = doc.querySelectorAll('p');

  paragraphs.forEach(p => {
    const type = p.getAttribute('data-element-type');
    const text = p.textContent?.trim() || '';

    if (!text) return;

    // Skip the block we're currently typing in
    if (type === ignoreType && text === ignoreText) {
      return; 
    }

    // --- EXTRACT CHARACTERS ---
    if (type === 'character') {
      let cleanName = text.replace(/\(.*?\)/g, '').trim().toUpperCase();
      
      if (cleanName) {
        const id = `char-${cleanName.replace(/[^A-Z0-9]/g, '-')}`;
        characters.set(id, cleanName);
      }
    }

    // --- EXTRACT LOCATIONS with INT/EXT context ---
    if (type === 'scene-heading') {
      const match = text.match(/^(INT|EXT|INT\.?\/?EXT|EXT\.?\/?INT|I\/E)\.?\s+([^-]+?)(?:\s*-\s*.+)?$/i);
      
      if (match && match[1] && match[2]) {
        const prefix = match[1].toUpperCase().startsWith('INT') ? 'INT.' : 'EXT.';
        let locationName = match[2].trim().toUpperCase();
        const id = `loc-${locationName.replace(/[^A-Z0-9]/g, '-')}`;
        
        // Store the location with its prefix context
        if (!locations.has(id)) {
          locations.set(id, { name: locationName, prefix });
        } else {
          // If location exists, make sure we track both INT and EXT if used
          const existing = locations.get(id)!;
          if (existing.prefix !== prefix) {
            // Mark as usable with both prefixes
            locations.set(id, { name: locationName, prefix: 'BOTH' });
          }
        }
      }
    }
  });

  return {
    characters: Array.from(characters.entries()).map(([id, name]) => ({ id, name })),
    locations: Array.from(locations.entries()).map(([id, data]) => ({ 
      id, 
      name: data.name, 
      description: data.prefix // This stores INT. or EXT. or BOTH
    }))
  };
};