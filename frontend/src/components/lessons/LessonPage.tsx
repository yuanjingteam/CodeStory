'use client';
import Question from './Question';
import Chat from './Chat';
import Content from './Content';

export default function LessonPage() {
  return (
    <div className="flex gap-3 p-3 h-[78vh] overflow-hidden">
      <div 
        className="w-64 flex-shrink-0 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white"
        style={{ flex: '0 0 320px' }}
      >
        <Content />
      </div>

      <div className="flex-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white overflow-hidden">
        <Question />
      </div>

      <div 
        className="w-80 flex-shrink-0 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white"
        style={{ flex: '0 0 320px' }}
      >
        <Chat />
      </div>
    </div>
  );
}