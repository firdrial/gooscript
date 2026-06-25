import React, { useRef, useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { ScreenplayPDF, parseHtmlToBlocks } from '../utils/pdfGenerator';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  htmlContent: string;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, title, htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate PDF in memory whenever the modal opens or content changes
  useEffect(() => {
    if (!isOpen || !htmlContent) return;

    const generatePdf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const blocks = parseHtmlToBlocks(htmlContent);
        // Fix: Pass the ScreenplayPDF component to pdf()
        const blob = await pdf(<ScreenplayPDF title={title} blocks={blocks} />).toBlob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error(err);
        setError('Failed to generate preview.');
      } finally {
        setIsLoading(false);
      }
    };

    generatePdf();

    // Cleanup the blob URL from memory when the modal closes
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    };
  }, [isOpen, htmlContent, title]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-[9999] flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-800 p-3 flex justify-between items-center shrink-0 border-b border-gray-700 shadow-lg">
        <h2 className="text-white text-lg font-semibold">Print Preview: {title}</h2>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            disabled={isLoading || !!error}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* PDF Preview Area */}
      <div className="flex-1 overflow-auto bg-gray-900 p-8 flex justify-center">
        <div className="bg-white shadow-2xl" style={{ width: '8.5in', minHeight: '11in' }}>
          {isLoading && (
            <div className="flex items-center justify-center h-full text-white bg-gray-800">
              Generating Preview...
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-red-500 bg-gray-800">
              {error}
            </div>
          )}
          {!isLoading && !error && pdfUrl && (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title="Print Preview"
              className="w-full h-full border-0"
              style={{ height: '11in' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;