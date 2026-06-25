declare module '@react-pdf/renderer' {
  import { ReactNode } from 'react';
  
  export interface Style {
    [key: string]: any;
  }
  
  export interface StyleSheet {
    create: (styles: { [key: string]: Style }) => { [key: string]: Style };
  }
  
  export const StyleSheet: StyleSheet;
  
  export interface Font {
    register: (options: { family: string; src: string }) => void;
  }
  
  export const Font: Font;
  
  export interface DocumentProps {
    children: ReactNode;
  }
  
  export const Document: React.FC<DocumentProps>;
  
  export interface PageProps {
    size?: string;
    style?: Style;
    children: ReactNode;
  }
  
  export const Page: React.FC<PageProps>;
  
  export interface TextProps {
    style?: Style;
    children: ReactNode;
  }
  
  export const Text: React.FC<TextProps>;
  
  export interface ViewProps {
    style?: Style;
    children: ReactNode;
  }
  
  export const View: React.FC<ViewProps>;
  
  export interface PDF {
    toBlob: () => Promise<Blob>;
  }
  
  export function pdf(element: ReactNode): PDF;
}