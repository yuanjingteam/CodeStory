'use client';
import { FiCode } from 'react-icons/fi';
import type { MetadataValue } from '@/types/lesson-manage';

interface CodeTemplateConfigProps {
  metadata: MetadataValue;
  onChange: (metadata: { codeTemplate: string }) => void;
}

export default function CodeTemplateConfig({ metadata, onChange }: CodeTemplateConfigProps) {
  const codeTemplate = (() => {
    if (typeof metadata === 'object' && metadata !== null && 'codeTemplate' in metadata) {
      return (metadata as Record<string, unknown>).codeTemplate as string || '';
    }
    return typeof metadata === 'string' ? metadata : '';
  })();

  return (
    <div className="border-2 border-dashed border-orange-300 p-3 rounded-lg bg-orange-50">
      <label className="block text-sm font-bold mb-2 flex items-center gap-1">
        <FiCode className="w-4 h-4" />
        代码模板
      </label>
      <p className="text-xs text-gray-500 mb-2">预填入编辑器的初始代码，学生将在此基础上作答</p>
      <textarea
        value={codeTemplate}
        onChange={e => onChange({ codeTemplate: e.target.value })}
        placeholder={'# 在此编写代码\ndef solve():\n    pass'}
        rows={6}
        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none font-mono text-sm"
      />
    </div>
  );
}
