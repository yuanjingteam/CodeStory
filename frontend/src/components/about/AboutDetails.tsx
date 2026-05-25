'use client';
import { useAuth } from '@/hooks/useAuth';
import {
  FiMonitor,
  FiTarget,
  FiMail,
  FiPhone,
  FiMessageCircle,
} from 'react-icons/fi';
import { BsRobot } from 'react-icons/bs';
import AboutCodeCard from './AboutCodeCard';
import Img from 'next/image';
export default function AboutHero() {
  useAuth();
  return (
    <section
      className="
        flex
        flex-col
        bg-white
        px-8 pt-4
        m-4
        transition-all duration-150
        relative z-10
      "
    >
      <div className="flex justify-center items-center">
        <div className="flex-3 border-2  border-gray-300 rounded-xl p-4">
          <div className="flex flex-col justify-between h-full items-center mb-6">
            <div className="pr-4">
              <h1 className="text-4xl font-extrabold mb-4 text-black  flex items-center gap-2">
                关于 CodeStory <BsRobot className="w-10 h-10 text-purple-600" />
              </h1>
              <p>
                CodeStory 是 一个以 AI
                Agent交互为核心的编程学习平台，致力于重塑传统单向、枯燥且缺乏沉浸感的编程学习方式
              </p>
              <p className=" text-gray-700">
                我们的目标是通过
                CodeStory，帮助用户更高效地学习编程，同时提供一个 fun
                和互动的学习环境。
              </p>
            </div>
          </div>
          {/* 核心优势三块卡片 */}
          <div className="flex justify-start items-center gap-4 mb-4">
            <div className="border-2 rounded-xl border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-[2px] transition-all duration-150 p-5 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center  rounded-full  text-purple-500">
                  <BsRobot className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg">AI 引导学习</h3>
              </div>
              <p className="text-gray-700">智能 AI Agent 陪伴学习</p>
            </div>
            <div className="border-2 rounded-xl border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-[2px] transition-all duration-150 p-5 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center  text-green-600">
                  <FiMonitor className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg">实战驱动</h3>
              </div>
              <p className="text-gray-700">边学边练，学以致用</p>
            </div>
            <div className="border-2 rounded-xl border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-[2px] transition-all duration-150 p-5 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center  text-blue-500">
                  <FiTarget className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg">个性化学习</h3>
              </div>
              <p className="text-gray-700">根据学习情况智能调整</p>
            </div>
          </div>
        </div>
        <div className=" flex-2 w-[1000px]  flex items-center justify-center relative">
          <div className="absolute top-[10px] left-5   flex items-center justify-center">
            <AboutCodeCard />
          </div>
          <div className=" h-[310px] flex items-center justify-center overflow-hidden">
            <Img
              src="/about-robot(2).png"
              alt="about-robot"
              width={700}
              height={700}
              className="object-contain scale-120"
            />
          </div>
        </div>
      </div>
      {/* 联系方式卡片 */}
      <div className="flex justify-start items-center gap-4 my-6">
        {/* 邮箱 */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-gray-500 rounded-lg bg-white ">
          <div className="w-12 h-12 flex items-center justify-center bg-yellow-400 rounded-full border-2 border-yellow-400 mb-2">
            <FiMail className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-800 font-medium text-sm">
            hello@codestory.com
          </p>
          <p className="text-gray-500 text-xs mt-1">邮箱</p>
        </div>

        {/* 电话 */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-gray-500 rounded-lg bg-white ">
          <div className="w-12 h-12 flex items-center justify-center bg-blue-500 rounded-full border-2 border-blue-500 mb-2">
            <FiPhone className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-800 font-medium text-sm">400-400-4000</p>
          <p className="text-gray-500 text-xs mt-1">电话</p>
        </div>
      </div>
      {/* 用户口碑卡片 */}
      <div className="rounded-md bg-blue-50 p-6 mb-6">
        <h2 className=" font-bold mb-2 text-purple-500"># 开发者有话说</h2>
        <p className="text-gray-800">
          我们相信：编程不是死记硬背，而是<strong>有趣、陪伴、可互动</strong>
          的成长过程。 让每个人都能轻松、快乐、真正学会写代码。
        </p>
        <br />
      </div>
    </section>
  );
}
