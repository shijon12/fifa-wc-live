'use client';

import { useEffect, useState } from 'react';

const resolvedImages = new Map<string, string | null>();
const pendingImages = new Map<string, Promise<string | null>>();

export function PlayerImage({
  name,
  src,
  className,
  fallbackClassName = '',
}: {
  name: string;
  src: string | null;
  className: string;
  fallbackClassName?: string;
}) {
  const [image, setImage] = useState<string | null>(src);
  const [resolved, setResolved] = useState(Boolean(src));

  useEffect(() => {
    if (src) return;
    const cached = resolvedImages.get(name);
    if (cached !== undefined) {
      const initialize = window.setTimeout(() => {
        setImage(cached);
        setResolved(true);
      }, 0);
      return () => window.clearTimeout(initialize);
    }
    let request = pendingImages.get(name);
    if (!request) {
      request = fetch(`/api/player-image?name=${encodeURIComponent(name)}`)
        .then((response) => response.ok ? response.json() as Promise<{ image: string | null }> : { image: null })
        .then((data) => data.image)
        .catch(() => null);
      pendingImages.set(name, request);
    }
    let active = true;
    request.then((url) => {
      resolvedImages.set(name, url);
      pendingImages.delete(name);
      if (active) {
        setImage(url);
        setResolved(true);
      }
    });
    return () => { active = false; };
  }, [name, src]);

  if (image) {
    return <span role="img" aria-label={name} className={`${className} bg-contain bg-bottom bg-no-repeat`} style={{ backgroundImage: `url("${image}")` }} />;
  }

  return (
    <span className={`${className} ${fallbackClassName} grid place-items-center font-black text-white/20`}>
      {resolved ? initials(name) : <span className="h-5 w-5 animate-pulse rounded-full bg-white/10" />}
    </span>
  );
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('');
}
