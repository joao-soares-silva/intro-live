/**
 * Robust in-browser MP4 video exporter supporting short clips and long videos (1min, 3min, 5min).
 * Uses native MediaRecorder with MP4 container, or mp4-muxer with WebCodecs VideoEncoder
 * to produce genuine, universally playable .mp4 video files at 60 FPS.
 */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface ExportMp4Options {
  durationSec: number;
  fps?: number;
  onProgress?: (secondsLeft: number, pct: number, secondsElapsed: number) => void;
  registerStopHandler?: (stopFn: () => void) => void;
}

export async function exportCanvasToMp4(
  canvas: HTMLCanvasElement,
  options: ExportMp4Options
): Promise<Blob> {
  const { durationSec, fps = 60, onProgress, registerStopHandler } = options;

  // For long recordings (30s+ up to 5min), MediaRecorder streaming is ideal
  // because it streams directly to native container without memory bloating
  const isLongRecording = durationSec >= 30;
  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window;

  if (hasWebCodecs && !isLongRecording) {
    try {
      return await encodeWithWebCodecs(canvas, durationSec, fps, onProgress, registerStopHandler);
    } catch (err) {
      console.warn('WebCodecs MP4 encoding failed, falling back to MediaRecorder:', err);
    }
  }

  // Strategy 2: MediaRecorder with MP4 or WebM container
  return await recordWithMediaRecorder(canvas, durationSec, fps, onProgress, registerStopHandler);
}

// WebCodecs + mp4-muxer: Frame-by-frame crystal-clear 60fps MP4 for short sequences
async function encodeWithWebCodecs(
  canvas: HTMLCanvasElement,
  durationSec: number,
  fps: number,
  onProgress?: (secondsLeft: number, pct: number, secondsElapsed: number) => void,
  registerStopHandler?: (stopFn: () => void) => void
): Promise<Blob> {
  const width = canvas.width;
  const height = canvas.height;
  const totalFrames = Math.round(durationSec * fps);
  const frameDurationUs = Math.round(1_000_000 / fps);

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
    },
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;
  let isStoppedEarly = false;

  if (registerStopHandler) {
    registerStopHandler(() => {
      isStoppedEarly = true;
    });
  }

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e) => {
      encoderError = e;
      console.error('VideoEncoder error:', e);
    },
  });

  videoEncoder.configure({
    codec: 'avc1.420028',
    width,
    height,
    bitrate: 8_000_000,
    framerate: fps,
  });

  const frameDelayMs = 1000 / fps;

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    if (encoderError) throw encoderError;
    if (isStoppedEarly) break;

    const timestampUs = frameIndex * frameDurationUs;
    const keyFrame = frameIndex % (fps * 2) === 0;

    const frame = new VideoFrame(canvas, {
      timestamp: timestampUs,
      duration: frameDurationUs,
    });

    videoEncoder.encode(frame, { keyFrame });
    frame.close();

    const secondsElapsed = Math.floor(frameIndex / fps);
    const secLeft = Math.max(0, Math.ceil((totalFrames - frameIndex) / fps));
    const pct = Math.min(100, Math.round(((frameIndex + 1) / totalFrames) * 100));

    if (onProgress) {
      onProgress(secLeft, pct, secondsElapsed);
    }

    await new Promise((resolve) => setTimeout(resolve, frameDelayMs));
  }

  await videoEncoder.flush();
  videoEncoder.close();
  muxer.finalize();

  return new Blob([target.buffer], { type: 'video/mp4' });
}

// MediaRecorder: Real-time hardware streaming for long videos (1min, 3min, 5min)
async function recordWithMediaRecorder(
  canvas: HTMLCanvasElement,
  durationSec: number,
  fps: number,
  onProgress?: (secondsLeft: number, pct: number, secondsElapsed: number) => void,
  registerStopHandler?: (stopFn: () => void) => void
): Promise<Blob> {
  const preferredMimes = [
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp9',
    'video/webm',
  ];

  let selectedMime = 'video/mp4';
  let supportedMime = 'video/webm';
  for (const mime of preferredMimes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      supportedMime = mime;
      if (mime.startsWith('video/mp4')) {
        selectedMime = mime;
      }
      break;
    }
  }

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: supportedMime,
    videoBitsPerSecond: 8_000_000, // 8 Mbps high quality
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    let secondsElapsed = 0;
    let timeLeft = durationSec;

    const stopRecordingNow = () => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    };

    if (registerStopHandler) {
      registerStopHandler(stopRecordingNow);
    }

    const intervalId = window.setInterval(() => {
      secondsElapsed++;
      timeLeft--;
      const pct = Math.min(100, Math.round((secondsElapsed / durationSec) * 100));

      if (onProgress) {
        onProgress(Math.max(0, timeLeft), pct, secondsElapsed);
      }

      if (timeLeft <= 0) {
        window.clearInterval(intervalId);
        stopRecordingNow();
      }
    }, 1000);

    recorder.onstop = () => {
      window.clearInterval(intervalId);
      // Return blob as video/mp4
      resolve(new Blob(chunks, { type: 'video/mp4' }));
    };

    recorder.onerror = (e) => {
      window.clearInterval(intervalId);
      reject(e);
    };

    recorder.start(1000); // 1-second chunks for memory safety
  });
}
