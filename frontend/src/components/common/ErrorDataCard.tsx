// components/common/ErrorDataCard.tsx

import { ReactNode } from 'react';

interface ErrorDataCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
}

export default function ErrorDataCard({
  title = '暂无数据',
  description = '当前没有可展示的信息',
  icon,
}: ErrorDataCardProps) {
  return (
    <div className=" rounded-md border-2 border-dashed border-gray-300 bg-white  p-4 m-4 ">
      <div className="flex flex-col items-center justify-center text-center">
        {icon}
        <h3 className=" mt-4 text-lg font-black text-gray-700">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
