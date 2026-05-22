// d:\learningforever\front-end\agent\CodeStory\frontend\tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      // 添加自定义阴影
      boxShadow: {
        'neo-brutalism': '8px 8px 0px 0px rgba(0, 0, 0, 1)', // 大阴影
        'neo-brutalism-sm': '4px 4px 0px 0px rgba(0, 0, 0, 1)', // 小阴影
      },
      // 添加隐藏滚动条工具类
      scrollbarHide: {
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        '-ms-overflow-style': 'none',
        'scrollbar-width': 'none',
      },
    },
  },
  plugins: [],
};

export default config;
