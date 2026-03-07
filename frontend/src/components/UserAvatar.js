import React, { useMemo } from 'react';

// Deterministic hash from string
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0xFFFFFFFF;
  }
  return Math.abs(h);
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// HSL to hex conversion
function hsl(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateAvatar(username) {
  const h = hash(username);
  const rng = seededRandom(h);

  // Generate a unique hue from the username
  const baseHue = hash(username + 'hue') % 360;
  const bg = hsl(baseHue, 55, 18);
  const primary = hsl(baseHue, 75, 55);
  const secondary = hsl((baseHue + 40) % 360, 65, 65);
  const accent = hsl((baseHue + 180) % 360, 60, 50);

  // Generate unique geometric shapes
  const shapes = [];
  const shapeCount = 3 + (h % 4); // 3-6 shapes

  for (let i = 0; i < shapeCount; i++) {
    const type = rng();
    const cx = 16 + rng() * 32;
    const cy = 16 + rng() * 32;
    const size = 6 + rng() * 16;
    const rotation = rng() * 360;
    const color = rng() > 0.5 ? primary : secondary;
    const opacity = 0.3 + rng() * 0.5;

    if (type < 0.3) {
      // Circle
      shapes.push({ type: 'circle', cx, cy, r: size / 2, fill: color, opacity });
    } else if (type < 0.55) {
      // Hexagon
      const pts = [];
      for (let j = 0; j < 6; j++) {
        const angle = (Math.PI / 3) * j - Math.PI / 2;
        pts.push(`${cx + (size / 2) * Math.cos(angle)},${cy + (size / 2) * Math.sin(angle)}`);
      }
      shapes.push({ type: 'polygon', points: pts.join(' '), fill: color, opacity, rotation, cx, cy });
    } else if (type < 0.75) {
      // Diamond
      const s = size / 2;
      shapes.push({
        type: 'polygon',
        points: `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`,
        fill: color, opacity, rotation, cx, cy
      });
    } else {
      // Triangle
      const s = size / 2;
      shapes.push({
        type: 'polygon',
        points: `${cx},${cy - s} ${cx + s * 0.87},${cy + s * 0.5} ${cx - s * 0.87},${cy + s * 0.5}`,
        fill: color, opacity, rotation, cx, cy
      });
    }
  }

  // Add symmetric ring or arc
  const ringR = 12 + (h % 10);
  const ringStroke = rng() > 0.5 ? primary : accent;

  // Center emblem - always a unique shape
  const emblemType = h % 5;

  return { bg, primary, secondary, accent, shapes, ringR, ringStroke, emblemType };
}

export default function UserAvatar({ username, size = 32, className = '' }) {
  const avatar = useMemo(() => generateAvatar(username || 'user'), [username]);
  const s = 64; // internal viewBox

  return (
    <svg
      data-testid={`avatar-${username}`}
      width={size}
      height={size}
      viewBox={`0 0 ${s} ${s}`}
      className={`rounded-lg shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={`bg-${username}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={avatar.bg} />
          <stop offset="100%" stopColor={avatar.primary} stopOpacity="0.3" />
        </linearGradient>
        <clipPath id={`clip-${username}`}>
          <rect width={s} height={s} rx="8" />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${username})`}>
        {/* Background */}
        <rect width={s} height={s} fill={`url(#bg-${username})`} />

        {/* Geometric shapes */}
        {avatar.shapes.map((shape, i) => {
          const transform = shape.rotation ? `rotate(${shape.rotation} ${shape.cx} ${shape.cy})` : undefined;
          if (shape.type === 'circle') {
            return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} opacity={shape.opacity} />;
          }
          return <polygon key={i} points={shape.points} fill={shape.fill} opacity={shape.opacity} transform={transform} />;
        })}

        {/* Decorative ring */}
        <circle cx={s / 2} cy={s / 2} r={avatar.ringR} fill="none" stroke={avatar.ringStroke} strokeWidth="1.5" opacity="0.35" />

        {/* Center emblem */}
        {avatar.emblemType === 0 && (
          <circle cx={s / 2} cy={s / 2} r="8" fill={avatar.primary} opacity="0.9" />
        )}
        {avatar.emblemType === 1 && (
          <rect x={s / 2 - 6} y={s / 2 - 6} width="12" height="12" rx="2" fill={avatar.primary} opacity="0.9" transform={`rotate(45 ${s / 2} ${s / 2})`} />
        )}
        {avatar.emblemType === 2 && (
          <polygon points={`${s/2},${s/2-9} ${s/2+8},${s/2+5} ${s/2-8},${s/2+5}`} fill={avatar.primary} opacity="0.9" />
        )}
        {avatar.emblemType === 3 && (
          <>
            <circle cx={s / 2} cy={s / 2} r="9" fill={avatar.primary} opacity="0.6" />
            <circle cx={s / 2} cy={s / 2} r="5" fill={avatar.accent} opacity="0.9" />
          </>
        )}
        {avatar.emblemType === 4 && (() => {
          const pts = [];
          for (let j = 0; j < 6; j++) {
            const angle = (Math.PI / 3) * j - Math.PI / 2;
            pts.push(`${s/2 + 8 * Math.cos(angle)},${s/2 + 8 * Math.sin(angle)}`);
          }
          return <polygon points={pts.join(' ')} fill={avatar.primary} opacity="0.9" />;
        })()}

        {/* Initial letter with glow */}
        <text
          x={s / 2}
          y={s / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="18"
          fontFamily="monospace"
          fontWeight="bold"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
        >
          {(username || 'U')[0].toUpperCase()}
        </text>
      </g>
    </svg>
  );
}
