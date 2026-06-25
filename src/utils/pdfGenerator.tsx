import { Document, Page, Text, StyleSheet } from '@react-pdf/renderer';

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

export const ScreenplayPDF = ({ title, blocks }: ScreenplayPDFProps) => (
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
  const divs = doc.body.querySelectorAll('div[data-type]');
  return Array.from(divs).map(div => ({
    type: div.getAttribute('data-type') || 'action',
    text: div.textContent || '',
  }));
};