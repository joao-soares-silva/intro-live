export type NeonThemeId =
  | 'toxicLime'
  | 'cyberpunkDuo'
  | 'cyanElectric'
  | 'magentaPink'
  | 'electricPurple'
  | 'solarGold'
  | 'bloodCrimson';

export type BackgroundStyle = 'smoke' | 'matrix' | 'stars' | 'grid' | 'clean';

export interface NeonTheme {
  id: NeonThemeId;
  name: string;
  tagline: string;
  primary: string; // Hex for canvas & text
  secondary: string; // Complementary neon
  accent: string; // Core highlight (usually white/bright)
  glowColor: string; // rgba or hex
  glowRadius: number;
  bgDark: string;
  smokeColor: string;
}

export const NEON_THEMES: Record<NeonThemeId, NeonTheme> = {
  toxicLime: {
    id: 'toxicLime',
    name: 'Ávila Fumaça (Verde Neon)',
    tagline: 'Verde limão tóxico e fumaça densa do estilo original',
    primary: '#22c55e',
    secondary: '#84cc16',
    accent: '#bbf7d0',
    glowColor: 'rgba(34, 197, 94, 0.75)',
    glowRadius: 28,
    bgDark: '#040d06',
    smokeColor: 'rgba(16, 185, 129, 0.16)',
  },
  cyberpunkDuo: {
    id: 'cyberpunkDuo',
    name: 'Cyberpunk Neon (Ciano + Magenta)',
    tagline: 'O clássico contraste neon ciano e rosa choque',
    primary: '#00f0ff',
    secondary: '#ff007f',
    accent: '#e0f2fe',
    glowColor: 'rgba(0, 240, 255, 0.8)',
    glowRadius: 32,
    bgDark: '#030712',
    smokeColor: 'rgba(0, 240, 255, 0.12)',
  },
  cyanElectric: {
    id: 'cyanElectric',
    name: 'Ciano Hiper-Vibrante',
    tagline: 'Azul elétrico e lasers futuristas',
    primary: '#06b6d4',
    secondary: '#38bdf8',
    accent: '#cffafe',
    glowColor: 'rgba(6, 182, 212, 0.8)',
    glowRadius: 30,
    bgDark: '#020b14',
    smokeColor: 'rgba(6, 182, 212, 0.14)',
  },
  magentaPink: {
    id: 'magentaPink',
    name: 'Magenta Laser',
    tagline: 'Rosa neon pulsante de alta energia',
    primary: '#ec4899',
    secondary: '#f43f5e',
    accent: '#fce7f3',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    glowRadius: 30,
    bgDark: '#12020a',
    smokeColor: 'rgba(236, 72, 153, 0.14)',
  },
  electricPurple: {
    id: 'electricPurple',
    name: 'Roxo Ultravioleta',
    tagline: 'Vaporwave e misticismo cibernético',
    primary: '#a855f7',
    secondary: '#6366f1',
    accent: '#f3e8ff',
    glowColor: 'rgba(168, 85, 247, 0.85)',
    glowRadius: 32,
    bgDark: '#0a0314',
    smokeColor: 'rgba(168, 85, 247, 0.15)',
  },
  solarGold: {
    id: 'solarGold',
    name: 'Ouro Cyber & Âmbar',
    tagline: 'Laranja e dourado energéticos de alta intensidade',
    primary: '#f59e0b',
    secondary: '#eab308',
    accent: '#fef3c7',
    glowColor: 'rgba(245, 158, 11, 0.8)',
    glowRadius: 28,
    bgDark: '#120b02',
    smokeColor: 'rgba(245, 158, 11, 0.14)',
  },
  bloodCrimson: {
    id: 'bloodCrimson',
    name: 'Carmim Carmesim',
    tagline: 'Laser vermelho gamer hardcore',
    primary: '#ef4444',
    secondary: '#dc2626',
    accent: '#fee2e2',
    glowColor: 'rgba(239, 68, 68, 0.85)',
    glowRadius: 30,
    bgDark: '#120202',
    smokeColor: 'rgba(239, 68, 68, 0.14)',
  },
};

export interface SocialPlatformItem {
  id: string;
  platform: 'twitch' | 'youtube' | 'kick' | 'instagram' | 'tiktok' | 'discord' | 'custom';
  label: string;
  handle: string;
  enabled: boolean;
}

export interface StreamOverlaySettings {
  channelName: string;
  streamTitle: string;
  tagline: string;
  themeId: NeonThemeId;
  // Background Customization
  customBgColor?: string; // If set, overrides default theme bgDark
  bgStyle: BackgroundStyle; // 'smoke' | 'matrix' | 'stars' | 'grid' | 'clean'
  customBgImage?: string; // base64 or blob URL of custom uploaded wallpaper
  bgImageOpacity: number; // 0 to 1
  smokeIntensity: number; // 0 to 1
  particleCount: number;
  showScanlines: boolean;
  showGrid: boolean;
  showVisualizer: boolean;
  showCountdown: boolean;
  showBoxContainer: boolean; // Toggle for the border box around channel name
  showGitDiamond: boolean; // Toggle for the outer square/diamond of Git logo
  showGitLogo: boolean; // Toggle for the central Git logo / nodes (default false as user requested)
  countdownMinutes: number;
  countdownSeconds: number;
  cameraIntroDuration: number; // seconds for zoom reveal
  autoLoopIntro: boolean;
  socialsList: SocialPlatformItem[];
}

export const DEFAULT_SETTINGS: StreamOverlaySettings = {
  channelName: 'AVILA_FUMACA',
  streamTitle: 'A LIVE VAI COMEÇAR',
  tagline: 'PREPARE-SE!',
  themeId: 'toxicLime',
  customBgColor: '',
  bgStyle: 'clean', // clean background style so user's image is pristine
  customBgImage: '',
  bgImageOpacity: 0.95,
  smokeIntensity: 0.2,
  particleCount: 20,
  showScanlines: false,
  showGrid: false,
  showVisualizer: false, // Turned off so the circle around the center is removed
  showCountdown: true,
  showBoxContainer: false,
  showGitDiamond: false,
  showGitLogo: false, // Default false: center nodes/points removed as requested
  countdownMinutes: 5,
  countdownSeconds: 0,
  cameraIntroDuration: 3.5,
  autoLoopIntro: false,
  socialsList: [
    {
      id: 'twitch',
      platform: 'twitch',
      label: 'twitch.tv/',
      handle: 'avilafumaca',
      enabled: true,
    },
    {
      id: 'kick',
      platform: 'kick',
      label: 'kick.com/',
      handle: 'avilafumaca',
      enabled: true,
    },
    {
      id: 'youtube',
      platform: 'youtube',
      label: 'youtube.com/@',
      handle: 'AvilaFumaca',
      enabled: false, // disabled by default so user can enable when ready!
    },
    {
      id: 'instagram',
      platform: 'instagram',
      label: 'instagram.com/',
      handle: 'avilafumaca',
      enabled: false,
    },
  ],
};
