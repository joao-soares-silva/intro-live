import React, { useEffect, useRef } from 'react';
import { NeonTheme, StreamOverlaySettings } from '../types/theme';
import { AudioMetrics, cyberAudio } from '../utils/audioSynth';

interface GitNeonCanvasProps {
  theme: NeonTheme;
  settings: StreamOverlaySettings;
  introProgress: number; // 0 to 1
  isRecording?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  life: number;
  maxLife: number;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  growth: number;
  alpha: number;
  maxAlpha: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
}

interface MatrixDrop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
}

interface StarPoint {
  x: number;
  y: number;
  z: number;
  pz: number;
}

interface Spark {
  pos: number; // 0 to 1 along branch path
  speed: number;
  size: number;
  pathId: 'main' | 'branch' | 'connector';
}

export const GitNeonCanvas: React.FC<GitNeonCanvasProps> = ({
  theme,
  settings,
  introProgress,
  onCanvasReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const smokeRef = useRef<SmokePuff[]>([]);
  const matrixDropsRef = useRef<MatrixDrop[]>([]);
  const starsRef = useRef<StarPoint[]>([]);
  const shockwavesRef = useRef<{ radius: number; maxRadius: number; alpha: number; color: string }[]>([]);
  const lastBeatHitRef = useRef<boolean>(false);
  const bgImageElementRef = useRef<HTMLImageElement | null>(null);

  // Load custom background image if provided
  useEffect(() => {
    if (settings.customBgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = settings.customBgImage;
      img.onload = () => {
        bgImageElementRef.current = img;
      };
    } else {
      bgImageElementRef.current = null;
    }
  }, [settings.customBgImage]);

  // Initialize sparks, matrix drops and stars
  useEffect(() => {
    // Generate initial sparks
    const sparks: Spark[] = [];
    for (let i = 0; i < 8; i++) {
      sparks.push({
        pos: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        size: 2.5 + Math.random() * 2.5,
        pathId: i % 2 === 0 ? 'main' : 'branch',
      });
    }
    sparksRef.current = sparks;

    // Matrix drops
    const drops: MatrixDrop[] = [];
    const cols = 45;
    const glyphs = '01GITBRANCHCOMMITMERGEREBASEHEAD0123456789<>/\\*{}[]#';
    for (let i = 0; i < cols; i++) {
      const chars: string[] = [];
      const len = 8 + Math.floor(Math.random() * 12);
      for (let j = 0; j < len; j++) {
        chars.push(glyphs[Math.floor(Math.random() * glyphs.length)]);
      }
      drops.push({
        x: (i / cols) * 1920,
        y: Math.random() * 1080,
        speed: 120 + Math.random() * 260,
        chars,
        length: len,
      });
    }
    matrixDropsRef.current = drops;

    // Stars
    const stars: StarPoint[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 1920,
        y: (Math.random() - 0.5) * 1080,
        z: Math.random() * 1000,
        pz: 1000,
      });
    }
    starsRef.current = stars;

    // Canvas notification
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = performance.now() * 0.001;

    const render = () => {
      const now = performance.now() * 0.001;
      const dt = Math.min(0.1, now - time);
      time = now;

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // 1. Audio metrics
      const metrics: AudioMetrics = cyberAudio.getMetrics();

      // Trigger shockwave on beat hit
      if (metrics.isBeatHit && !lastBeatHitRef.current) {
        shockwavesRef.current.push({
          radius: 10,
          maxRadius: Math.min(width, height) * 0.45,
          alpha: 0.7,
          color: theme.primary,
        });
        if (shockwavesRef.current.length > 4) {
          shockwavesRef.current.shift();
        }
      }
      lastBeatHitRef.current = metrics.isBeatHit;

      // 2. Camera Transform Calculation based on introProgress
      let camScale = 1;
      let camOffsetX = 0;
      let camOffsetY = 0;
      let camRotation = 0;
      let focalGlowBoost = 1;

      if (introProgress < 0.35) {
        const p = introProgress / 0.35;
        const ease = 0.5 - Math.cos(p * Math.PI) * 0.5;
        camScale = 2.8 - ease * 0.6;
        camOffsetX = 55 - ease * 15;
        camOffsetY = -30 + ease * 10;
        camRotation = 0.08 * (1 - ease);
        focalGlowBoost = 1.6 - ease * 0.3;
      } else if (introProgress < 0.85) {
        const p = (introProgress - 0.35) / 0.5;
        const ease = 1 - Math.pow(1 - p, 3);
        camScale = 2.2 - ease * 1.2;
        camOffsetX = 40 * (1 - ease);
        camOffsetY = -20 * (1 - ease);
        camRotation = 0.04 * (1 - ease);
        focalGlowBoost = 1.3 - ease * 0.3;
      } else {
        const idleP = (introProgress - 0.85) / 0.15;
        const settlePulse = Math.sin(idleP * Math.PI) * 0.08;
        const idleFloat = Math.sin(now * 1.5) * 0.015;
        const beatBounce = metrics.bass * 0.035;
        camScale = 1.0 + settlePulse + idleFloat + beatBounce;
        camOffsetX = Math.sin(now * 0.8) * 4;
        camOffsetY = Math.cos(now * 1.1) * 3;
        camRotation = Math.sin(now * 0.5) * 0.005;
        focalGlowBoost = 1.0 + metrics.bass * 0.4;
      }

      // 3. Background Color
      ctx.save();
      const baseBgColor = settings.customBgColor || theme.bgDark;
      ctx.fillStyle = baseBgColor;
      ctx.fillRect(0, 0, width, height);

      // Custom Background Image (if uploaded)
      if (bgImageElementRef.current && bgImageElementRef.current.complete) {
        ctx.save();
        ctx.globalAlpha = settings.bgImageOpacity;
        const img = bgImageElementRef.current;
        // Cover fit math
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let dw = width;
        let dh = height;
        let dx = 0;
        let dy = 0;
        if (canvasRatio > imgRatio) {
          dh = width / imgRatio;
          dy = (height - dh) * 0.5;
        } else {
          dw = height * imgRatio;
          dx = (width - dw) * 0.5;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      }

      // Deep atmospheric gradient (only if no custom background image is present)
      if (!bgImageElementRef.current) {
        const bgGrad = ctx.createRadialGradient(
          width * 0.5 + camOffsetX * 0.5,
          height * 0.5 + camOffsetY * 0.5,
          40,
          width * 0.5,
          height * 0.5,
          Math.max(width, height) * 0.75
        );
        bgGrad.addColorStop(0, theme.smokeColor);
        bgGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 4. Background Style: Smoke, Matrix, Stars, or Grid
      const bgStyle = settings.bgStyle || 'smoke';

      // --- STYLE: MATRIX DIGITAL RAIN ---
      if (bgStyle === 'matrix') {
        ctx.save();
        ctx.font = '16px "JetBrains Mono", monospace';
        for (const drop of matrixDropsRef.current) {
          drop.y += drop.speed * dt;
          if (drop.y > height + 200) {
            drop.y = -100;
            drop.speed = 120 + Math.random() * 260;
          }
          for (let c = 0; c < drop.length; c++) {
            const charY = drop.y - c * 20;
            if (charY < -20 || charY > height + 20) continue;
            const alpha = c === 0 ? 0.95 : Math.max(0.08, 0.5 - (c / drop.length) * 0.5);
            ctx.fillStyle = c === 0 ? theme.accent : theme.primary;
            ctx.globalAlpha = alpha * 0.8;
            ctx.shadowColor = theme.primary;
            ctx.shadowBlur = c === 0 ? 8 : 2;
            const ch = drop.chars[c % drop.chars.length];
            ctx.fillText(ch, drop.x, charY);
          }
        }
        ctx.restore();
      }

      // --- STYLE: 3D WARP STARS ---
      if (bgStyle === 'stars') {
        ctx.save();
        const cx = width * 0.5;
        const cy = height * 0.44;
        const warpSpeed = 300 + metrics.bass * 500;

        for (const star of starsRef.current) {
          star.pz = star.z;
          star.z -= warpSpeed * dt;
          if (star.z <= 0) {
            star.z = 1000;
            star.pz = 1000;
            star.x = (Math.random() - 0.5) * width * 1.5;
            star.y = (Math.random() - 0.5) * height * 1.5;
          }

          const k = 400 / star.z;
          const px = star.x * k + cx;
          const py = star.y * k + cy;

          const pk = 400 / star.pz;
          const prevX = star.x * pk + cx;
          const prevY = star.y * pk + cy;

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            const size = Math.max(1, (1 - star.z / 1000) * 3.5);
            const alpha = (1 - star.z / 1000) * 0.8;

            ctx.strokeStyle = theme.primary;
            ctx.lineWidth = size * 0.8;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(px, py);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // --- STYLE: SMOKE SIMULATION ("Fumaça" Ávila style) ---
      if (bgStyle === 'smoke' && settings.smokeIntensity > 0) {
        if (smokeRef.current.length < 24 && Math.random() < settings.smokeIntensity * 0.45) {
          smokeRef.current.push({
            x: width * 0.5 + (Math.random() - 0.5) * width * 0.6,
            y: height * 0.55 + (Math.random() - 0.5) * height * 0.3,
            vx: (Math.random() - 0.5) * 14,
            vy: -15 - Math.random() * 20,
            radius: 40 + Math.random() * 60,
            growth: 15 + Math.random() * 25,
            alpha: 0,
            maxAlpha: (0.04 + Math.random() * 0.08) * settings.smokeIntensity,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.4,
            life: 0,
            maxLife: 4 + Math.random() * 3,
          });
        }

        ctx.save();
        for (let i = smokeRef.current.length - 1; i >= 0; i--) {
          const s = smokeRef.current[i];
          s.life += dt;
          if (s.life >= s.maxLife) {
            smokeRef.current.splice(i, 1);
            continue;
          }
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.radius += s.growth * dt;
          s.rotation += s.vRot * dt;

          const lifeProgress = s.life / s.maxLife;
          const fade = lifeProgress < 0.25 ? lifeProgress / 0.25 : 1 - (lifeProgress - 0.25) / 0.75;
          s.alpha = s.maxAlpha * fade;

          const smokeGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
          smokeGrad.addColorStop(0, theme.smokeColor.replace(/[\d.]+\)$/, `${s.alpha * 1.5})`));
          smokeGrad.addColorStop(0.5, theme.smokeColor.replace(/[\d.]+\)$/, `${s.alpha * 0.8})`));
          smokeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = smokeGrad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Cyber Grid Floor (if enabled or if bgStyle === 'grid')
      if (settings.showGrid || bgStyle === 'grid') {
        ctx.save();
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 1;
        ctx.globalAlpha = (bgStyle === 'grid' ? 0.22 : 0.08) + metrics.energy * 0.08;

        const horizonY = height * 0.68;
        const gridCols = 18;
        const centerX = width * 0.5;

        for (let i = -gridCols; i <= gridCols; i++) {
          const xTarget = centerX + i * (width / gridCols) * 2;
          ctx.beginPath();
          ctx.moveTo(centerX, horizonY);
          ctx.lineTo(xTarget, height);
          ctx.stroke();
        }

        const numH = 10;
        const timeShift = (now * 0.8) % 1;
        for (let j = 0; j < numH; j++) {
          const norm = (j + timeShift) / numH;
          const y = horizonY + Math.pow(norm, 2.5) * (height - horizonY);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5. Floating Neon Embers / Particles
      if (particlesRef.current.length < settings.particleCount) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: height + Math.random() * 30,
          vx: (Math.random() - 0.5) * 20,
          vy: -30 - Math.random() * 45,
          radius: 1 + Math.random() * 2.2,
          alpha: 0,
          maxAlpha: 0.3 + Math.random() * 0.6,
          color: Math.random() > 0.3 ? theme.primary : theme.secondary,
          life: 0,
          maxLife: 3 + Math.random() * 4,
        });
      }

      ctx.save();
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life += dt;
        if (p.life >= p.maxLife || p.y < -20) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        p.x += (p.vx + Math.sin(now * 2 + p.y * 0.01) * 15) * dt;
        p.y += (p.vy - metrics.bass * 25) * dt;

        const normLife = p.life / p.maxLife;
        const fade = normLife < 0.15 ? normLife / 0.15 : 1 - (normLife - 0.15) / 0.85;
        p.alpha = p.maxAlpha * fade;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (1 + metrics.bass * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 6. Audio Visualizer Pulse Waves
      if (settings.showVisualizer) {
        ctx.save();
        const visRadius = Math.min(width, height) * 0.28;
        const centerX = width * 0.5;
        const centerY = height * 0.44;
        const numBars = 48;

        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2;
          const freqOffset = Math.sin(angle * 3 + now * 4) * 0.25;
          const barHeight = (8 + metrics.energy * 26 + Math.abs(freqOffset) * 18);

          const r1 = visRadius;
          const r2 = visRadius + barHeight;

          const x1 = centerX + Math.cos(angle) * r1;
          const y1 = centerY + Math.sin(angle) * r1;
          const x2 = centerX + Math.cos(angle) * r2;
          const y2 = centerY + Math.sin(angle) * r2;

          ctx.strokeStyle = i % 2 === 0 ? theme.primary : theme.secondary;
          ctx.globalAlpha = 0.25 + metrics.bass * 0.5;
          ctx.shadowColor = theme.primary;
          ctx.shadowBlur = 6;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 7. Shockwaves from beat hits (only if Git logo is enabled)
      if (settings.showGitLogo) {
        ctx.save();
        for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
          const sw = shockwavesRef.current[i];
          sw.radius += dt * 420;
          sw.alpha -= dt * 0.7;

          if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
            shockwavesRef.current.splice(i, 1);
            continue;
          }

          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = sw.alpha;
          ctx.shadowColor = sw.color;
          ctx.shadowBlur = 18;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(width * 0.5, height * 0.44, sw.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 8. MAIN GIT NEON LOGO WITH CAMERA TRANSFORM (only if Git logo is enabled)
      if (settings.showGitLogo) {
        ctx.save();
        const anchorX = width * 0.5;
        const anchorY = height * 0.44;

      ctx.translate(anchorX, anchorY);
      ctx.scale(camScale, camScale);
      ctx.rotate(camRotation);
      ctx.translate(-anchorX + camOffsetX, -anchorY + camOffsetY);

      const logoSize = Math.min(width, height) * 0.28;
      const cornerRadius = logoSize * 0.24;

      // Draw Git Neon Diamond Outer Case (only if enabled)
      if (settings.showGitDiamond) {
        ctx.save();
        ctx.translate(anchorX, anchorY);
        ctx.rotate(Math.PI / 4);

        // Pass A: Wide outer diffuse bloom
        ctx.strokeStyle = theme.glowColor;
        ctx.shadowColor = theme.primary;
        ctx.shadowBlur = theme.glowRadius * focalGlowBoost * (1 + metrics.bass * 0.6);
        ctx.lineWidth = 14;
        ctx.lineJoin = 'round';
        roundRect(ctx, -logoSize * 0.5, -logoSize * 0.5, logoSize, logoSize, cornerRadius);
        ctx.stroke();

        // Pass B: Intense core neon body
        ctx.strokeStyle = theme.primary;
        ctx.shadowColor = theme.secondary;
        ctx.shadowBlur = 12 * focalGlowBoost;
        ctx.lineWidth = 7;
        ctx.lineJoin = 'round';
        roundRect(ctx, -logoSize * 0.5, -logoSize * 0.5, logoSize, logoSize, cornerRadius);
        ctx.stroke();

        // Pass C: Bright white neon inner filament core
        ctx.strokeStyle = theme.accent;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffffff';
        ctx.lineWidth = 2.2;
        roundRect(ctx, -logoSize * 0.5, -logoSize * 0.5, logoSize, logoSize, cornerRadius);
        ctx.stroke();

        ctx.restore(); // Restore diamond rotation
      }

      const nBottom = { x: anchorX - logoSize * 0.04, y: anchorY + logoSize * 0.32 };
      const nTop = { x: anchorX - logoSize * 0.04, y: anchorY - logoSize * 0.30 };
      const nBranchFork = { x: anchorX - logoSize * 0.04, y: anchorY + logoSize * 0.04 };
      const nRight = { x: anchorX + logoSize * 0.28, y: anchorY - logoSize * 0.04 };

      // Draw Main Trunk Line (Bottom to Top)
      drawNeonLine(
        ctx,
        nBottom.x,
        nBottom.y,
        nTop.x,
        nTop.y,
        theme.primary,
        theme.accent,
        6,
        14 * focalGlowBoost
      );

      // Draw Curved Branch Line from Fork to Right Node
      ctx.save();
      ctx.strokeStyle = theme.secondary;
      ctx.shadowColor = theme.secondary;
      ctx.shadowBlur = 16 * focalGlowBoost;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(nBranchFork.x, nBranchFork.y);
      ctx.bezierCurveTo(
        nBranchFork.x + logoSize * 0.12,
        nBranchFork.y,
        nRight.x - logoSize * 0.08,
        nRight.y + logoSize * 0.12,
        nRight.x,
        nRight.y
      );
      ctx.stroke();

      ctx.strokeStyle = theme.accent;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();

      // Animate Laser Sparks along branches
      for (const spark of sparksRef.current) {
        spark.pos = (spark.pos + spark.speed + metrics.bass * 0.004) % 1;

        let sx = 0;
        let sy = 0;
        if (spark.pathId === 'main') {
          sx = nBottom.x + (nTop.x - nBottom.x) * spark.pos;
          sy = nBottom.y + (nTop.y - nBottom.y) * spark.pos;
        } else {
          const t = spark.pos;
          const p0 = nBranchFork;
          const p1 = { x: nBranchFork.x + logoSize * 0.12, y: nBranchFork.y };
          const p2 = { x: nRight.x - logoSize * 0.08, y: nRight.y + logoSize * 0.12 };
          const p3 = nRight;

          const cx = 3 * (p1.x - p0.x);
          const bx = 3 * (p2.x - p1.x) - cx;
          const ax = p3.x - p0.x - cx - bx;

          const cy = 3 * (p1.y - p0.y);
          const by = 3 * (p2.y - p1.y) - cy;
          const ay = p3.y - p0.y - cy - by;

          sx = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0.x;
          sy = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0.y;
        }

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = spark.pathId === 'main' ? theme.primary : theme.secondary;
        ctx.shadowBlur = 14 * focalGlowBoost;
        ctx.beginPath();
        ctx.arc(sx, sy, spark.size * (1 + metrics.treble * 0.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Commit Nodes (Circles with glowing core)
      const nodeRadius = logoSize * 0.11;

      // Draw Node 1: Bottom
      drawNeonNode(
        ctx,
        nBottom.x,
        nBottom.y,
        nodeRadius,
        theme.primary,
        theme.accent,
        focalGlowBoost * (1 + metrics.bass * 0.4)
      );

      // Draw Node 2: Top Trunk
      drawNeonNode(
        ctx,
        nTop.x,
        nTop.y,
        nodeRadius,
        theme.primary,
        theme.accent,
        focalGlowBoost * (1 + metrics.mid * 0.4)
      );

      // Draw Node 3: Right Branch
      drawNeonNode(
        ctx,
        nRight.x,
        nRight.y,
        nodeRadius,
        theme.secondary,
        theme.accent,
        focalGlowBoost * (1 + metrics.treble * 0.5)
      );

      ctx.restore(); // Restore Camera Transform
      }

      // 9. Subtle Scanlines Overlay
      if (settings.showScanlines) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        for (let y = 0; y < height; y += 3) {
          ctx.fillRect(0, y, width, 1);
        }
        ctx.restore();
      }

      // 10. Subtle Vignette
      const vigGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.45,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.72
      );
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, width, height);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [theme, settings, introProgress]);

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      className="w-full h-full object-contain select-none"
    />
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawNeonLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  glowColor: string,
  coreColor: string,
  lineWidth: number,
  blur: number
) {
  ctx.save();
  ctx.strokeStyle = glowColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = blur;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = coreColor;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 4;
  ctx.lineWidth = Math.max(2, lineWidth * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawNeonNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  glowColor: string,
  coreColor: string,
  glowBoost: number
) {
  ctx.save();
  ctx.strokeStyle = glowColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 18 * glowBoost;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.05, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#05070a';
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = coreColor;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
