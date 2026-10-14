import React, { useState, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Video,
  Image as ImageIcon,
  Camera,
  Copy,
  Check,
  Sliders,
  Sparkles,
  Timer,
  Share2,
  Eye,
  Maximize2,
  Flame,
  Plus,
  Trash2,
  Upload,
  Palette,
  Layers,
} from 'lucide-react';
import {
  NeonTheme,
  NEON_THEMES,
  NeonThemeId,
  StreamOverlaySettings,
  SocialPlatformItem,
  BackgroundStyle,
} from '../types/theme';
import { cyberAudio } from '../utils/audioSynth';

interface StudioControlsProps {
  theme: NeonTheme;
  settings: StreamOverlaySettings;
  onUpdateSettings: (updater: (prev: StreamOverlaySettings) => StreamOverlaySettings) => void;
  onReplayIntro: () => void;
  onExportVideo: (durationSec: number) => void;
  onExportGif: (durationSec: number) => void;
  onCaptureSnapshot: () => void;
  isExportingVideo: boolean;
  isExportingGif: boolean;
  exportProgress: number;
  onToggleCleanMode: () => void;
  isCleanMode: boolean;
  countdownActive: boolean;
  onToggleCountdown: () => void;
  onResetCountdown: () => void;
}

export const StudioControls: React.FC<StudioControlsProps> = ({
  theme,
  settings,
  onUpdateSettings,
  onReplayIntro,
  onExportVideo,
  onExportGif,
  onCaptureSnapshot,
  isExportingVideo,
  isExportingGif,
  exportProgress,
  onToggleCleanMode,
  isCleanMode,
  countdownActive,
  onToggleCountdown,
  onResetCountdown,
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'background' | 'text' | 'effects' | 'export'>('background');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [copiedObsUrl, setCopiedObsUrl] = useState(false);
  const [exportDuration, setExportDuration] = useState<number>(60);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleToggleSound = () => {
    cyberAudio.start();
    const muted = !cyberAudio.toggleMute();
    setIsAudioMuted(muted);
  };

  const handleCopyObsUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('obs', 'true');
    navigator.clipboard.writeText(url.toString());
    setCopiedObsUrl(true);
    setTimeout(() => setCopiedObsUrl(false), 2500);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onUpdateSettings((prev) => ({
        ...prev,
        customBgImage: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      customBgImage: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Socials Management
  const handleToggleSocial = (id: string) => {
    onUpdateSettings((prev) => ({
      ...prev,
      socialsList: prev.socialsList.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      ),
    }));
  };

  const handleUpdateSocial = (id: string, field: keyof SocialPlatformItem, value: any) => {
    onUpdateSettings((prev) => ({
      ...prev,
      socialsList: prev.socialsList.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleDeleteSocial = (id: string) => {
    onUpdateSettings((prev) => ({
      ...prev,
      socialsList: prev.socialsList.filter((item) => item.id !== id),
    }));
  };

  const handleAddSocial = () => {
    const newId = `social_${Date.now()}`;
    const newItem: SocialPlatformItem = {
      id: newId,
      platform: 'kick',
      label: 'kick.com/',
      handle: 'meucanal',
      enabled: true,
    };
    onUpdateSettings((prev) => ({
      ...prev,
      socialsList: [...prev.socialsList, newItem],
    }));
  };

  if (isCleanMode) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={onToggleCleanMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 border border-white/20 text-xs font-mono text-white/90 backdrop-blur-md transition-all shadow-lg hover:border-white/40"
          title="Mostrar Painel de Configurações (ou pressione H)"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Configurações</span>
        </button>
        <button
          onClick={handleFullscreen}
          className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 border border-white/20 text-white/90 backdrop-blur-md transition-all shadow-lg hover:border-white/40"
          title="Tela Cheia"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const bgStyleOptions: { id: BackgroundStyle; label: string; desc: string }[] = [
    { id: 'smoke', label: 'Fumaça Neon', desc: 'Fumaça volumétrica estilo Ávila' },
    { id: 'matrix', label: 'Chuva Matrix', desc: 'Códigos digitais caindo em neon' },
    { id: 'stars', label: 'Estrelas 3D', desc: 'Túnel de estrelas em hiperespaço' },
    { id: 'grid', label: 'Grade 3D Synth', desc: 'Chão futurista com perspectiva' },
    { id: 'clean', label: 'Minimalista', desc: 'Fundo escuro puro e foco no neon' },
  ];

  const presetColors = [
    { label: 'Padrão do Tema', hex: '' },
    { label: 'Preto Puro OLED', hex: '#000000' },
    { label: 'Verde Tóxico Escuro', hex: '#020d05' },
    { label: 'Azul Cyber Escuro', hex: '#020b17' },
    { label: 'Roxo Dark', hex: '#0c0217' },
    { label: 'Vermelho Dark', hex: '#140303' },
  ];

  return (
    <div className="w-full bg-slate-950/95 border-t border-slate-800 text-slate-200 backdrop-blur-xl transition-all">
      {/* Top Quick Actions Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          {/* Replay Camera Animation */}
          <button
            onClick={onReplayIntro}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs tracking-wide transition-all shadow-md active:scale-95"
            style={{
              backgroundColor: theme.primary,
              color: '#000000',
              boxShadow: `0 0 15px ${theme.primary}55`,
            }}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Repetir Transição de Câmera</span>
          </button>

          {/* Sound / Cyber Beat Toggle */}
          <button
            onClick={handleToggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              !isAudioMuted
                ? 'bg-slate-800/90 border-slate-600 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            {!isAudioMuted ? (
              <>
                <Volume2 className="w-3.5 h-3.5" style={{ color: theme.primary }} />
                <span>Batida Cyber Ativa</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Batida Mudo</span>
              </>
            )}
          </button>

          {/* Countdown Play/Pause */}
          {settings.showCountdown && (
            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={onToggleCountdown}
                className="px-2.5 py-1 rounded text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1"
              >
                <Timer className="w-3 h-3" />
                {countdownActive ? 'Pausar Timer' : 'Iniciar Timer'}
              </button>
              <button
                onClick={onResetCountdown}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Resetar Timer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Presentation & OBS Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyObsUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors"
          >
            {copiedObsUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Link OBS Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar URL para OBS</span>
              </>
            )}
          </button>

          <button
            onClick={onToggleCleanMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white transition-colors"
            title="Oculta o painel para uso ao vivo no stream"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Modo Transmissão (Limpo)</span>
          </button>

          <button
            onClick={handleFullscreen}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title="Tela Cheia"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tabbed Configuration Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3.5">
        <div className="flex flex-col gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800 self-start">
            <button
              onClick={() => setActiveTab('background')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'background'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fundo Customizável</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'text'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Textos & Redes (@)</span>
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'theme'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cores Neon</span>
            </button>
            <button
              onClick={() => setActiveTab('effects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'effects'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Efeitos & Timer</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'export'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Exportar GIF / Vídeo</span>
            </button>
          </div>

          {/* Active Tab Panels */}
          <div className="w-full">
            {/* TAB: FUNDO CUSTOMIZÁVEL */}
            {activeTab === 'background' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                {/* 1. Estilo Visual do Fundo */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
                    1. Estilo do Fundo
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {bgStyleOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() =>
                          onUpdateSettings((prev) => ({ ...prev, bgStyle: opt.id }))
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-left border transition-all text-xs ${
                          settings.bgStyle === opt.id
                            ? 'border-emerald-500 bg-slate-800/90 text-white font-medium shadow-sm'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-[11px]">{opt.label}</div>
                        <div className="text-[9px] text-slate-500 truncate">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Cor Base do Fundo */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      2. Cor de Fundo
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Personalizada:</span>
                      <input
                        type="color"
                        value={settings.customBgColor || theme.bgDark}
                        onChange={(e) =>
                          onUpdateSettings((prev) => ({ ...prev, customBgColor: e.target.value }))
                        }
                        className="w-5 h-5 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                        title="Escolha qualquer cor personalizada"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {presetColors.map((colorPreset) => {
                      const isSelected = settings.customBgColor === colorPreset.hex;
                      return (
                        <button
                          key={colorPreset.label}
                          onClick={() =>
                            onUpdateSettings((prev) => ({
                              ...prev,
                              customBgColor: colorPreset.hex,
                            }))
                          }
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                            isSelected
                              ? 'border-emerald-400 bg-slate-800 text-white font-medium'
                              : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: colorPreset.hex || theme.bgDark }}
                          />
                          <span className="truncate text-[11px]">{colorPreset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Imagem / Papel de Parede Próprio */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
                    3. Imagem de Fundo (Wallpaper)
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {settings.customBgImage ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <img
                          src={settings.customBgImage}
                          alt="Fundo"
                          className="w-12 h-8 object-cover rounded border border-slate-700"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-white block truncate">Imagem Carregada</span>
                          <span className="text-[10px] text-emerald-400">Ativa no fundo</span>
                        </div>
                        <button
                          onClick={handleRemoveImage}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                          title="Remover Imagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[10px] font-mono text-slate-400">Opacidade:</span>
                        <input
                          type="range"
                          min="0.05"
                          max="1"
                          step="0.05"
                          value={settings.bgImageOpacity}
                          onChange={(e) =>
                            onUpdateSettings((prev) => ({
                              ...prev,
                              bgImageOpacity: parseFloat(e.target.value),
                            }))
                          }
                          className="flex-1 accent-emerald-500 cursor-pointer"
                        />
                        <span className="font-mono text-[11px] text-slate-300 w-8 text-right">
                          {Math.round(settings.bgImageOpacity * 100)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/60 hover:bg-slate-900 text-slate-300 transition-all text-xs"
                    >
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Carregar Imagem do seu PC</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TEXTOS & REDES (@) */}
            {activeTab === 'text' && (
              <div className="flex flex-col gap-3">
                {/* Títulos Principais */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Nome do Canal (Destaque Neon)
                    </label>
                    <input
                      type="text"
                      value={settings.channelName}
                      onChange={(e) =>
                        onUpdateSettings((prev) => ({ ...prev, channelName: e.target.value }))
                      }
                      className="w-full px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded font-mono text-white focus:outline-none focus:border-emerald-500"
                      placeholder="AVILA_FUMACA"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      value={settings.streamTitle}
                      onChange={(e) =>
                        onUpdateSettings((prev) => ({ ...prev, streamTitle: e.target.value }))
                      }
                      className="w-full px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-500"
                      placeholder="A LIVE VAI COMEÇAR"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Legenda Inferior
                    </label>
                    <input
                      type="text"
                      value={settings.tagline}
                      onChange={(e) =>
                        onUpdateSettings((prev) => ({ ...prev, tagline: e.target.value }))
                      }
                      className="w-full px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-500"
                      placeholder="PREPARE-SE!"
                    />
                  </div>
                </div>

                {/* Opção para Moldura / Caixa ao redor do Nome */}
                <div className="flex items-center gap-2 px-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                    <input
                      type="checkbox"
                      checked={settings.showBoxContainer}
                      onChange={(e) =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          showBoxContainer: e.target.checked,
                        }))
                      }
                      className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Exibir moldura retangular com fundo escuro no nome (padrão: desativado)</span>
                  </label>
                </div>

                {/* Gerenciamento de Canais e Redes (@) */}
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-semibold text-white">
                        Canais & Redes Sociais (@) na Barra Inferior
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Ative, edite ou exclua canais que ainda não possui. Apenas os marcados aparecem na tela.
                      </p>
                    </div>
                    <button
                      onClick={handleAddSocial}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-medium border border-slate-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Canal</span>
                    </button>
                  </div>

                  {settings.socialsList.length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-500">
                      Nenhum canal configurado. A barra inferior ficará oculta.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {settings.socialsList.map((soc) => (
                        <div
                          key={soc.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${
                            soc.enabled
                              ? 'bg-slate-900/80 border-slate-700'
                              : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          }`}
                        >
                          {/* Enable/Disable checkbox */}
                          <input
                            type="checkbox"
                            checked={soc.enabled}
                            onChange={() => handleToggleSocial(soc.id)}
                            className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
                            title={soc.enabled ? 'Canal ativo (visível na tela)' : 'Canal desativado (oculto)'}
                          />

                          {/* Prefix Label */}
                          <input
                            type="text"
                            value={soc.label}
                            onChange={(e) => handleUpdateSocial(soc.id, 'label', e.target.value)}
                            className="w-20 px-1.5 py-0.5 text-[11px] bg-slate-950 border border-slate-800 rounded font-mono text-slate-400 focus:outline-none focus:border-emerald-500"
                            placeholder="ex: kick.com/"
                          />

                          {/* Handle (@) */}
                          <input
                            type="text"
                            value={soc.handle}
                            onChange={(e) => handleUpdateSocial(soc.id, 'handle', e.target.value)}
                            className="flex-1 min-w-0 px-2 py-0.5 text-xs bg-slate-950 border border-slate-800 rounded font-mono text-white focus:outline-none focus:border-emerald-500"
                            placeholder="seunome"
                          />

                          {/* Delete Channel Button */}
                          <button
                            onClick={() => handleDeleteSocial(soc.id)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                            title="Excluir este canal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: CORES NEON */}
            {activeTab === 'theme' && (
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                {(Object.keys(NEON_THEMES) as NeonThemeId[]).map((themeKey) => {
                  const item = NEON_THEMES[themeKey];
                  const isSelected = settings.themeId === themeKey;
                  return (
                    <button
                      key={themeKey}
                      onClick={() =>
                        onUpdateSettings((prev) => ({ ...prev, themeId: themeKey }))
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? 'border-white/80 bg-slate-800/90 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-sm"
                        style={{
                          backgroundColor: item.primary,
                          boxShadow: `0 0 8px ${item.primary}`,
                        }}
                      />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB: EFEITOS & TIMER */}
            {activeTab === 'effects' && (
              <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                {/* Smoke Intensity Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Intensidade Fumaça:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.smokeIntensity}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        smokeIntensity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-24 accent-emerald-500 cursor-pointer"
                  />
                  <span className="font-mono text-slate-300">
                    {Math.round(settings.smokeIntensity * 100)}%
                  </span>
                </div>

                {/* Particle Count */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Partículas:</span>
                  <input
                    type="range"
                    min="20"
                    max="160"
                    step="10"
                    value={settings.particleCount}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        particleCount: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-20 accent-emerald-500 cursor-pointer"
                  />
                  <span className="font-mono text-slate-300">{settings.particleCount}</span>
                </div>

                {/* Toggles */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showGrid}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({ ...prev, showGrid: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-slate-300">Grade Cyber 3D</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showVisualizer}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({ ...prev, showVisualizer: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-slate-300">Visualizador de Áudio</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showScanlines}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({ ...prev, showScanlines: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-slate-300">Scanlines CRT</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showCountdown}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({ ...prev, showCountdown: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-slate-300">Timer Regressivo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showGitDiamond}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({ ...prev, showGitDiamond: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-slate-300">Quadrado/Losango ao redor do Git</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showGitLogo}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({ ...prev, showGitLogo: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-slate-300">Logotipo Git / Pontos Centrais</span>
                </label>
              </div>
            )}

            {/* TAB: EXPORTAR */}
            {activeTab === 'export' && (
              <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">Duração:</span>
                  {[
                    { label: '10s', sec: 10 },
                    { label: '30s', sec: 30 },
                    { label: '1 min', sec: 60 },
                    { label: '3 min', sec: 180 },
                    { label: '5 min', sec: 300 },
                  ].map((item) => (
                    <button
                      key={item.sec}
                      onClick={() => setExportDuration(item.sec)}
                      className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                        exportDuration === item.sec
                          ? 'bg-emerald-500 text-black font-bold shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Export MP4 Video button */}
                <button
                  onClick={() => onExportVideo(exportDuration)}
                  disabled={isExportingGif || isExportingVideo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs transition-colors shadow-lg active:scale-95"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>
                    {isExportingVideo ? `Gerando MP4 (${exportProgress}%)...` : 'Baixar Vídeo MP4 (HD 60fps)'}
                  </span>
                </button>

                {/* Export GIF button */}
                <button
                  onClick={() => onExportGif(exportDuration)}
                  disabled={isExportingGif || isExportingVideo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium text-xs transition-colors border border-slate-700"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isExportingGif ? `Gerando GIF (${exportProgress}%)...` : 'Baixar GIF Animado'}
                  </span>
                </button>

                {/* Capture snapshot */}
                <button
                  onClick={onCaptureSnapshot}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition-colors"
                  title="Salvar Foto PNG em Alta Resolução"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Foto PNG</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
