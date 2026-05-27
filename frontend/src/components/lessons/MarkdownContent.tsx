'use client';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownContentProps {
  content: string;
}

function CollapsibleTable({ children, ...props }: any) {
  const [isCollapsed, setIsCollapsed] = useState(true); // 默认收起

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-600">📊 表格内容</span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded border border-gray-400 font-medium transition-colors flex items-center gap-1"
        >
          {isCollapsed ? (
            <>
              <span>▼</span>
              <span>展开</span>
            </>
          ) : (
            <>
              <span>▲</span>
              <span>收起</span>
            </>
          )}
        </button>
      </div>
      {!isCollapsed && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300" {...props}>
            {children}
          </table>
        </div>
      )}
    </div>
  );
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  const processedContent = content.replace(/\\n/g, '\n');

  return (
    <div className="markdown-content prose prose-sm max-w-none">
      <style>{`
        .markdown-content li p {
          display: inline;
          margin-bottom: 0;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ node, ref, ...props }) => (
            <h1 className="text-2xl font-black mb-4 text-gray-800" {...props} />
          ),
          h2: ({ node, ref, ...props }) => (
            <h2 className="text-xl font-black mb-3 text-gray-800" {...props} />
          ),
          h3: ({ node, ref, ...props }) => (
            <h3 className="text-lg font-bold mb-2 text-gray-800" {...props} />
          ),
          p: ({ node, ref, ...props }) => (
            <p className="mb-3 text-gray-700 leading-relaxed" {...props} />
          ),
          ul: ({ node, ref, ...props }) => (
            <ul className="list-disc list-inside mb-3 space-y-1" {...props} />
          ),
          ol: ({ node, ref, ...props }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />
          ),
          li: ({ node, ref, ...props }) => (
            <li className="text-gray-700" {...props} />
          ),
          strong: ({ node, ref, ...props }) => (
            <strong className="font-bold text-gray-900" {...props} />
          ),
          em: ({ node, ref, ...props }) => (
            <em className="italic text-gray-700" {...props} />
          ),
          code: ({ node, ref, inline, className, children, ...props }: any) => (
            inline ? (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-red-600" {...props}>
                {children}
              </code>
            ) : (
              <code className="block bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto text-sm font-mono text-gray-800" {...props}>
                {children}
              </code>
            )
          ),
          pre: ({ node, ref, ...props }) => (
            <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto mb-3" {...props} />
          ),
          blockquote: ({ node, ref, ...props }) => (
            <blockquote className="border-l-4 border-purple-500 pl-4 py-2 my-3 bg-purple-50 italic text-gray-700" {...props} />
          ),
          hr: ({ node, ref, ...props }) => (
            <hr className="border-t-2 border-gray-300 my-4" {...props} />
          ),
          table: ({ node, ref, children, ...props }: any) => (
            <CollapsibleTable {...props}>
              {children}
            </CollapsibleTable>
          ),
          th: ({ node, ref, ...props }) => (
            <th className="border border-gray-300 bg-gray-100 px-3 py-2 font-bold text-left" {...props} />
          ),
          td: ({ node, ref, ...props }) => (
            <td className="border border-gray-300 px-3 py-2" {...props} />
          ),
          img: ({ node, ref, ...props }) => (
            <img className="max-w-full h-auto rounded border-2 border-gray-200 my-3" {...props} />
          ),
          a: ({ node, ref, ...props }) => (
            <a className="text-purple-600 underline hover:text-purple-800" {...props} />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}