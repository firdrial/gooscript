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
  const isDragging = useRef(false);
  const dragStarted = useRef(false);

  const clearSelection = useCallback(() => {
    setStartSelection(null);
    setEndSelection(null);
    setSelectionRects([]);
    isDragging.current = false;
    dragStarted.current = false;
  }, []);

  // Get block ID and text offset from mouse coordinates
  const getCaretPositionFromPoint = useCallback((x: number, y: number): SelectionPoint | null => {
    const element = document.elementFromPoint(x, y) as HTMLElement;
    if (!element) return null;

    // Find the closest block element
    const blockEl = element.closest('[data-block-id]') as HTMLElement;
    if (!blockEl) return null;

    const blockId = blockEl.dataset.blockId;
    if (!blockId) return null;

    // Get caret position using browser APIs
    let offset = 0;
    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      if (range && blockEl.contains(range.startContainer)) {
        offset = range.startOffset;
      }
    } else if (typeof (document as any).caretPositionFromPoint === 'function') {
      const position = (document as any).caretPositionFromPoint(x, y);
      if (position && blockEl.contains(position.offsetNode)) {
        offset = position.offset;
      }
    }

    return { blockId, offset };
  }, []);

  // Calculate visual rectangles for the selection overlay
  const calculateRects = useCallback(() => {
    if (!startSelection || !endSelection) {
      setSelectionRects([]);
      return;
    }

    const startIndex = blocks.findIndex(b => b.id === startSelection.blockId);
    const endIndex = blocks.findIndex(b => b.id === endSelection.blockId);
    if (startIndex === -1 || endIndex === -1) {
      setSelectionRects([]);
      return;
    }

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
      if (!blockEl.innerText || blockEl.innerText.trim() === '') {
        const r = blockEl.getBoundingClientRect();
        rects.push({ top: r.top, left: r.left, width: r.width, height: r.height });
        continue;
      }

      const range = document.createRange();

      if (i === firstIdx && i === lastIdx) {
        // Same block selection
        if (blockEl.firstChild && blockEl.firstChild.nodeType === Node.TEXT_NODE) {
          const textNode = blockEl.firstChild as Text;
          const startOffset = Math.min(first.offset, textNode.length);
          const endOffset = Math.min(last.offset, textNode.length);
          range.setStart(textNode, startOffset);
          range.setEnd(textNode, endOffset);
        }
      } else if (i === firstIdx) {
        // First block in multi-block selection
        if (blockEl.firstChild && blockEl.firstChild.nodeType === Node.TEXT_NODE) {
          const textNode = blockEl.firstChild as Text;
          const startOffset = Math.min(first.offset, textNode.length);
          range.setStart(textNode, startOffset);
        } else {
          range.setStart(blockEl, 0);
        }
        range.setEndAfter(blockEl.lastChild || blockEl);
      } else if (i === lastIdx) {
        // Last block in multi-block selection
        range.setStartBefore(blockEl.firstChild || blockEl);
        if (blockEl.firstChild && blockEl.firstChild.nodeType === Node.TEXT_NODE) {
          const textNode = blockEl.firstChild as Text;
          const endOffset = Math.min(last.offset, textNode.length);
          range.setEnd(textNode, endOffset);
        } else {
          range.setEnd(blockEl, blockEl.childNodes.length);
        }
      } else {
        // Middle blocks - select entire content
        range.selectNodeContents(blockEl);
      }

      const clientRects = range.getClientRects();
      for (let j = 0; j < clientRects.length; j++) {
        const r = clientRects[j];
        if (r.width > 0 && r.height > 0) {
          rects.push({ top: r.top, left: r.left, width: r.width, height: r.height });
        }
      }
    }
    setSelectionRects(rects);
  }, [startSelection, endSelection, blocks, blockRefs]);

  useEffect(() => {
    calculateRects();
  }, [calculateRects]);

  // Recalculate on scroll/resize
  useEffect(() => {
    const handle = () => calculateRects();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [calculateRects]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Ignore clicks on buttons, menus, etc.
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A') {
      return;
    }

    // Don't clear selection on right-click
    if (e.button === 2) {
      return;
    }

    // Check if clicking inside a block
    const blockEl = (e.target as HTMLElement).closest('[data-block-id]') as HTMLElement;
    if (!blockEl) {
      // Clicking outside any block - clear selection
      clearSelection();
      return;
    }

    // Get the starting position
    const pos = getCaretPositionFromPoint(e.clientX, e.clientY);
    if (!pos) return;

    // Only start a new selection if we're not already in one
    // and we're clicking at a different position
    if (!isDragging.current) {
      isDragging.current = true;
      dragStarted.current = false;
      setStartSelection(pos);
      setEndSelection(pos);
      
      // Clear any existing native selection
      window.getSelection()?.removeAllRanges();
    }
  }, [clearSelection, getCaretPositionFromPoint]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !startSelection) return;

    // Disable native selection immediately when dragging
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selection.removeAllRanges();
    }

    // Get current position
    const pos = getCaretPositionFromPoint(e.clientX, e.clientY);
    if (pos) {
      dragStarted.current = true;
      setEndSelection(pos);
    }
  }, [startSelection, getCaretPositionFromPoint]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    // Don't clear dragStarted here - we need it to know if a selection was made
  }, []);

  // Attach listeners to document for reliability
  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  // Handle context menu (right-click) - don't clear selection
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // If we have an active selection and right-clicking within editor, keep it
      if (selectionRects.length > 0) {
        const editorContainer = document.querySelector('[data-editor-container]');
        if (editorContainer && editorContainer.contains(e.target as Node)) {
          // Allow context menu but don't clear selection
          return;
        }
      }
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [selectionRects.length]);
  
  // Clear selection when clicking outside editor (but ignore right-clicks and buttons)
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const editorContainer = document.querySelector('[data-editor-container]');
      const target = e.target as HTMLElement;
      
      // Don't clear on right-click (context menu)
      if (e.button === 2) {
        return;
      }
      
      // Ignore buttons and menus
      if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A') {
        return;
      }

      // If clicking outside editor, clear selection
      if (editorContainer && !editorContainer.contains(target)) {
        clearSelection();
      }
    };
    
    // Prevent context menu from clearing selection
    const handleContextMenu = (e: MouseEvent) => {
      const editorContainer = document.querySelector('[data-editor-container]');
      if (editorContainer && editorContainer.contains(e.target as Node)) {
        // Don't prevent default, just don't clear selection
        return;
      }
    };
    
    document.addEventListener('mousedown', handleGlobalMouseDown);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('mousedown', handleGlobalMouseDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [clearSelection]);

  // Clipboard handling
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

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectionRects.length > 0 && startSelection && endSelection) {
        // Check for copy/cut/paste shortcuts - don't clear selection for these
        if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a'].includes(e.key.toLowerCase())) {
          // Let the default copy/cut/paste handlers deal with this
          return;
        }

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
          // Typing a character - delete selection and insert character
          deleteSelectionAndMerge(startSelection, endSelection, blocks, updateBlockText, deleteBlock);
          clearSelection();
        } else {
          // Any other key clears selection
          clearSelection();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionRects, startSelection, endSelection, blocks, updateBlockText, deleteBlock, focusBlock, clearSelection]);

  return { selectionRects, clearSelection };
};

