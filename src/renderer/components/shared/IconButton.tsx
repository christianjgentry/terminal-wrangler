import { type ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'filled'
  size?: 'sm' | 'md'
}

export function IconButton({
  variant = 'ghost',
  size = 'sm',
  className = '',
  children,
  ...props
}: IconButtonProps): JSX.Element {
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-40'
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
  const variantClasses =
    variant === 'ghost'
      ? 'text-surface-400 hover:text-white hover:bg-white/10'
      : 'bg-accent/20 text-accent-light hover:bg-accent/30'

  return (
    <button className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  )
}
