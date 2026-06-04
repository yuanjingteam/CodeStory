'use client';

const panels = [
  {
    fill: '#FFD400',
    points: [
      [0, 0],
      [50, 0],
      [55, 46],
      [0, 35],
    ],
  },

  {
    fill: '#00E68A',
    points: [
      [51, 0],
      [100, 20],
      [99, 54],
      [58, 46],
    ],
  },

  {
    fill: 'url(#purpleGlow)',
    points: [
      [0, 36],
      [33, 43],
      [35, 65],
      [0, 75],
    ],
  },

  {
    fill: '#4D9FFF',
    points: [
      [56, 47],
      [100, 56],
      [100, 100],
      [70, 100],
    ],
  },

  {
    fill: '#FF8CC5',
    points: [
      [-87, 100],
      [57, 61],
      [70, 100],
    ],
  },
];

const polygonPoints = (points: number[][]) =>
  points.map(([x, y]) => `${x},${y}`).join(' ');

export default function AuthBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-white">
      <svg
        className="h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* 网点 */}
          <pattern id="dots" width="3" height="3" patternUnits="userSpaceOnUse">
            <circle cx="0.75" cy="0.75" r="0.3" fill="rgba(0,0,0,.18)" />
          </pattern>

          {/* 紫色渐变 */}
          <radialGradient id="purpleGlow">
            <stop offset="0%" stopColor="#d67dff" />
            <stop offset="100%" stopColor="#9d2cff" />
          </radialGradient>
        </defs>

        {/* 色块 */}
        {panels.map((panel, index) => (
          <polygon
            key={index}
            points={polygonPoints(panel.points)}
            fill={panel.fill}
            stroke="black"
            strokeWidth="0.3"
          />
        ))}

        {/* 网点层 */}

        {/* 黄色 */}
        <circle cx="16" cy="12" r="7" fill="url(#dots)" opacity="0.5" />

        {/* 绿色 */}
        <circle cx="86" cy="18" r="8" fill="url(#dots)" opacity="0.5" />

        {/* 紫色 */}
        <circle cx="12" cy="78" r="10" fill="url(#dots)" opacity="0.45" />

        {/* 蓝色 */}
        <circle cx="88" cy="80" r="11" fill="url(#dots)" opacity="0.45" />

        {/* 粉色 */}
        <circle cx="48" cy="87" r="7" fill="url(#dots)" opacity="0.4" />
      </svg>
    </div>
  );
}
