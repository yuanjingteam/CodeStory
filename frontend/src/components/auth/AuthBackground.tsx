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
    fill: '#9d2cff',
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
        {/* 色块 */}
        {panels.map((panel, index) => (
          <polygon
            key={index}
            points={polygonPoints(panel.points)}
            fill={panel.fill}
            stroke="black"
            strokeWidth="0.3"
            className="hover:translate-x-[1px] hover:translate-y-[1px]  duration-200 "
          />
        ))}
      </svg>
    </div>
  );
}
