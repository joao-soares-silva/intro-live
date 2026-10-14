/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GitNeonCanvas } from './components/GitNeonCanvas';
import { StreamOverlayUI } from './components/StreamOverlayUI';
import { StudioControls } from './components/StudioControls';
import { DEFAULT_SETTINGS, NEON_THEMES, StreamOverlaySettings } from './types/theme';
import { createGifBlob } from './utils/gifEncoder';
import { cyberAudio } from './utils/audioSynth';
import { HelpCircle, X, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<StreamOverlaySettings>(DEFAULT_SETTINGS);
  const [introProgress, setIntroProgress] = useState<number>(0);
  const [isCleanMode, setIsCleanMode] = useState<boolean>(false);
  const [showObsGuide, setShowObsGuide] = useState<boolean>(false);

  // Countdown state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    DEFAULT_SETTINGS.countdownMinutes * 60 + DEFAULT_SETTINGS.countdownSeconds
  );
  const [countdownActive, setCountdownActive] = useState<boolean>(true);

  // Export states
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [isExportingGif, setIsExportingGif] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState<number>(0);

  // Canvas Reference
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  // Intro Animation Clock
  const introStartTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // Check URL params for ?obs=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('obs') === 'true' || params.get('clean') === 'true') {
      setIsCleanMode(true);
    }
  }, []);

  // Intro Progress Loop
  useEffect(() => {
    introStartTimeRef.current = performance.now();

    const updateIntro = () => {
      const now = performance.now();
      const elapsed = (now - introStartTimeRef.current) / 1000;
      const duration = settings.cameraIntroDuration;

      if (settings.autoLoopIntro) {
        const loopElapsed = elapsed % (duration + 2); // 2s pause at end before repeat
        const prog = Math.min(1, loopElapsed / duration);
        setIntroProgress(prog);
      } else {
        const prog = Math.min(1, elapsed / duration);
        setIntroProgress(prog);
      }

      animFrameRef.current = requestAnimationFrame(updateIntro);
    };

    animFrameRef.current = requestAnimationFrame(updateIntro);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [settings.cameraIntroDuration, settings.autoLoopIntro]);

  // Countdown Timer Interval
  useEffect(() => {
    if (!countdownActive) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownActive]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'h' || e.key === 'H') {
        setIsCleanMode((prev) => !prev);
      } else if (e.key === ' ') {
        e.preventDefault();
        handleReplayIntro();
      } else if (e.key === 'm' || e.key === 'M') {
        cyberAudio.start();
        cyberAudio.toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleReplayIntro = useCallback(() => {
    introStartTimeRef.current = performance.now();
    setIntroProgress(0);
  }, []);

  const handleToggleCountdown = () => {
    setCountdownActive((prev) => !prev);
  };

  const handleResetCountdown = () => {
    setRemainingSeconds(settings.countdownMinutes * 60 + settings.countdownSeconds);
    setCountdownActive(true);
  };

  // Video Export (60 FPS WebM HD)
  const handleExportVideo = async (durationSec: number) => {
    const canvas = canvasElementRef.current;
    if (!canvas || isExportingVideo || isExportingGif) return;

    setIsExportingVideo(true);
    setRecordingSecondsLeft(durationSec);

    // Restart intro so recording captures the full reveal
    handleReplayIntro();

    try {
      const stream = canvas.captureStream(60);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps high quality
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `git-neon-abertura-${settings.channelName.toLowerCase()}-${durationSec}s.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportingVideo(false);
      };

      recorder.start();

      // Countdown interval for recording indicator
      let left = durationSec;
      const recTimer = setInterval(() => {
        left--;
        setRecordingSecondsLeft(left);
        if (left <= 0) {
          clearInterval(recTimer);
          recorder.stop();
        }
      }, 1000);
    } catch (err) {
      console.error('Error recording video:', err);
      setIsExportingVideo(false);
    }
  };

  // Animated GIF Export
  const handleExportGif = async (durationSec: number) => {
    const canvas = canvasElementRef.current;
    if (!canvas || isExportingGif || isExportingVideo) return;

    setIsExportingGif(true);
    setExportProgress(0);

    // Restart intro for GIF
    handleReplayIntro();

    try {
      // Capture at scaled resolution for performant, sharp GIF (e.g. 640x360)
      const gifWidth = 640;
      const gifHeight = 360;
      const fps = 16;
      const totalFrames = durationSec * fps;
      const frameDelayMs = 1000 / fps;

      const frames: HTMLCanvasElement[] = [];

      for (let i = 0; i < totalFrames; i++) {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = gifWidth;
        frameCanvas.height = gifHeight;
        const fCtx = frameCanvas.getContext('2d');
        if (fCtx) {
          // Draw scaled frame from master canvas
          fCtx.drawImage(canvas, 0, 0, gifWidth, gifHeight);
          frames.push(frameCanvas);
        }

        // Wait for next frame time
        await new Promise((res) => setTimeout(res, frameDelayMs));
      }

      // Encode frames into GIF
      const gifBlob = await createGifBlob(frames, frameDelayMs, (pct) => {
        setExportProgress(pct);
      });

      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `git-neon-abertura-${settings.channelName.toLowerCase()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating GIF:', err);
    } finally {
      setIsExportingGif(false);
      setExportProgress(0);
    }
  };

  // Snapshot PNG
  const handleCaptureSnapshot = () => {
    const canvas = canvasElementRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `git-neon-abertura-${settings.channelName.toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const activeTheme = NEON_THEMES[settings.themeId] || NEON_THEMES.toxicLime;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col font-sans select-none">
      {/* Visual Canvas Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
        {/* The Animated Git Neon Canvas */}
        <GitNeonCanvas
          theme={activeTheme}
          settings={settings}
          introProgress={introProgress}
          onCanvasReady={(c) => {
            canvasElementRef.current = c;
          }}
        />

        {/* Live Neon Typography, Countdown & Social Ticker Overlay */}
        <StreamOverlayUI
          theme={activeTheme}
          settings={settings}
          introProgress={introProgress}
          remainingSeconds={remainingSeconds}
        />

        {/* Live Recording HUD overlay */}
        {isExportingVideo && (
          <div className="absolute top-6 left-6 z-50 flex items-center gap-2.5 px-4 py-2 rounded-lg bg-red-950/90 border border-red-500/60 backdrop-blur-md shadow-2xl animate-pulse">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs font-mono font-bold text-white tracking-widest uppercase">
              GRAVANDO VÍDEO 60FPS: {recordingSecondsLeft}s
            </span>
          </div>
        )}

        {/* GIF Encoding HUD overlay */}
        {isExportingGif && (
          <div className="absolute top-6 left-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-950/90 border border-emerald-500/60 backdrop-blur-md shadow-2xl">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                PROCESSANDO GIF ANIMADO ({exportProgress}%)
              </span>
              <div className="w-44 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-150"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Help / OBS Info Button */}
        {!isCleanMode && (
          <button
            onClick={() => setShowObsGuide(true)}
            className="absolute top-4 left-4 z-40 p-2 rounded-lg bg-black/60 hover:bg-black/90 border border-white/10 text-slate-300 hover:text-white backdrop-blur-md transition-colors"
            title="Como usar no OBS Studio"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Studio Controls */}
      <StudioControls
        theme={activeTheme}
        settings={settings}
        onUpdateSettings={setSettings}
        onReplayIntro={handleReplayIntro}
        onExportVideo={handleExportVideo}
        onExportGif={handleExportGif}
        onCaptureSnapshot={handleCaptureSnapshot}
        isExportingVideo={isExportingVideo}
        isExportingGif={isExportingGif}
        exportProgress={exportProgress}
        onToggleCleanMode={() => setIsCleanMode((prev) => !prev)}
        isCleanMode={isCleanMode}
        countdownActive={countdownActive}
        onToggleCountdown={handleToggleCountdown}
        onResetCountdown={handleResetCountdown}
      />

      {/* OBS Setup Guide Modal */}
      {showObsGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-200">
            <button
              onClick={() => setShowObsGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Como usar esta Abertura no OBS Studio</h3>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-medium">1. Modo Navegador (Browser Source)</strong>
                  <p className="text-xs text-slate-400 mt-0.5">
                    No OBS, adicione uma fonte <strong>Navegador</strong> (Browser), cole o URL com <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">?obs=true</code> e defina largura <strong>1920</strong> e altura <strong>1080</strong>. O painel de controle fica oculto automaticamente!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-medium">2. Modo Fonte de Mídia (Vídeo WebM em Loop)</strong>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Clique em <strong>"Gravar Vídeo WebM (HD)"</strong>, salve o arquivo e adicione como <strong>Fonte de Mídia</strong> marcando a opção <strong>"Loop"</strong>. É leve e consome zero CPU durante a live!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-medium">3. GIF Animado para Alertas ou Redes</strong>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exporte o <strong>GIF Animado</strong> para usar em banners da Twitch, Discord, stories do Instagram ou na tela de espera.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">Atalhos: Espaço (Reiniciar Câmera), H (Ocultar Menu), M (Mudo)</span>
              <button
                onClick={() => setShowObsGuide(false)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors"
              >
                Entendi, vamos lá!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
