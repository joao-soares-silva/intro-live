import React from 'react';
import { NeonTheme, StreamOverlaySettings } from '../types/theme';

interface StreamOverlayUIProps {
  theme: NeonTheme;
  settings: StreamOverlaySettings;
  introProgress: number; // 0 to 1
  remainingSeconds: number;
}

export const StreamOverlayUI: React.FC<StreamOverlayUIProps> = ({
  theme,
  settings,
  introProgress,
  remainingSeconds,
}) => {
  // Intro visibility: smoothly fade in and settle
  // When introProgress < 0.35, subtle low alpha; after reveal, fully brilliant
  const revealAlpha = Math.min(1, Math.max(0, (introProgress - 0.25) / 0.4));
  const isCountdownFinished = remainingSeconds <= 0 && settings.showCountdown;

  const minutes = Math.floor(Math.max(0, remainingSeconds) / 60);
  const seconds = Math.floor(Math.max(0, remainingSeconds) % 60);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Active social entries (only enabled and non-empty handles)
  const activeSocials = (settings.socialsList || []).filter(
    (s) => s.enabled && Boolean(s.handle?.trim())
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 md:p-12 transition-opacity duration-700 select-none overflow-hidden"
      style={{ opacity: revealAlpha }}
    >
      {/* Top Bar: Subtle Streamer Brand & Live Status */}
      <div className="flex items-center justify-between w-full">
        {/* Subtle Brand Tag */}
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full animate-ping"
            style={{ backgroundColor: theme.primary }}
          />
          <span
            className="text-xs uppercase tracking-[0.25em] font-mono font-bold"
            style={{
              color: theme.primary,
              textShadow: `0 0 10px ${theme.primary}`,
            }}
          >
            {isCountdownFinished ? 'TRANSMISSÃO AO VIVO' : 'TRANSMISSÃO EM BREVE'}
          </span>
        </div>

        {/* Countdown Badge if active */}
        {settings.showCountdown && (
          <div
            className="px-4 py-1.5 rounded-md flex items-center gap-2 border font-mono backdrop-blur-md"
            style={{
              borderColor: `${theme.primary}55`,
              backgroundColor: `${theme.bgDark}aa`,
              boxShadow: `0 0 15px ${theme.primary}33`,
            }}
          >
            <span className="text-xs uppercase tracking-wider text-slate-400">Início em:</span>
            <span
              className="text-base font-bold tabular-nums tracking-wider"
              style={{
                color: theme.accent,
                textShadow: `0 0 10px ${theme.primary}`,
              }}
            >
              {formattedTime}
            </span>
          </div>
        )}
      </div>

      {/* Center Bottom: Dominant Neon Typography Lockup */}
      <div className="w-full flex flex-col items-center justify-center text-center mt-auto mb-4 md:mb-6">
        {/* Channel Name: Clean neon text without dark box / container */}
        {settings.channelName && settings.channelName.trim() !== '' && (
          settings.showBoxContainer ? (
            <div
              className="relative px-8 py-3 md:px-12 md:py-4 rounded-xl border-2 backdrop-blur-md transition-all duration-300"
              style={{
                borderColor: theme.primary,
                backgroundColor: 'rgba(2, 6, 12, 0.7)',
                boxShadow: `0 0 24px ${theme.glowColor}, inset 0 0 18px ${theme.primary}22`,
              }}
            >
              <div
                className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2"
                style={{ borderColor: theme.accent }}
              />
              <div
                className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2"
                style={{ borderColor: theme.accent }}
              />
              <div
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2"
                style={{ borderColor: theme.accent }}
              />
              <div
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2"
                style={{ borderColor: theme.accent }}
              />

              <h1
                className="text-3xl md:text-5xl lg:text-6xl font-black tracking-widest uppercase font-mono"
                style={{
                  color: theme.accent,
                  textShadow: `0 0 8px #ffffff, 0 0 18px ${theme.primary}, 0 0 35px ${theme.primary}`,
                }}
              >
                {settings.channelName}
              </h1>
            </div>
          ) : (
            <h1
              className="text-3xl md:text-5xl lg:text-6xl font-black tracking-widest uppercase font-mono drop-shadow-lg"
              style={{
                color: theme.accent,
                textShadow: `0 0 10px #ffffff, 0 0 22px ${theme.primary}, 0 0 45px ${theme.primary}`,
              }}
            >
              {settings.channelName}
            </h1>
          )
        )}

        {/* Subtitle: "A LIVE VAI COMEÇAR" */}
        <div className="mt-4 md:mt-5 flex items-center justify-center gap-3">
          <div
            className="h-[1.5px] w-8 md:w-16"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.secondary})`,
            }}
          />
          <h2
            className="text-lg md:text-2xl lg:text-3xl font-extrabold tracking-[0.2em] uppercase font-sans"
            style={{
              color: '#ffffff',
              textShadow: `0 0 12px ${theme.secondary}, 0 0 25px ${theme.secondary}`,
            }}
          >
            {isCountdownFinished ? 'ESTAMOS AO VIVO!' : settings.streamTitle}
          </h2>
          <div
            className="h-[1.5px] w-8 md:w-16"
            style={{
              background: `linear-gradient(90deg, ${theme.secondary}, transparent)`,
            }}
          />
        </div>

        {/* Tagline: "PREPARE-SE!" with dynamic neon breathing */}
        <p
          className="mt-2 text-xs md:text-sm font-mono tracking-[0.35em] uppercase font-bold"
          style={{
            color: theme.primary,
            textShadow: `0 0 10px ${theme.primary}`,
          }}
        >
          {settings.tagline}
        </p>
      </div>

      {/* Bottom Bar: Social Media Ticker (only shown if there are active platforms) */}
      {activeSocials.length > 0 ? (
        <div className="w-full flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs font-mono">
          {activeSocials.map((soc) => (
            <div
              key={soc.id}
              className="flex items-center gap-1.5 text-slate-300/80 px-3 py-1 rounded bg-black/40 border border-white/5 backdrop-blur-sm shadow-sm"
            >
              <span style={{ color: theme.primary }}>/</span>
              <span className="text-slate-400">{soc.label}</span>
              <span
                className="font-semibold text-white"
                style={{ textShadow: `0 0 8px ${theme.primary}66` }}
              >
                {soc.handle}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-6" />
      )}
    </div>
  );
};
