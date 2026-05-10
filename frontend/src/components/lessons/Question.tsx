'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exerciseApi } from '@/app/api/courses/exercise';
import type { LessonDetailData } from '@/types/lesson-detail';
import type { ExerciseDetailData } from '@/types/exercise';
import MarkdownContent from './MarkdownContent';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';

interface QuestionProps {
  data: LessonDetailData;
}

export default function Question({ data }: QuestionProps) {
  const router = useRouter();
  const [exerciseData, setExerciseData] = useState<ExerciseDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const currentChapter = data?.catalog.find(ch =>
    ch.lessons.some(l => l.status === 1)
  );

  const currentLessonTitle = currentChapter?.lessons.find(l => l.status === 1)?.title;
  const currentLessonId = currentChapter?.lessons.find(l => l.status === 1)?.id;

  useEffect(() => {
    const fetchExercise = async () => {
      if (!currentLessonId) return;

      try {
        setLoading(true);
        const response = await exerciseApi.getDetail(currentLessonId);
        setExerciseData(response);
      } catch (error) {
        console.error('获取题目详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [currentLessonId]);

  const currentChapterTitle = currentChapter?.title || '第 1 章 Python 基础语法';

  return (
    <div className="h-full flex flex-col">
      {/* 导航栏 */}
      <div className="bg-purple-600 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold">{currentChapterTitle}</span>
          <span className="text-yellow-300">›</span>
          <span>{currentLessonTitle}</span>
        </div>
        <button
          onClick={() => router.back()}
          className="border-2 border-black px-3 py-1 bg-green-600 text-white font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
        >
          <span>‹</span>
          <span>返回</span>
        </button>
      </div>

      {/* 题目内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-bold">加载中...</span>
          </div>
        ) : !exerciseData ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-bold">加载失败</span>
          </div>
        ) : (
          <>
            {/* 上半部分：固定渲染题干 Markdown */}
            <div className="flex-1 overflow-auto border-b-4 border-black p-4">
              <MarkdownContent content={exerciseData.content} />
            </div>

            {/* 下半部分：根据题型动态切换 */}
            <div className="flex-2 overflow-auto p-4">
              {exerciseData.type === 'choice' ? (
                <ChoiceQuestion exercise={exerciseData} />
              ) : exerciseData.type === 'code' ? (
                <CodeQuestion exercise={exerciseData} />
              ) : (
                <div className="text-center font-bold">暂不支持的题型</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 选择题组件
interface ChoiceQuestionProps {
  exercise: ExerciseDetailData;
}

function ChoiceQuestion({ exercise }: ChoiceQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const options = (exercise.metadata as any)?.options || [];

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  return (
    <div className="space-y-2">
      {/* 标题和提示按钮同行 */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg">请选择正确答案：</div>
        <button className="py-2 px-4 bg-yellow-400 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
          💡 提示
        </button>
      </div>

      {/* 选项列表 */}
      {options.map((option: string, index: number) => {
        const optionLabel = String.fromCharCode(65 + index);
        const isSelected = selectedOption === optionLabel;

        return (
          <div
            key={index}
            onClick={() => handleSelect(optionLabel)}
            className={`py-3 px-4 border-4 border-black cursor-pointer transition-all font-bold ${
              isSelected
                ? 'bg-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]'
                : 'bg-white hover:bg-gray-100 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]'
            }`}
          >
            <span className="mr-2">{optionLabel}.</span>
            <span>{option.replace(/^[A-D]\.\s*/, '')}</span>
          </div>
        );
      })}

      {/* 按钮组：上一题、提交答案、下一题 */}
      <div className="grid grid-cols-5 gap-2 mt-4">
        <button className="col-span-1 py-3 bg-gray-400 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-1">
          <span>‹</span>
          <span>上一题</span>
        </button>
        <button className="col-span-3 py-3 bg-green-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-lg">
          提交答案
        </button>
        <button className="col-span-1 py-3 bg-gray-400 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-1">
          <span>下一题</span>
          <span>›</span>
        </button>
      </div>
    </div>
  );
}

// 编程题组件
interface CodeQuestionProps {
  exercise: ExerciseDetailData;
}

function CodeQuestion({ exercise }: CodeQuestionProps) {
  const [userCode, setUserCode] = useState('');

  useEffect(() => {
    const code = (exercise.metadata as any)?.codeTemplate || '';
    setUserCode(code);
  }, [exercise]);

  return (
    <div className="flex flex-col h-full">
      <div className="font-bold text-lg mb-4">请编写代码：</div>

      <div className="flex-1 min-h-0 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
        <CodeMirror
          value={userCode}
          onChange={setUserCode}
          height="100%"
          theme="dark"
          extensions={[
            python(),
            EditorView.lineWrapping
          ]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <button className="w-full py-3 mt-4 bg-green-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
        运行代码
      </button>
    </div>
  );
}