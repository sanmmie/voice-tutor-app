'use client';

import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 28 }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/deltaos-core.svg"
        alt="Syntax"
        width={size}
        height={size}
        className="delta-glow"
      />
      <span className="font-mono text-sm text-terminal-accent">Syntax</span>
    </div>
  );
}