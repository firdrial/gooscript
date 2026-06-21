// src/hooks/useScreenplayLayout.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { ElementType } from '../utils/screenplayLogic';

export type { ElementType } from '../utils/screenplayLogic';

export interface Block {
  id: string;
  type: ElementType;
  text: string;
}

export interface Page {
  id: string;
  blocks: Block[];
}

const PAGE_CONTENT_HEIGHT_PX = 864;
const generateId = () => Math.random().toString(36).substr(2, 9);

const measureBlockHeight = (block: Block, measurer: HTMLDivElement | null): number => {
  if (!measurer) return 20;
  const div = document.createElement('div');
  div.className = 'sp-block';
  div.setAttribute('data-type', block.type);
  if (block.text === '') {
    div.innerHTML = '<br>';
  } else {
    div.innerText = block.text;
  }
  measurer.innerHTML = '';
  measurer.appendChild(div);
  return div.offsetHeight;
};

export const useScreenplayLayout = (initialBlocks: Block[]) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [pages, setPages] = useState<Page[]>([]);
  const measurerRef = useRef<HTMLDivElement>(null);

  const calculateLayout = useCallback(() => {
    if (!measurerRef.current) return;
    const newPages: Page[] = [];
    let currentHeight = 0;
    let currentPageBlocks: Block[] = [];
    let pageIndex = 0;

    for (const block of blocks) {
      const blockHeight = measureBlockHeight(block, measurerRef.current);
      
      if (currentHeight + blockHeight <= PAGE_CONTENT_HEIGHT_PX || currentPageBlocks.length === 0) {
        currentPageBlocks.push(block);
        currentHeight += blockHeight;
      } else {
        // FIX: Stable page IDs prevent React from destroying the page container
        newPages.push({ id: `page-${pageIndex}`, blocks: currentPageBlocks });
        pageIndex++;
        currentPageBlocks = [block];
        currentHeight = blockHeight;
      }
    }

    if (currentPageBlocks.length > 0) {
      newPages.push({ id: `page-${pageIndex}`, blocks: currentPageBlocks });
    }

    if (newPages.length === 0) {
      newPages.push({ id: 'page-0', blocks: [{ id: generateId(), type: 'action', text: '' }] });
    }

    setPages(newPages);
  }, [blocks]);

  useEffect(() => {
    calculateLayout();
  }, [calculateLayout]);

  const updateBlockText = useCallback((blockId: string, newText: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, text: newText } : b));
  }, []);

  const updateBlockType = useCallback((blockId: string, newType: ElementType) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type: newType } : b));
  }, []);

  const addBlockAfter = useCallback((blockId: string, type: ElementType, initialText: string = ''): string => {
    const newId = generateId();
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === blockId);
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, { id: newId, type, text: initialText });
      return newBlocks;
    });
    return newId;
  }, []);

  const deleteBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(b => b.id !== blockId);
    });
  }, []);

  return {
    pages,
    measurerRef,
    updateBlockText,
    updateBlockType,
    addBlockAfter,
    deleteBlock,
  };
};