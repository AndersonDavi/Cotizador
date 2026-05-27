export type TemplateId = 'oscura' | 'clara' | 'minimalista';

export type Template = {
  id: TemplateId;
  label: string;
  headerBg: string;    // color inicio del degradado del header
  headerBg2: string;   // color fin del degradado del header
  pageBg: string;      // fondo del resto de la página
  accent: string;
  text: string;
  textMuted: string;
  cardBg: string;
  cardText: string;
  cardMuted: string;
  cardBorder: string;
  iconColor: string;
  footerBg: string;
  footerText: string;
};

export const TEMPLATES: Record<TemplateId, Template> = {
  oscura: {
    id: 'oscura',
    label: 'Oscura (Chiguiro)',
    headerBg: '#6B6300',
    headerBg2: '#171907',
    pageBg: '#FFFFFF',
    accent: '#F2DA23',
    text: '#FFFFFF',
    textMuted: '#D6D2B3',
    cardBg: '#FFFFFF',
    cardText: '#1A1A1A',
    cardMuted: '#6B6B6B',
    cardBorder: '#E5E5E0',
    iconColor: '#1E2113',
    footerBg: '#FFFFFF',
    footerText: '#1A1A1A',
  },
  clara: {
    id: 'clara',
    label: 'Clara',
    headerBg: '#F5F3EC',
    headerBg2: '#FFFFFF',
    pageBg: '#FFFFFF',
    accent: '#3D3A1F',
    text: '#1A1A1A',
    textMuted: '#5C5C55',
    cardBg: '#FFFFFF',
    cardText: '#1A1A1A',
    cardMuted: '#6B6B6B',
    cardBorder: '#D9D6CC',
    iconColor: '#3D3A1F',
    footerBg: '#FFFFFF',
    footerText: '#1A1A1A',
  },
  minimalista: {
    id: 'minimalista',
    label: 'Minimalista',
    headerBg: '#F8F8F8',
    headerBg2: '#FFFFFF',
    pageBg: '#FFFFFF',
    accent: '#000000',
    text: '#000000',
    textMuted: '#666666',
    cardBg: '#FFFFFF',
    cardText: '#000000',
    cardMuted: '#666666',
    cardBorder: '#CCCCCC',
    iconColor: '#000000',
    footerBg: '#FFFFFF',
    footerText: '#000000',
  },
};

export const TEMPLATE_IDS: TemplateId[] = ['oscura', 'clara', 'minimalista'];
