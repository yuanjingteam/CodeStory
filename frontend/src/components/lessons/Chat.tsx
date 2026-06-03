'use client';
import { FiMessageCircle } from 'react-icons/fi';

export default function Chat() {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-purple-600 text-white px-4 py-3 flex items-center gap-2">
        <FiMessageCircle className="w-5 h-5" />
        <span className="font-bold">AI 助手</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-[240px]">
          <div className="text-6xl">🤖</div>

          <h3 className="text-xl font-black text-gray-800">功能开发中</h3>

          <p className="text-sm text-gray-500 leading-relaxed">
            AI 智能助手正在努力学习中，即将为你提供实时答疑、代码辅导和个性化学习建议
          </p>

          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
            <span className="text-xs text-gray-400 font-medium ml-1">敬请期待</span>
          </div>
        </div>
      </div>
    </div>
  );
}
