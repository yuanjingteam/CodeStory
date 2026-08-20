export default function AboutCodeCard() {
  const codeLines = [
    { color: 'text-gray-400', text: '// 开始编程之旅' },
    { color: '', text: '\n' },
    { color: 'text-green-400', text: 'console' },
    { color: '', text: '.' },
    { color: 'text-yellow-300', text: 'log' },
    { color: '', text: '(' },
    { color: 'text-red-400', text: '"Let\'s code!"' },
    { color: '', text: ');' },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Code window */}
      <div className="rounded-lg border-2 border-black bg-gray-900 p-4 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
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
    </div>
  );
}
