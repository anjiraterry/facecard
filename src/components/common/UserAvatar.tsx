'use client';

import React from 'react';
import { getUserInitials, getInitialsAvatarSvg } from '@/lib/avatar';

interface UserAvatarProps {
  name?: string | null;
  handle?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm font-bold',
  xl: 'w-16 h-16 text-base font-extrabold',
};

export function UserAvatar({
  name,
  handle,
  src,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const isDicebear = typeof src === 'string' && src.includes('dicebear.com');
  const avatarSrc = src && !isDicebear ? src : getInitialsAvatarSvg(name, handle);

  return (
    <img
      src={avatarSrc}
      alt={name || handle || 'Avatar'}
      className={`rounded-full object-cover shrink-0 select-none ${SIZE_MAP[size]} ${className}`}
    />
  );
}
