// src/components/ScreenplayBlock.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { Block, ElementType } from '../hooks/useScreenplayLayout';
import { getPrevTabElementType, getEnterElementType, isLineBlank, getCleanText } from '../utils/screenplayLogic';

interface ScreenplayBlockProps {
  block: Block;
  onUpdateText: (id: string, text: string) => void;
  onUpdateType: (id: string, type: ElementType) => void;
  onTypeChange: (id: string, type: ElementType) => void;
  onAddBlock: (id: string, type: ElementType, text?: string) => string;
  onDeleteBlock: (id: string) => void;
  onFocusNext: (id: string, offset?: number | 'start' | 'end') => void;
  onFocus: (id: string, type: ElementType) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  onAutocompleteTrigger?: (text: string, type: string, coords: { top: number; left: number }) => void;
  onBlockExit?: (block: Block) => void;
  isActive: boolean;
  onPasteBlock?: (blocks: { type: ElementType; text: string }[]) => void;
}

export const ScreenplayBlock: React.FC<ScreenplayBlockProps> = ({
  block,
  onUpdateText,
  onUpdateType,
  onTypeChange,
  onAddBlock,
  onDeleteBlock,
  onFocusNext,
  onFocus,
  registerRef,
  onAutocompleteTrigger,
  onBlockExit,
  isActive,
  onPasteBlock,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const lastDomText = useRef(block.text);
  const isPasting = useRef(false);

  useEffect(() => {
    registerRef(block.id, ref.current);
    return () => registerRef(block.id, null);
  }, [block.id, registerRef]);

  useEffect(() => {
    if (ref.current && isInitialMount.current) {
      if (block.text === '') {
        ref.current.innerHTML = '<br>';
      } else {
        ref.current.innerText = block.text;
      }
      ref.current.setAttribute('data-type', block.type);
      lastDomText.current = block.text;
      isInitialMount.current = false;
    }
  }, []);

  // CRITICAL: Never touch DOM text while focused unless pasting
  useEffect(() => {
    if (ref.current && !isInitialMount.current) {
      const isFocused = document.activeElement === ref.current;

      if (isFocused && !isPasting.current) {
        lastDomText.current = block.text;
        return;
      }

      if (ref.current.getAttribute('data-type') !== block.type) {
        ref.current.setAttribute('data-type', block.type);
      }

      const isExternalUpdate = block.text !== lastDomText.current;

      if (isExternalUpdate || !isActive) {
        if (block.text === '') {
          if (ref.current.innerHTML !== '<br>') {
            ref.current.innerHTML = '<br>';
          }
        } else {
          if (ref.current.innerText !== block.text) {
            ref.current.innerText = block.text;
          }
        }
        lastDomText.current = block.text;
      }
    }
  }, [block.text, block.type, isActive]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const rawText = ref.current.innerText;
    
    // Preserve newlines for unformatted text, normalize spaces for others
    let text = rawText;
    if (block.type === 'unformatted') {
      // [^\S\n] matches whitespace that is NOT a newline
      text = text.replace(/[^\S\n]+/g, ' ').trim();
    } else {
      text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }

    lastDomText.current = text;
    onUpdateText(block.id, text);

    if (onAutocompleteTrigger && (block.type === 'character' || block.type === 'scene-heading')) {
      // ... rest of your existing logic
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        onAutocompleteTrigger(text, block.type, { top: rect.bottom, left: rect.left });
      }
    }
  }, [block.id, block.type, onUpdateText, onAutocompleteTrigger]);

  const applyChanges = useCallback((newType: ElementType, newText?: string) => {
    if (!ref.current) return;
    onUpdateType(block.id, newType);
    onTypeChange(block.id, newType);

    if (newText !== undefined) {
      onUpdateText(block.id, newText);
      if (newText === '') {
        ref.current.innerHTML = '<br>';
      } else {
        ref.current.innerText = newText;
      }
      lastDomText.current = newText;
    }
    ref.current.setAttribute('data-type', newType);
  }, [block.id, onUpdateType, onTypeChange, onUpdateText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!ref.current) return;
    const currentText = ref.current.innerText.replace(/\n/g, '');
    const isBlank = isLineBlank(currentText);
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const isAtEnd = range && range.startOffset !== undefined ? range.startOffset >= currentText.length : false;

    // --- ARROW KEY NAVIGATION WITH RELATIVE CURSOR POSITION ---
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && range) {
      try {
        const rects = range.getClientRects();
        
        // Get the bounding rect of the actual text content, ignoring block padding/margins
        const fullRange = document.createRange();
        fullRange.selectNodeContents(ref.current);
        const fullRect = fullRange.getBoundingClientRect();
        
        const cursorRect = rects.length > 0 ? rects[0] : null;
        if (cursorRect) {
          const isAtVisualTop = cursorRect.top <= fullRect.top + 2;
          const isAtVisualBottom = cursorRect.bottom >= fullRect.bottom - 2;
          
          // Store the exact horizontal pixel position before moving
          const targetX = cursorRect.left;
          
          if (e.key === 'ArrowUp' && isAtVisualTop) {
            e.preventDefault();
            let prevEl = ref.current.previousElementSibling as HTMLElement | null;
            while (prevEl && !prevEl.hasAttribute('data-block-id')) {
              prevEl = prevEl.previousElementSibling as HTMLElement | null;
            }
            if (prevEl) {
              const prevId = prevEl.getAttribute('data-block-id');
              if (prevId) {
                prevEl.focus();
                
                const targetFullRange = document.createRange();
                targetFullRange.selectNodeContents(prevEl);
                const targetFullRect = targetFullRange.getBoundingClientRect();
                
                const targetY = targetFullRect.bottom - 4;
                let pos: { offsetNode: Node, offset: number } | null = null;
                if ('caretPositionFromPoint' in document) {
                  pos = (document as any).caretPositionFromPoint(targetX, targetY);
                } else if ('caretRangeFromPoint' in document) {
                  const r = (document as any).caretRangeFromPoint(targetX, targetY);
                  if (r) pos = { offsetNode: r.startContainer, offset: r.startOffset };
                }
                if (pos && prevEl.contains(pos.offsetNode)) {
                  const newRange = document.createRange();
                  newRange.setStart(pos.offsetNode, pos.offset);
                  newRange.collapse(true);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(newRange);
                } else {
                  onFocusNext(prevId, 'end');
                }
              }
            }
            return;
          }
          
          if (e.key === 'ArrowDown' && isAtVisualBottom) {
            e.preventDefault();
            let nextEl = ref.current.nextElementSibling as HTMLElement | null;
            while (nextEl && !nextEl.hasAttribute('data-block-id')) {
              nextEl = nextEl.nextElementSibling as HTMLElement | null;
            }
            if (nextEl) {
              const nextId = nextEl.getAttribute('data-block-id');
              if (nextId) {
                nextEl.focus();
                
                const targetFullRange = document.createRange();
                targetFullRange.selectNodeContents(nextEl);
                const targetFullRect = targetFullRange.getBoundingClientRect();
                
                const targetY = targetFullRect.top + 4;
                let pos: { offsetNode: Node, offset: number } | null = null;
                if ('caretPositionFromPoint' in document) {
                  pos = (document as any).caretPositionFromPoint(targetX, targetY);
                } else if ('caretRangeFromPoint' in document) {
                  const r = (document as any).caretRangeFromPoint(targetX, targetY);
                  if (r) pos = { offsetNode: r.startContainer, offset: r.startOffset };
                }
                if (pos && nextEl.contains(pos.offsetNode)) {
                  const newRange = document.createRange();
                  newRange.setStart(pos.offsetNode, pos.offset);
                  newRange.collapse(true);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(newRange);
                } else {
                  onFocusNext(nextId, 'start');
                }
              }
            }
            return;
          }
        }
      } catch {
        // Fall through to default behavior if measurement fails
      }
    }
    // ------------------------------------------------

    // Formatting hotkeys
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (isCtrlOrCmd) {
      let newType: ElementType | null = null;
      if (e.key === '1' || e.key === 'Enter') newType = 'scene-heading';
      else if (e.key === '2') newType = 'action';
      else if (e.key === '3') newType = 'character';
      else if (e.key === '4') newType = 'dialogue';
      else if (e.key === '5') newType = 'parenthetical';
      else if (e.key === '6') newType = 'transition';
      else if (e.key === '7') newType = 'shot';
      else if (e.key === '0') newType = 'unformatted';

      if (newType && newType !== block.type) {
        e.preventDefault();
        e.stopPropagation();
        applyChanges(newType);
        return;
      }
    }

    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (onBlockExit) onBlockExit(block);

      if (block.type === 'scene-heading') {
        if (isAtEnd || isBlank) {
          const newId = onAddBlock(block.id, 'action');
          setTimeout(() => onFocusNext(newId, 0), 50);
        }
        return;
      }
      if (block.type === 'action') {
        if (isBlank) { applyChanges('character'); }
        else { const newId = onAddBlock(block.id, 'action'); setTimeout(() => onFocusNext(newId, 0), 50); }
        return;
      }
      if (block.type === 'character') {
        if (isBlank) { applyChanges('action'); }
        else { const newId = onAddBlock(block.id, 'parenthetical', '()'); setTimeout(() => onFocusNext(newId, 1), 50); }
        return;
      }
      if (block.type === 'dialogue') {
        if (isBlank) {
          applyChanges('parenthetical', '()');
          setTimeout(() => {
            if (ref.current?.firstChild) {
              const r = document.createRange();
              r.setStart(ref.current.firstChild, 1);
              r.collapse(true);
              const s = window.getSelection();
              s?.removeAllRanges();
              s?.addRange(r);
            }
          }, 10);
        } else {
          const newId = onAddBlock(block.id, 'parenthetical', '()');
          setTimeout(() => onFocusNext(newId, 1), 50);
        }
        return;
      }

      if (block.type === 'parenthetical') {
        if (isBlank || currentText === '()') { applyChanges('dialogue', ''); }
        else { const newId = onAddBlock(block.id, 'dialogue'); setTimeout(() => onFocusNext(newId, 0), 50); }
        return;
      }

      // FadeIn-style Tab behavior for new formats
      if (block.type === 'transition') {
        const newId = onAddBlock(block.id, 'scene-heading');
        setTimeout(() => onFocusNext(newId, 0), 50);
        return;
      }

      if (block.type === 'shot') {
        const newId = onAddBlock(block.id, 'action');
        setTimeout(() => onFocusNext(newId, 0), 50);
        return;
      }

      if (block.type === 'unformatted') {
        const newId = onAddBlock(block.id, 'action');
        setTimeout(() => onFocusNext(newId, 0), 50);
        return;
      }
    } // <--- MOVED TO HERE TO ENCOMPASS ALL TAB LOGIC

    if (e.key === 'Enter') {
      // Allow native newline insertion for unformatted text
      if (block.type === 'unformatted') {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (onBlockExit) onBlockExit(block);
      let nextType = getEnterElementType(block.type);
      if (block.type === 'parenthetical' && !currentText.endsWith(')')) {
        const newText = currentText + ')';
        onUpdateText(block.id, newText);
        lastDomText.current = newText;
      }
      const newId = onAddBlock(block.id, nextType);
      setTimeout(() => onFocusNext(newId, 0), 50);
      return;
    }

    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      const prevType = getPrevTabElementType(block.type);
      if (prevType === 'parenthetical' && block.type !== 'parenthetical') {
        applyChanges('parenthetical', `(${getCleanText(currentText)})`);
        setTimeout(() => {
          if (ref.current?.firstChild) {
            const r = document.createRange();
            r.setStart(ref.current.firstChild, 1);
            r.collapse(true);
            const s = window.getSelection();
            s?.removeAllRanges();
            s?.addRange(r);
          }
        }, 10);
        return;
      }
      if (block.type === 'parenthetical' && prevType !== 'parenthetical') {
        applyChanges(prevType, getCleanText(currentText));
        return;
      }
      applyChanges(prevType);
      return;
    }

    if (e.key === 'Backspace') {
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const isEffectivelyEmpty = isBlank || (block.type === 'parenthetical' && currentText === '()');
        if (isEffectivelyEmpty) {
          e.preventDefault();
          e.stopPropagation();
          onDeleteBlock(block.id);
          return;
        }
        if (range.startOffset === 0 && range.collapsed) {
          e.preventDefault();
          e.stopPropagation();
          if (block.type === 'parenthetical') applyChanges('dialogue', getCleanText(currentText));
          else if (block.type === 'dialogue') applyChanges('character');
          else if (block.type === 'character') applyChanges('action');
          return;
        }
      }
    }
  }, [block.id, block.type, onAddBlock, onFocusNext, applyChanges, onUpdateText, onDeleteBlock, onBlockExit]);

  const handleFocus = useCallback(() => {
    onFocus(block.id, block.type);
  }, [block.id, block.type, onFocus]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData('text/html');

    isPasting.current = true;
    setTimeout(() => { isPasting.current = false; }, 0);

    if (html && html.includes('data-element-type') && onPasteBlock) {
      e.preventDefault();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const divs = doc.querySelectorAll('[data-element-type]');
      const blocksToInsert: { type: ElementType; text: string }[] = [];

      divs.forEach((div) => {
        const type = div.getAttribute('data-element-type') as ElementType;
        const text = div.textContent || '';
        blocksToInsert.push({ type, text });
      });

      if (blocksToInsert.length > 0) {
        onPasteBlock(blocksToInsert);
      }
    }
  }, [onPasteBlock]);

  return (
    <div
      ref={ref}
      className="sp-block"
      data-type={block.type}
      data-block-id={block.id}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onPaste={handlePaste}
    />
  );
};