import { Document, Page, Text, StyleSheet, Font } from '@react-pdf/renderer';

// 1. Import the local font files (Vite will automatically resolve these to valid URLs)
import CourierPrimeRegular from '../assets/fonts/CourierPrime-Regular.ttf';
import CourierPrimeBold from '../assets/fonts/CourierPrime-Bold.ttf';
import CourierPrimeItalic from '../assets/fonts/CourierPrime-Italic.ttf';
import CourierPrimeBoldItalic from '../assets/fonts/CourierPrime-BoldItalic.ttf';

Font.register({
  family: 'Courier Prime',
  fonts: [
    { src: CourierPrimeRegular, fontWeight: 'normal', fontStyle: 'normal' },
    { src: CourierPrimeBold, fontWeight: 'bold', fontStyle: 'normal' },
    { src: CourierPrimeItalic, fontWeight: 'normal', fontStyle: 'italic' },
    { src: CourierPrimeBoldItalic, fontWeight: 'bold', fontStyle: 'italic' },
  ]
} as any);

export interface ScreenplayBlock {
  type: string;
  text: string;
}

export interface ScreenplayPDFProps {
  title: string;
  blocks: ScreenplayBlock[];
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Courier Prime', 
    fontSize: 12,
    paddingTop: 72,
    paddingRight: 72,
    paddingBottom: 72,
    paddingLeft: 72,
    color: '#000',
  },
  sceneHeading: {
    fontSize: 12,
    fontWeight: 'bold', // This will now correctly use the bundled Bold font
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
    textAlign: 'left',
    marginBottom: 18,
    width: '60%',
    marginLeft: '10%',
  },
  transition: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 18,
    textTransform: 'uppercase',
  },
});

export const ScreenplayPDF = ({ blocks }: ScreenplayPDFProps) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'scene-heading':
            return <Text key={index} style={styles.sceneHeading}>{block.text}</Text>;
          case 'action':
            return <Text key={index} style={styles.action}>{block.text}</Text>;
          case 'character':
            return <Text key={index} style={styles.character}>{block.text}</Text>;
          case 'parenthetical':
            return <Text key={index} style={styles.parenthetical}>{block.text}</Text>;
          case 'dialogue':
            return <Text key={index} style={styles.dialogue}>{block.text}</Text>;
          case 'transition':
            return <Text key={index} style={styles.transition}>{block.text}</Text>;
          default:
            return <Text key={index} style={styles.action}>{block.text}</Text>;
        }
      })}
    </Page>
  </Document>
);

export const parseHtmlToBlocks = (htmlContent: string): ScreenplayBlock[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const elements = doc.body.querySelectorAll('[data-type]');
  
  return Array.from(elements).map(el => ({
    type: el.getAttribute('data-type') || 'action',
    text: el.textContent?.trim() || '',
  })).filter(block => block.text.length > 0); 
};