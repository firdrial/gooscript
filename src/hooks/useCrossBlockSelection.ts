import { useState, useEffect, useCallback, useRef } from 'react';

interface SelectionPoint {
  blockId: string;
  offset: number;
}

interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Block {
  id: string;
  type: string;
  text: string;
}

export const useCrossBlockSelection = (
  blockRefs: React.MutableRefObject<Record<string, HTMLElement | null>>,
  blocks: Block[],
  updateBlockText: (id: string, text: string) => void,
  deleteBlock: (id: string) => void,
  focusBlock: (id: string, offset: number | 'start' | 'end') => void
) => {
  const [startSelection, setStartSelection] = useState<SelectionPoint | null>(null);
  const [endSelection, setEndSelection] = useState<SelectionPoint | null>(null);
  const [selectionRects, setSelectionRects] = useState<SelectionRect[]>([]);
  const isSelecting = useRef(false);
  const isCrossBlockSelecting = useRef(false);

  const clearSelection = useCallback(() => {
    setStartSelection(null);
    setEndSelection(null);
    setSelectionRects([]);
    isSelecting.current = false;
    isCrossBlockSelecting.current = false;
  }, []);

  // Helper to get text offset from mouse coordinates
  const getCaretPositionFromPoint = useCallback((x: number, y: number, container: HTMLElement): SelectionPoint | null => {
    let range;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (typeof document.caretPositionFromPoint === 'function') {
      const position = (document as any).caretPositionFromPoint(x, y);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }

    if (range && container.contains(range.startContainer)) {
      let node = range.startContainer;
      while (node && node !== container) {
        if (node instanceof HTMLElement && node.dataset.blockId) {
          return { blockId: node.dataset.blockId, offset: range.startOffset };
        }
        node = node.parentNode as Node;
      }
    }
    return null;
  }, []);

  // Calculate the visual rectangles for the selection overlay
  const calculateRects = useCallback(() => {
    if (!startSelection || !endSelection) {
      setSelectionRects([]);
      return;
    }

    const startIndex = blocks.findIndex(b => b.id === startSelection.blockId);
    const endIndex = blocks.findIndex(b => b.id === endSelection.blockId);
    if (startIndex === -1 || endIndex === -1) return;

    const isForward = startIndex <= endIndex;
    const first = isForward ? startSelection : endSelection;
    const last = isForward ? endSelection : startSelection;
    const firstIdx = isForward ? startIndex : endIndex;
    const lastIdx = isForward ? endIndex : startIndex;
    
    const rects: SelectionRect[] = [];
    
    for (let i = firstIdx; i <= lastIdx; i++) {
      const block = blocks[i];
      const blockEl = blockRefs.current[block.id];
      if (!blockEl) continue;
      
      // Handle empty blocks
      if (blockEl.innerText.trim() === '' || blockEl.innerHTML === '<br>') {
        const r = blockEl.getBoundingClientRect();
        rects.push({ top: r.top, left: r.left, width: r.width, height: r.height });
        continue;
      }
      
      const range = document.createRange();
      
      if (i === firstIdx && i === lastIdx) {
        if (blockEl.firstChild && blockEl.firstChild.nodeType === Node.TEXT_NODE) {
          range.setStart(blockEl.firstChild, Math.min(first.offset, blockEl.firstChild.textContent?.length || 0));
          range.setEnd(blockEl.firstChild, Math.min(last.offset, blockEl.firstChild.textContent?.length || 0));
        }
      } else if (i === firstIdx) {
        if (blockEl.firstChild && blockEl.firstChild.nodeType === Node.TEXT_NODE) {
          range.setStart(blockEl.firstChild, Math.min(first.offset, blockEl.firstChild.textContent?.length || 0));
        } else { range.setStart(blockEl, 0); }
        range.setEndAfter(blockEl.lastChild || blockEl);
      } else if (i === lastIdx) {
        range.setStartBefore(blockEl.firstChild || blockEl);
        if (blockEl.firstChild && blockEl.firstChild.nodeType === Node.TEXT_NODE) {
          range.setEnd(blockEl.firstChild, Math.min(last.offset, blockEl.firstChild.textContent?.length || 0));
        } else { range.setEnd(blockEl, blockEl.childNodes.length); }
      } else {
        range.selectNodeContents(blockEl);
      }
      
      const clientRects = range.getClientRects();
      for (let j = 0; j < clientRects.length; j++) {
        const r = clientRects[j];
        rects.push({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    }
    setSelectionRects(rects);
  }, [startSelection, endSelection, blocks, blockRefs]);

  useEffect(() => { calculateRects(); }, [calculateRects]);

  // Recalculate on scroll/resize to keep overlay aligned
  useEffect(() => {
    const handle = () => calculateRects();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [calculateRects]);

  // Mouse Tracking
  const handleMouseDown = useCallback((e: MouseEvent) => {
    clearSelection();
    const target = e.target as HTMLElement;
    const blockEl = target.closest('[data-block-id]') as HTMLElement;
    if (!blockEl) return;

    const pos = getCaretPositionFromPoint(e.clientX, e.clientY, blockEl);
    if (!pos) return;

    setStartSelection({ blockId: pos.blockId, offset: pos.offset });
    setEndSelection({ blockId: pos.blockId, offset: pos.offset });
    isSelecting.current = true;
  }, [clearSelection, getCaretPositionFromPoint]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isSelecting.current || !startSelection) return;
    const startBlockEl = blockRefs.current[startSelection.blockId];
    if (!startBlockEl) return;

    const rect = startBlockEl.getBoundingClientRect();
    const isOutside = e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right;

    if (isOutside || isCrossBlockSelecting.current) {
      isCrossBlockSelecting.current = true;
      window.getSelection()?.removeAllRanges(); // Disable native selection
      
      const editorContainer = startBlockEl.closest('[data-editor-container]') as HTMLElement;
      if (!editorContainer) return;

      const pos = getCaretPositionFromPoint(e.clientX, e.clientY, editorContainer);
      if (pos) setEndSelection(pos);
    }
  }, [startSelection, blockRefs, getCaretPositionFromPoint]);

  const handleMouseUp = useCallback(() => {
    isSelecting.current = false;
    isCrossBlockSelecting.current = false;
  }, []);

  useEffect(() => {
    const editorContainer = document.querySelector('[data-editor-container]') as HTMLElement;
    if (!editorContainer) return;

    editorContainer.addEventListener('mousedown', handleMouseDown);
    editorContainer.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      editorContainer.removeEventListener('mousedown', handleMouseDown);
      editorContainer.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  // Clear selection if clicking outside the editor (but ignore buttons/menus)
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const editorContainer = document.querySelector('[data-editor-container]');
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A') return;

      if (editorContainer && !editorContainer.contains(target)) {
        clearSelection();
      }
    };
    document.addEventListener('mousedown', handleGlobalMouseDown);
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown);
  }, [clearSelection]);

  // Clipboard Interception (Copy/Cut/Paste)
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (selectionRects.length > 0 && startSelection && endSelection) {
        e.preventDefault();
        const { html, text } = getSelectedContent(startSelection, endSelection, blocks, blockRefs);
        e.clipboardData?.setData('text/html', html);
        e.clipboardData?.setData('text/plain', text);
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (selectionRects.length > 0 && startSelection && endSelection) {
        e.preventDefault();
        const { html, text } = getSelectedContent(startSelection, endSelection, blocks, blockRefs);
        e.clipboardData?.setData('text/html', html);
        e.clipboardData?.setData('text/plain', text);
        deleteSelectionAndMerge(startSelection, endSelection, blocks, updateBlockText, deleteBlock);
        clearSelection();
      }
    };

    const handlePaste = () => {
      if (selectionRects.length > 0 && startSelection && endSelection) {
        // Delete selection first, then let the native paste event continue 
        // so your existing ScreenplayBlock handlePaste logic takes over.
        deleteSelectionAndMerge(startSelection, endSelection, blocks, updateBlockText, deleteBlock);
        const startIndex = blocks.findIndex(b => b.id === startSelection.blockId);
        const endIndex = blocks.findIndex(b => b.id === endSelection.blockId);
        const isForward = startIndex <= endIndex;
        const first = isForward ? startSelection : endSelection;
        
        focusBlock(first.blockId, first.offset);
        clearSelection();
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
    };
  }, [selectionRects, startSelection, endSelection, blocks, blockRefs, updateBlockText, deleteBlock, focusBlock, clearSelection]);

  // Keyboard Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectionRects.length > 0 && startSelection && endSelection) {
        // Don't clear selection if user is trying to copy/paste
        const isCopyPaste = (e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a'].includes(e.key.toLowerCase());
        if (isCopyPaste) return; 

        const startIndex = blocks.findIndex(b => b.id === startSelection.blockId);
        const endIndex = blocks.findIndex(b => b.id === endSelection.blockId);
        const isForward = startIndex <= endIndex;
        const first = isForward ? startSelection : endSelection;
        const last = isForward ? endSelection : startSelection;

        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          deleteSelectionAndMerge(startSelection, endSelection, blocks, updateBlockText, deleteBlock);
          clearSelection();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          focusBlock(first.blockId, first.offset);
          clearSelection();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          focusBlock(last.blockId, last.offset);
          clearSelection();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          deleteSelectionAndMerge(startSelection, endSelection, blocks, updateBlockText, deleteBlock);
          clearSelection();
        } else {
          clearSelection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionRects, startSelection, endSelection, blocks, updateBlockText, deleteBlock, focusBlock, clearSelection]);

  return { selectionRects, clearSelection };
};