// Helper function to get selected content
function getSelectedContent(
  startSel: SelectionPoint,
  endSel: SelectionPoint,
  blocks: Block[],
  blockRefs: React.MutableRefObject<Record<string, HTMLElement | null>>
) {
  const startIndex = blocks.findIndex(b => b.id === startSel.blockId);
  const endIndex = blocks.findIndex(b => b.id === endSel.blockId);
  const isForward = startIndex <= endIndex;
  const first = isForward ? startSel : endSel;
  const last = isForward ? endSel : startSel;
  const firstIdx = isForward ? startIndex : endIndex;
  const lastIdx = isForward ? endIndex : startIndex;

  let html = '';
  let text = '';

  for (let i = firstIdx; i <= lastIdx; i++) {
    const block = blocks[i];
    const blockEl = blockRefs.current[block.id];
    if (!blockEl) continue;

    const blockText = blockEl.innerText || '';
    let selectedText = blockText;

    if (i === firstIdx && i === lastIdx) {
      selectedText = blockText.substring(first.offset, last.offset);
    } else if (i === firstIdx) {
      selectedText = blockText.substring(first.offset);
    } else if (i === lastIdx) {
      selectedText = blockText.substring(0, last.offset);
    }

    const escapedText = selectedText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    html += `<div data-element-type="${block.type}">${escapedText}</div>`;
    text += selectedText + '\n';
  }

  return { html, text: text.trim() };
}

// Helper function to delete selection and merge blocks
function deleteSelectionAndMerge(
  startSel: SelectionPoint,
  endSel: SelectionPoint,
  blocks: Block[],
  updateBlockText: (id: string, text: string) => void,
  deleteBlock: (id: string) => void
) {
  const startIndex = blocks.findIndex(b => b.id === startSel.blockId);
  const endIndex = blocks.findIndex(b => b.id === endSel.blockId);
  const isForward = startIndex <= endIndex;
  const first = isForward ? startSel : endSel;
  const last = isForward ? endSel : startSel;
  const firstIdx = isForward ? startIndex : endIndex;
  const lastIdx = isForward ? endIndex : startIndex;

  if (firstIdx === lastIdx) {
    const block = blocks[firstIdx];
    const newText = block.text.substring(0, first.offset) + block.text.substring(last.offset);
    updateBlockText(block.id, newText);
    return;
  }

  const firstBlock = blocks[firstIdx];
  const lastBlock = blocks[lastIdx];
  const mergedText = firstBlock.text.substring(0, first.offset) + lastBlock.text.substring(last.offset);
  updateBlockText(firstBlock.id, mergedText);

  for (let i = firstIdx + 1; i <= lastIdx; i++) {
    deleteBlock(blocks[i].id);
  }
}