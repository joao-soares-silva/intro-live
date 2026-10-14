import React from 'react';
import { NeonTheme, StreamOverlaySettings } from '../types/theme';

interface StreamOverlayUIProps {
  theme: NeonTheme;
  settings: StreamOverlaySettings;
  introProgress: number;
  remainingSeconds: number;
}

// All typography, countdown, and socials are now rendered directly onto the master canvas
// inside GitNeonCanvas.tsx to guarantee 100% complete MP4, WebM, GIF and Snapshot downloads.
export const StreamOverlayUI: React.FC<StreamOverlayUIProps> = () => {
  return null;
};
