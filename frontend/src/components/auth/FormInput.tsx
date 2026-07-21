'use client';

import { LuEye, LuEyeClosed } from 'react-icons/lu';
import { IoCheckmark, IoClose } from 'react-icons/io5';
interface FormInputProps {
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  error?: string;
  success?: boolean;
  touched?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export default function FormInput({
  label,
  type = 'text',
  value,
  placeholder,
  error,
  success,
  touched,
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword,
  onChange,
  onBlur,
}: FormInputProps) {
  return (
    <div>
      {/* label */}
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-black text-gray-700">{label}</label>

        {touched && error && (
          <span className="text-xs font-bold text-red-500">{error}</span>
        )}
      </div>

      {/* input */}
      <div className="relative">
        <input
          type={
            showPasswordToggle ? (showPassword ? 'text' : 'password') : type
          }
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`
            w-full px-4 py-3
            ${showPasswordToggle ? 'pr-24' : 'pr-16'}
            border-2 
            rounded-sm
            border-gray-500
            bg-white
            font-bold
            outline-none
            transition-all 
            duration-200
            ${error ? 'border-red-500' : ''}
            ${success ? 'border-green-500' : ''}
          `}
        />

        {/* 密码显示切换 */}
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="
              absolute right-12 top-1/2
              -translate-y-1/2
              text-gray-500
              hover:text-black
              transition-colors
            "
          >
            {showPassword ? (
              <LuEye className="w-5 h-5" />
            ) : (
              <LuEyeClosed className="w-5 h-5" />
            )}
          </button>
        )}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {touched && success && (
            <span className="text-green-500 font-black text-lg">
              <IoCheckmark className="w-5 h-5" />
            </span>
          )}
          {touched && error && (
            <span className="text-red-500 font-black text-lg">
              <IoClose className="w-5 h-5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
