import React from 'react';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import type { AvatarArt } from '@/lib/avatar';

const PALETTE = {
  male: { bg: '#E3F0FF', shirt: '#2F6FDE', hair: '#2B2B33' },
  female: { bg: '#FDE8EF', shirt: '#D6457A', hair: '#2B2B33' },
  neutral: { bg: '#E8F3EC', shirt: '#137333', hair: '#5B5B66' },
} as const;

const SKIN = '#D9A27E';
const SHOULDERS = 'M10 96 C10 74 28 66 48 66 C68 66 86 74 86 96 Z';
const HAIR_BEHIND_FEMALE =
  'M29 44 C27 24 38 18 48 18 C58 18 69 24 67 44 C67 56 70 64 72 72 C64 70 62 56 62 46 L34 46 C34 56 32 70 24 72 C26 64 29 56 29 44 Z';
const HAIR_FRONT: Record<AvatarArt, string> = {
  male: 'M31 38 C31 24 40 19 48 19 C56 19 65 24 65 38 C61 31 54 29 48 29 C42 29 35 31 31 38 Z',
  female: 'M32 38 C35 28 43 25 48 25 C55 25 63 29 64 38 C57 33 41 31 32 38 Z',
  neutral: 'M32 36 C34 27 41 24 48 24 C55 24 62 27 64 36 C58 32 40 32 32 36 Z',
};

/** Decorative default avatar. Shared artwork: keep identical to portal/admin. */
export default function GenderAvatarArt({ art, size }: { art: AvatarArt; size: number }) {
  const p = PALETTE[art];
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" accessible={false}>
      <Defs>
        <ClipPath id={`avatar-clip-${art}`}>
          <Circle cx={48} cy={48} r={48} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#avatar-clip-${art})`}>
        <Circle cx={48} cy={48} r={48} fill={p.bg} />
        <Path d={SHOULDERS} fill={p.shirt} />
        <Rect x={42} y={54} width={12} height={14} rx={5} fill={SKIN} />
        {art === 'female' ? <Path d={HAIR_BEHIND_FEMALE} fill={p.hair} /> : null}
        <Circle cx={48} cy={40} r={16} fill={SKIN} />
        <Path d={HAIR_FRONT[art]} fill={p.hair} />
      </G>
    </Svg>
  );
}
