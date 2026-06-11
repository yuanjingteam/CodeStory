export function ToolBtn({ children, active = false, disabled = false, onClick, title }: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center border-2 border-black rounded active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
        active
          ? 'bg-purple-500 text-white'
          : disabled
            ? 'text-gray-300 border-gray-300 cursor-not-allowed'
            : 'text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

export function Sep() {
  return <div className="w-px h-6 bg-black mx-1" />
}
