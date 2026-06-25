import { Document, Page, Text, StyleSheet, pdf } from '@react-pdf/renderer';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { open as openPath } from '@tauri-apps/plugin-shell';

interface ScreenplayBlock {
  type: string;
  text: string;
}

interface ScreenplayPDFProps {
  title: string;
  blocks: ScreenplayBlock[];
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 1.5,
    padding: 60,
    color: '#000',
  },
  sceneHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  action: {
    fontSize: 12,
    marginBottom: 18,
    textAlign: 'left',
  },
  character: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 0,
    textTransform: 'uppercase',
  },
  parenthetical: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 0,
  },
  dialogue: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 18,
    width: '80%',
    marginLeft: '10%',
  },
  transition: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 18,
    textTransform: 'uppercase',
  },
});

const ScreenplayPDF = ({ title, blocks }: ScreenplayPDFProps) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'scene-heading':
            return (
              <Text key={index} style={styles.sceneHeading}>
                {block.text}
              </Text>
            );
          case 'action':
            return (
              <Text key={index} style={styles.action}>
                {block.text}
              </Text>
            );
          case 'character':
            return (
              <Text key={index} style={styles.character}>
                {block.text}
              </Text>
            );
          case 'parenthetical':
            return (
              <Text key={index} style={styles.parenthetical}>
                {block.text}
              </Text>
            );
          case 'dialogue':
            return (
              <Text key={index} style={styles.dialogue}>
                {block.text}
              </Text>
            );
          case 'transition':
            return (
              <Text key={index} style={styles.transition}>
                {block.text}
              </Text>
            );
          default:
            return (
              <Text key={index} style={styles.action}>
                {block.text}
              </Text>
            );
        }
      })}
    </Page>
  </Document>
);

const generatePDFBytes = async (title: string, htmlContent: string): Promise<Uint8Array> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const divs = doc.body.querySelectorAll('div[data-type]');
  
  const blocks: ScreenplayBlock[] = Array.from(divs).map(div => ({
    type: div.getAttribute('data-type') || 'action',
    text: div.textContent || '',
  }));

  const pdfDocument = <ScreenplayPDF title={title} blocks={blocks} />;
  const blob = await pdf(pdfDocument).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

export const openPDFPreview = async (title: string, htmlContent: string): Promise<void> => {
  try {
    console.log('Generating PDF bytes...');
    const pdfBytes = await generatePDFBytes(title, htmlContent);
    console.log('PDF bytes generated, size:', pdfBytes.length);
    
    // Get the full path to temp directory
    console.log('Getting temp directory...');
    const { tempDir } = await import('@tauri-apps/api/path');
    const tempPath = await tempDir();
    console.log('Temp dir:', tempPath);
    
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_preview.pdf`;
    const filePath = `${tempPath}${fileName}`;
    console.log('File path:', filePath);
    
    console.log('Writing file...');
    await writeFile(filePath, pdfBytes);
    console.log('File written successfully');
    
    // Open with system's default PDF viewer
    console.log('Opening file with system viewer...');
    await openPath(filePath);
    console.log('File opened successfully');
  } catch (error) {
    console.error('PDF Preview Error:', error);
    console.error('Error type:', typeof error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Handle different error types
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    alert('Failed to open PDF preview: ' + errorMessage);
  }
};

export const printPDF = async (title: string, htmlContent: string): Promise<void> => {
  try {
    const pdfBytes = await generatePDFBytes(title, htmlContent);
    
    // Ask user where to save the PDF
    const filePath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: `${title}.pdf`,
    });
    
    if (filePath) {
      await writeFile(filePath, pdfBytes);
      
      // Open the PDF (user can print from their PDF viewer)
      await openPath(filePath);
    }
  } catch (error) {
    console.error('Print Error:', error);
    alert('Failed to print: ' + (error as Error).message);
  }
};