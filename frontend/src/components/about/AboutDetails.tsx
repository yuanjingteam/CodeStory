'use client';
import { useRouter } from 'next/navigation';

export default function AboutHero() {
  const router = useRouter();

  const handleStartLearning = () => {
    router.push('/');
  };

  return (
    <section 
      className="
        border-4 border-black 
        shadow-[4px_4px_0_0_rgba(0,0,0,1)] 
        bg-white 
        p-8
        mx-8 
        transition-all duration-150 
        relative z-10
      "
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-6">
        <div>
          <h1 className="text-4xl font-extrabold mb-4 text-black -mt-8">关于 CodeStory 🤖</h1>
          <p className="text-lg text-gray-800 mb-3">
            一个专治 <span className="font-bold">“看会了一写就废”</span> 的 AI 编程学习搭子。
          </p>
          <p className="text-lg text-gray-700">
            不啰嗦、不枯燥，AI 全程陪练，让你笑着学会写代码 ✨
          </p>
        </div>

        <div className="flex justify-center">
          <svg 
            className="animate-bounce translate-y-8"
            width="240" 
            height="240" 
            viewBox="0 0 240 240" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
          >
            <rect x="80" y="80" width="80" height="100" fill="#4ade80" stroke="black" strokeWidth="4"/>
            <rect x="90" y="30" width="60" height="50" rx="10" fill="white" stroke="black" strokeWidth="4"/>
            <line x1="120" y1="30" x2="120" y2="10" stroke="black" strokeWidth="4"/>
            <circle cx="120" cy="8" r="5" fill="#8b5cf6" stroke="black" strokeWidth="2"/>
            <circle cx="105" cy="50" r="8" fill="#4ade80" stroke="black" strokeWidth="2"/>
            <circle cx="135" cy="50" r="8" fill="#4ade80" stroke="black" strokeWidth="2"/>
            <rect x="60" y="90" width="20" height="10" fill="#4ade80" stroke="black" strokeWidth="2"/>
            <rect x="160" y="90" width="20" height="10" fill="#4ade80" stroke="black" strokeWidth="2"/>
            <rect x="140" y="100" width="60" height="40" rx="2" fill="black" stroke="black" strokeWidth="2"/>
            <rect x="145" y="105" width="50" height="30" fill="#22c55e"/>
            <rect x="153" y="20" width="86" height="40" rx="10" fill="#8b5cf6" stroke="black" strokeWidth="3"/>
            <text x="163" y="45" fill="white" fontSize="12" fontWeight="bold">Let's Code!</text>
            <polygon points="180,70 182,76 188,76 183,80 185,86 180,82 175,86 177,80 172,76 178,76" fill="#8b5cf6"/>
          </svg>
        </div>
      </div>

      {/* 项目初心卡片 */}
      <div className="border-2 border-black shadow-[3px_3px_0_0_#000] bg-green-50 p-6 mb-8 -mt-8">
        <h2 className="text-xl font-bold mb-2">💡 CodeStory 初心</h2>
        <p className="text-gray-800">
          我们相信：编程不是死记硬背，而是<strong>有趣、陪伴、可互动</strong>的成长过程。
          让每个人都能轻松、快乐、真正学会写代码。
        </p>
      </div>

      {/* 核心优势三块卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] p-4 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 flex items-center justify-center bg-purple-500 rounded-full border-2 border-black text-white font-bold">🤖</div>
            <h3 className="font-bold text-lg">AI 引导学习</h3>
          </div>
          <p className="text-gray-700">智能 AI Agent 陪伴学习</p>
        </div>
        <div className="border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] p-5 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 flex items-center justify-center bg-purple-500 rounded-full border-2 border-black text-white font-bold">💻</div>
            <h3 className="font-bold text-lg">实战驱动</h3>
          </div>
          <p className="text-gray-700">边学边练，学以致用</p>
        </div>
        <div className="border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] p-5 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 flex items-center justify-center bg-purple-500 rounded-full border-2 border-black text-white font-bold">🎯</div>
            <h3 className="font-bold text-lg">个性化学习</h3>
          </div>
          <p className="text-gray-700">根据学习情况智能调整</p>
        </div>
      </div>

      {/* 用户口碑卡片 */}
      <div className="border-2 border-black shadow-[3px_3px_0_0_#000] bg-blue-50 p-6 mb-8">
        <h3 className="font-bold text-lg mb-2">⭐ 使用者怎么说</h3>
        <p className="italic text-gray-700">“本来觉得编程超难，在这里跟着练了几天，居然真的能写出小项目了！”</p>
      </div>

      {/* 行动引导按钮 */}
      <div className="text-center mt-4 ">
        <button 
          onClick={handleStartLearning}
          className="
            border-3 border-black bg-purple-500 text-white font-bold text-lg 
            px-8 py-4 shadow-[4px_4px_0_#000] 
            hover:translate-x-1 hover:translate-y-1 hover:shadow-none 
            transition-all duration-150
          "
        >
          🚀 开始免费学习
        </button>
      </div>
    </section>
  );
}