// --- Helper Functions ---

function getSelectedContent(startSel: SelectionPoint, endSel: SelectionPoint, blocks: Block[], blockRefs: React.MutableRefObject<Record<string, HTMLElement | null>>) {
  const startIndex = blocks.findIndex(b => b.id === startSel.blockId);
  const endIndex = blocks.findIndex(b => b.id === endSel.blockId);
  const isForward = startIndex <= endIndex;
  const first = isForward ? startSel : endSel;
  const last = isForward ? endSel : startSel;
  const firstIdx = isForward ? startIndex : endIndex;
  const lastIdx = isForward ? endIndex : startIndex;
  
  let html = ''; let text = '';
  for (let i = firstIdx; i <= lastIdx; i++) {
    const block = blocks[i];
    const blockEl = blockRefs.current[block.id];
    if (!blockEl) continue;
    const blockText = blockEl.innerText || '';
    let selectedText = blockText;
    if (i === firstIdx && i === lastIdx) selectedText = blockText.substring(first.offset, last.offset);
    else if (i === firstIdx) selectedText = blockText.substring(first.offset);
    else if (i === lastIdx) selectedText = blockText.substring(0, last.offset);
    
    const escapedText = selectedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html += `<div data-element-type="${block.type}">${escapedText}</div>`;
    text += selectedText + '\n';
  }
  return { html, text: text.trim() };
}

function deleteSelectionAndMerge(startSel: SelectionPoint, endSel: SelectionPoint, blocks: Block[], updateBlockText: (id: string, text: string) => void, deleteBlock: (id: string) => void) {
  const startIndex = blocks.findIndex(b => b.id === startSel.blockId);
  const endIndex = blocks.findIndex(b => b.id === endSel.blockId);
  const isForward = startIndex <= endIndex;
  const first = isForward ? startSel : endSel;
  const last = isForward ? endSel : startSel;
  const firstIdx = isForward ? startIndex : endIndex;
  const lastIdx = isForward ? endIndex : startIndex;
  
  if (firstIdx === lastIdx) {
    const block = blocks[firstIdx];
    updateBlockText(block.id, block.text.substring(0, first.offset) + block.text.substring(last.offset));
    return;
  }
  
  const firstBlock = blocks[firstIdx];
  const lastBlock = blocks[lastIdx];
  updateBlockText(firstBlock.id, firstBlock.text.substring(0, first.offset) + lastBlock.text.substring(last.offset));
  for (let i = firstIdx + 1; i <= lastIdx; i++) deleteBlock(blocks[i].id);
}