// VitrineFlex Theme & Visual System (DESIGN_GUIDE.md v1.0)

export type StoreTheme = 'fashion' | 'tech' | 'books' | 'admin' | 'neutral';

export interface ThemeConfig {
  id: StoreTheme;
  name: string;
  tagline: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentHover: string;
  accentSoft?: string;
  accentSecondary?: string;
  btnRadius: string;
  cardRadius: string;
}

export const THEME_CONFIGS: Record<StoreTheme, ThemeConfig> = {
  fashion: {
    id: 'fashion',
    name: 'Vitrine Moda',
    tagline: 'Coleção Contemporânea & Alfaiataria Moderna',
    bg: '#F6F4F0',
    surface: '#FFFFFF',
    text: '#191918',
    textMuted: '#69655F',
    border: '#DED9D1',
    accent: '#222220',
    accentHover: '#3A3936',
    accentSoft: '#ECE8E1',
    btnRadius: '4px',
    cardRadius: '4px',
  },
  tech: {
    id: 'tech',
    name: 'Vitrine Tech',
    tagline: 'Dispositivos de Alta Performance & Precisão',
    bg: '#F5F6F7',
    surface: '#FFFFFF',
    text: '#15181B',
    textMuted: '#626B75',
    border: '#DDE1E5',
    accent: '#155EEF',
    accentHover: '#124CC4',
    accentSoft: '#EAF1FF',
    btnRadius: '6px',
    cardRadius: '8px',
  },
  books: {
    id: 'books',
    name: 'Vitrine Books',
    tagline: 'Curadoria Editorial de Obras que Inspiram',
    bg: '#F5F0E6',
    surface: '#FBF8F1',
    text: '#211C18',
    textMuted: '#685A4F',
    border: '#DED2C1',
    accent: '#284B3B',
    accentHover: '#1F3C2F',
    accentSoft: '#EEE5D8',
    accentSecondary: '#743A3F',
    btnRadius: '6px',
    cardRadius: '6px',
  },
  admin: {
    id: 'admin',
    name: 'Painel Administrativo VitrineFlex',
    tagline: 'Plataforma de Linha de Produto de Software',
    bg: '#F4F6F9',
    surface: '#FFFFFF',
    text: '#182230',
    textMuted: '#667085',
    border: '#E2E7EF',
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    accentSoft: '#EFF6FF',
    btnRadius: '8px',
    cardRadius: '10px',
  },
  neutral: {
    id: 'neutral',
    name: 'VitrineFlex',
    tagline: 'Plataforma Multiloja Especializada',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    textMuted: '#64748B',
    border: '#E2E8F0',
    accent: '#0F172A',
    accentHover: '#1E293B',
    accentSoft: '#F1F5F9',
    btnRadius: '8px',
    cardRadius: '8px',
  },
};

export const resolveStoreTheme = (identifier?: string): StoreTheme => {
  if (!identifier) return 'neutral';
  const val = identifier.toLowerCase();
  if (val.includes('admin')) return 'admin';
  if (val.includes('fashion') || val.includes('moda')) return 'fashion';
  if (val.includes('tech') || val.includes('eletronico')) return 'tech';
  if (val.includes('book') || val.includes('livro')) return 'books';
  return 'neutral';
};

export const applyStoreTheme = (theme: StoreTheme): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-store-theme', theme);
};
