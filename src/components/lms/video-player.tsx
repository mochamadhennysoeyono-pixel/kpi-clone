// src/components/lms/video-player.tsx
"use client";

import * as React from 'react';

interface VideoPlayerProps {
  videoId: string;
  hideControls?: boolean;
}

export function VideoPlayer({ videoId, hideControls }: VideoPlayerProps) {
  const controlsParam = hideControls ? 'controls=0' : 'controls=1';
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&${controlsParam}&allowfullscreen=1`;

  return (
    <div className="relative aspect-video">
      <iframe
        key={videoId} // Key ensures component remounts ONLY if videoId changes
        width="100%"
        height="100%"
        src={embedUrl}
        title="Embedded YouTube Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="rounded-md border"
      ></iframe>
    </div>
  );
}
