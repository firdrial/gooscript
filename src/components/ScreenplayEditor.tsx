// src/components/ScreenplayEditor.tsx
import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useScreenplayLayout, Block, ElementType } from '../hooks/useScreenplayLayout';
import { ScreenplayBlock } from './ScreenplayBlock';
import { ELEMENT_TYPES, TIMES_OF_DAY } from '../utils/screenplayLogic';
import { Character, Location } from '../types';
import AutocompleteMenu from './AutocompleteMenu';

interface ScreenplayEditorProps {
  initialContent: string | null;
  characters: Character[];
  locations: Location[];
  onUpdate?: (content: string) => void;
  onNewCharacter?: (name: string) => void;
  onNewLocation?: (name: string) => void;
}

const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({
  initialContent: _initialContent,
  characters,
  locations,
  onUpdate,
  onNewCharacter,
  onNewLocation
}) => {
  const initialBlocks: Block[] = [
    { id: 'init-1', type: 'scene-heading', text: '' }
  ];

  const {
    pages, measurerRef, updateBlockText, updateBlockType,
    addBlockAfter, deleteBlock
  } = useScreenplayLayout(initialBlocks);

  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ElementType>('scene-heading');

  const [suggestions, setSuggestions] = useState<{label: string, value: string}[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [autocompleteMode, setAutocompleteMode] = useState<'prefix' | 'location' | 'time' | 'character'>('character');

  useEffect(() => {
    if (onUpdate) {
      const allBlocks = pages.flatMap(p => p.blocks);
      const html = allBlocks.map(b => `<p data-element-type="${b.type}">${b.text || ''}</p>`).join('');
      onUpdate(html);
    }
  }, [pages, onUpdate]);

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    blockRefs.current[id] = el;
  }, []);

  const focusBlock = useCallback((blockId: string, offset: number | 'end' | 'start' = 'end') => {
    requestAnimationFrame(() => {
      const el = blockRefs.current[blockId];
      if (el) {
        el.focus();
        if (!el.firstChild) {
          el.innerHTML = '<br>';
        }
        if (el.firstChild) {
          const range = document.createRange();
          if (offset === 'end') {
            range.selectNodeContents(el);
            range.collapse(false);
          } else if (offset === 'start') {
            range.setStart(el.firstChild, 0);
            range.collapse(true);
          } else {
            if (el.firstChild.nodeType === Node.TEXT_NODE) {
              const textNode = el.firstChild as Text;
              const safeOffset = Math.min(offset, textNode.length);
              range.setStart(textNode, safeOffset);
            } else {
              range.setStart(el.firstChild, 0);
            }
            range.collapse(true);
          }
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    });
  }, []);

  const handleAddBlock = useCallback((blockId: string, type: ElementType, text: string = '') => {
    return addBlockAfter(blockId, type, text);
  }, [addBlockAfter]);

  const handleDeleteBlock = useCallback((blockId: string) => {
    const allBlocks = pages.flatMap(p => p.blocks);
    const index = allBlocks.findIndex(b => b.id === blockId);
    if (index > 0) {
      const prevId = allBlocks[index - 1].id;
      deleteBlock(blockId);
      focusBlock(prevId, 'end');
    } else if (index === 0) {
      updateBlockText(blockId, '');
      updateBlockType(blockId, 'scene-heading');
    }
  }, [pages, deleteBlock, focusBlock, updateBlockText, updateBlockType]);

  const handleBlockFocus = useCallback((id: string, type: ElementType) => {
    setActiveBlockId(id);
    setActiveType(type);
  }, []);

  const handleTypeChange = useCallback((_id: string, type: ElementType) => {
    setActiveType(type);
  }, []);

  const handleToolbarClick = useCallback((type: ElementType) => {
    if (activeBlockId) {
      if (type === 'parenthetical' && activeType !== 'parenthetical') {
        updateBlockText(activeBlockId, '()');
        updateBlockType(activeBlockId, type);
        setActiveType(type);
        requestAnimationFrame(() => {
          const el = blockRefs.current[activeBlockId];
          if (el && el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
            el.focus();
            const range = document.createRange();
            range.setStart(el.firstChild, 1);
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        });
      } else {
        updateBlockType(activeBlockId, type);
        setActiveType(type);
        requestAnimationFrame(() => {
          const el = blockRefs.current[activeBlockId];
          if (el) el.focus();
        });
      }
    }
  }, [activeBlockId, activeType, updateBlockText, updateBlockType]);

  const handleBlockExit = useCallback((block: Block) => {
    if (block.type === 'character' && onNewCharacter) {
      const name = block.text.split('(')[0].trim().toUpperCase();
      if (name && name.length > 0) {
        onNewCharacter(name);
      }
    }
    else if (block.type === 'scene-heading' && onNewLocation) {
      const match = block.text.match(/^(?:INT\.|EXT\.|INT\.\/EXT\.)\s+(.*?)(?:\s*-\s*.*)?$/i);
      if (match && match[1]) {
        const locationName = match[1].trim().toUpperCase();
        if (locationName && locationName.length > 0) {
          onNewLocation(locationName);
        }
      }
    }
  }, [onNewCharacter, onNewLocation]);

  const handleAutocompleteTrigger = useCallback((text: string, type: string, coords: { top: number; left: number }) => {
    // Prevent menu from spawning at 0,0 when text is deleted/empty
    if (!text || text.trim() === '') {
      setIsMenuOpen(false);
      setSuggestions([]);
      return;
    }

    let newSuggestions: {label: string, value: string}[] = [];
    let mode: typeof autocompleteMode = 'character';
    const words = text.split(/\s+/);
    const currentWord = words[words.length - 1] || '';

    if (type === 'character') {
      // FIX: Removed !== check so existing characters show up as suggestions
      if (currentWord.length > 0) {
        const matches = characters.filter(c =>
          c.name.toLowerCase().startsWith(currentWord.toLowerCase())
        );
        newSuggestions = matches.map(c => ({ label: c.name, value: c.name }));
      }
      mode = 'character';
    }
    else if (type === 'scene-heading') {
      const upperText = text.toUpperCase();
      
      // Check for prefixes (Order matters: check INT./EXT. before INT. or EXT.)
      const hasIntExt = upperText.includes('INT./EXT.');
      const hasInt = !hasIntExt && upperText.includes('INT.');
      const hasExt = !hasIntExt && upperText.includes('EXT.');
      const hasPrefix = hasInt || hasExt || hasIntExt;
      
      let prefix = '';
      if (hasIntExt) prefix = 'INT./EXT.';
      else if (hasInt) prefix = 'INT.';
      else if (hasExt) prefix = 'EXT.';
      
      let afterPrefix = upperText;
      if (hasPrefix) {
        afterPrefix = upperText.substring(upperText.indexOf(prefix) + prefix.length).trim();
      }
      
      const hasDash = afterPrefix.includes(' - ') || afterPrefix.includes('-');
      let afterLocation = '';
      if (hasDash) {
        const parts = afterPrefix.split(/\s*-\s*/);
        if (parts.length > 1) afterLocation = parts[parts.length - 1].trim();
      }

      if (!hasPrefix) {
        // Only show prefix suggestions if user started typing I or E
        if (upperText.startsWith('I') || upperText.startsWith('E')) {
          if (upperText.startsWith('I')) {
            if ('INT.'.startsWith(upperText)) newSuggestions.push({ label: 'INT.', value: 'INT.' });
            if ('INT./EXT.'.startsWith(upperText)) newSuggestions.push({ label: 'INT./EXT.', value: 'INT./EXT.' });
          }
          if (upperText.startsWith('E')) {
            if ('EXT.'.startsWith(upperText)) newSuggestions.push({ label: 'EXT.', value: 'EXT.' });
          }
        }
        mode = 'prefix';
      }
      else if (!hasDash && afterPrefix && !afterLocation) {
        const locMatches = locations.filter(l => {
          const locUpper = l.name.toUpperCase();
          const matchesText = locUpper.startsWith(afterPrefix) && locUpper !== afterPrefix;
          const locPrefix = l.description || '';
          const matchesPrefix = locPrefix === 'BOTH' || locPrefix === prefix || locPrefix === '' || (prefix === 'INT./EXT.' && (locPrefix === 'INT.' || locPrefix === 'EXT.'));
          return matchesText && matchesPrefix;
        }).map(l => ({ label: l.name, value: l.name }));
        newSuggestions = locMatches;
        mode = 'location';
      }
      else if (hasDash && afterLocation) {
        const timeMatches = TIMES_OF_DAY.filter((t: string) => t.startsWith(afterLocation) && t !== afterLocation);
        newSuggestions = timeMatches.map((t: string) => ({ label: t, value: t }));
        mode = 'time';
      }
      else if (hasDash && !afterLocation) {
        newSuggestions = TIMES_OF_DAY.map((t: string) => ({ label: t, value: t }));
        mode = 'time';
      }
    }

    if (newSuggestions.length > 0 && (type === 'character' || type === 'scene-heading')) {
      setSuggestions(newSuggestions);
      setActiveIndex(0);
      setIsMenuOpen(true);
      setAutocompleteMode(mode);
      setPopupPos(coords);
    } else {
      setIsMenuOpen(false);
    }
  }, [characters, locations, autocompleteMode]);

  const insertSuggestion = useCallback((text: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent || '';
        const offset = range.startOffset;
        const textBefore = textContent.substring(0, offset);
        
        let wordStart = 0;
        let textToInsert = text;

        // Dash-aware replacement for Times of Day
        if (autocompleteMode === 'time') {
          const lastDash = textBefore.lastIndexOf('-');
          if (lastDash !== -1) {
            const afterDash = textBefore.substring(lastDash + 1);
            const match = afterDash.match(/\S/);
            if (match && match.index !== undefined) {
              wordStart = lastDash + 1 + match.index;
              if (match.index === 0) textToInsert = ' ' + text;
            } else {
              wordStart = offset;
              if (textBefore.endsWith('-')) textToInsert = ' ' + text;
            }
          } else {
            const lastSpace = textBefore.lastIndexOf(' ');
            wordStart = lastSpace === -1 ? 0 : lastSpace + 1;
          }
        } else {
          const lastSpace = textBefore.lastIndexOf(' ');
          wordStart = lastSpace === -1 ? 0 : lastSpace + 1;
        }

        range.setStart(node, wordStart);
        range.setEnd(node, offset);
        range.deleteContents();
        document.execCommand('insertText', false, textToInsert);

        if (activeBlockId) {
          const allBlocks = pages.flatMap(p => p.blocks);
          const currentBlock = allBlocks.find(b => b.id === activeBlockId);
          if (currentBlock && (currentBlock.type === 'character' || currentBlock.type === 'scene-heading')) {
            const newText = textContent.substring(0, wordStart) + textToInsert + textContent.substring(offset);
            const updatedBlock = { ...currentBlock, text: newText };
            setTimeout(() => handleBlockExit(updatedBlock), 0);
          }
        }
      }
    }
    setIsMenuOpen(false);
  }, [activeBlockId, pages, handleBlockExit, autocompleteMode]);

  const handleMenuKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isMenuOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex(prev => (prev + 1) % suggestions.length);
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      if (suggestions[activeIndex]) {
        insertSuggestion(suggestions[activeIndex].value);
      }
    }
    else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsMenuOpen(false);
    }
  }, [isMenuOpen, suggestions, activeIndex, insertSuggestion]);

  useEffect(() => {
    window.addEventListener('keydown', handleMenuKeyDown, true);
    return () => window.removeEventListener('keydown', handleMenuKeyDown, true);
  }, [handleMenuKeyDown]);

  const handlePageContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const lastPage = pages[pages.length - 1];
      if (lastPage && lastPage.blocks.length > 0) {
        const lastBlock = lastPage.blocks[lastPage.blocks.length - 1];
        if (!lastBlock.text || lastBlock.text.trim() === '') {
          focusBlock(lastBlock.id, 'end');
        } else {
          const newId = addBlockAfter(lastBlock.id, 'action');
          focusBlock(newId, 'end');
        }
      } else {
        const newId = addBlockAfter('init-1', 'action');
        focusBlock(newId, 'end');
      }
    }
  }, [pages, addBlockAfter, focusBlock]);

  const handlePasteBlock = useCallback((blocksToInsert: { type: ElementType; text: string }[]) => {
    if (!activeBlockId || blocksToInsert.length === 0) return;
    updateBlockText(activeBlockId, blocksToInsert[0].text);
    updateBlockType(activeBlockId, blocksToInsert[0].type);

    let lastId = activeBlockId;
    for (let i = 1; i < blocksToInsert.length; i++) {
      const newId = addBlockAfter(lastId, blocksToInsert[i].type, blocksToInsert[i].text);
      lastId = newId;
    }

    focusBlock(lastId, 'end');
  }, [activeBlockId, updateBlockText, updateBlockType, addBlockAfter, focusBlock]);

  return (
    <div className="flex flex-col h-full bg-gray-800 relative">
      <div className="bg-gray-900 border-b border-gray-700 p-2 flex gap-2 shrink-0">
        {ELEMENT_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => handleToolbarClick(t.id)}
            className={`px-3 py-1 rounded text-sm font-mono transition-colors cursor-pointer ${
              activeType === t.id ? 'bg-blue-600 text-white font-bold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto text-gray-300 font-mono flex items-center">
          {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-grow overflow-auto bg-gray-500 p-8 flex flex-col items-center"
      >
        {pages.map((page) => (
          <div key={page.id} className="sp-page">
            <div className="sp-page-number">{page.id.split('-')[1] ? parseInt(page.id.split('-')[1]) + 1 : 1}.</div>
            <div className="sp-page-content" onClick={handlePageContentClick}>
              {page.blocks.map(block => (
                <ScreenplayBlock
                  key={block.id}
                  block={block}
                  onUpdateText={updateBlockText}
                  onUpdateType={updateBlockType}
                  onTypeChange={handleTypeChange}
                  onAddBlock={handleAddBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onFocusNext={(id, offset) => focusBlock(id, offset ?? 0)}
                  onFocus={handleBlockFocus}
                  registerRef={registerRef}
                  onAutocompleteTrigger={handleAutocompleteTrigger}
                  onBlockExit={handleBlockExit}
                  isActive={activeBlockId === block.id}
                  onPasteBlock={handlePasteBlock}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div ref={measurerRef} className="sp-measurer" />

      {isMenuOpen && (
        <AutocompleteMenu
          suggestions={suggestions}
          activeIndex={activeIndex}
          position={popupPos}
          onSelect={insertSuggestion}
          onClose={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default ScreenplayEditor;