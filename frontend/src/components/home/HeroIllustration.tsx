export default function HeroIllustration() {
  const codeLines = [
    { color: 'text-purple-400', text: 'const' },
    { color: 'text-yellow-300', text: ' learn ' },
    { color: '', text: '= ' },
    { color: 'text-purple-400', text: 'async' },
    { color: '', text: '() =&gt; {' },
    { color: 'text-gray-400', text: '\n  // AI 驱动学习' },
    { color: 'text-purple-400', text: '\n  const' },
    { color: 'text-yellow-300', text: ' result ' },
    { color: '', text: '= ' },
    { color: 'text-purple-400', text: 'await' },
    { color: '', text: ' ai.teach();' },
    { color: 'text-green-400', text: '\n  return' },
    { color: 'text-yellow-300', text: ' result' },
    { color: '', text: ';\n}' },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Code window */}
      <div className="bg-gray-900 rounded-lg border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-4 hover:translate-y-[4px] hover:shadow-none transition-all duration-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <pre className="text-green-400 text-sm font-mono">
          <code>
            {codeLines.map((line, index) => (
              <span key={index} className={line.color}>
                {line.text}
              </span>
            ))}
          </code>
        </pre>
      </div>
      {/* Bot icon */}
      <div className="absolute -bottom-4 -right-6 bg-white rounded-full border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 hover:translate-y-[4px] hover:shadow-none transition-all duration-200">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-white rounded-full" />
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
        </div>
      </div>
      {/* Code bubble */}
      <div className="absolute -top-6 -right-8 bg-white rounded-lg border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] px-3 py-2 hover:translate-y-[4px] hover:shadow-none transition-all duration-200">
        <span className="text-xs font-mono text-purple-600">&lt;/&gt;</span>
      </div>
    </div>
  );
}
