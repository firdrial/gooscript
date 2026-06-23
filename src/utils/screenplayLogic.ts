// src/utils/screenplayLogic.ts
export type ElementType = 
  | 'scene-heading' 
  | 'action' 
  | 'character' 
  | 'dialogue' 
  | 'parenthetical' 
  | 'transition' 
  | 'shot' 
  | 'unformatted';

export const ELEMENT_TYPES: { id: ElementType; label: string }[] = [
  { id: 'scene-heading', label: 'Scene Heading' },
  { id: 'action', label: 'Action' },
  { id: 'character', label: 'Character' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'parenthetical', label: 'Parenthetical' },
  { id: 'transition', label: 'Transition' },
  { id: 'shot', label: 'Shot' },
  { id: 'unformatted', label: 'Unformatted Text' },
];

export const TIMES_OF_DAY: string[] = [
  'DAY', 'NIGHT', 'EVENING', 'MORNING', 'AFTERNOON', 'DAWN', 'DUSK', 'LATER', 'CONTINUOUS'
];

export const TRANSITION_AUTOCOMPLETE = [
  'CUT TO:',
  'FADE OUT.',
  'FADE IN.',
  'FADE TO BLACK.',
  'DISSOLVE TO:',
  'SMASH CUT TO:',
  'MATCH CUT TO:',
  'JUMP CUT TO:',
  'CUT TO BLACK.',
  'FADE OUT TO BLACK.',
  'DISSOLVE TO BLACK.',
  'WIPE TO:',
  'IRIS OUT.',
  'IRIS IN.',
  'FREEZE FRAME.',
  'SLOW MOTION.',
  'TIME LAPSE.',
  'MONTAGE:',
  'END MONTAGE.',
  'FLASHBACK TO:',
  'FLASH FORWARD TO:',
  'RETURN TO PRESENT.',
  'SUPERIMPOSE:',
  'TITLE CARD:',
];

export const getNextTabElementType = (currentType: ElementType): ElementType => {
  const ids = ELEMENT_TYPES.map(t => t.id);
  const currentIndex = ids.indexOf(currentType);
  const nextIndex = (currentIndex + 1) % ids.length;
  return ids[nextIndex];
};

export const getPrevTabElementType = (currentType: ElementType): ElementType => {
  const ids = ELEMENT_TYPES.map(t => t.id);
  const currentIndex = ids.indexOf(currentType);
  const prevIndex = currentIndex === 0 ? ids.length - 1 : currentIndex - 1;
  return ids[prevIndex];
};

export const getEnterElementType = (currentType: ElementType): ElementType => {
  switch (currentType) {
    case 'scene-heading': return 'action';
    case 'character': return 'dialogue';
    case 'dialogue': return 'action';
    case 'parenthetical': return 'dialogue';
    default: return 'action';
  }
};

export const isLineBlank = (text: string): boolean => {
  return text.trim() === '';
};

export const getCleanText = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith('(')) clean = clean.slice(1);
  if (clean.endsWith(')')) clean = clean.slice(0, -1);
  return clean.trim();
};