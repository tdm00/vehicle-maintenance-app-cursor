import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:bg-[#7c2d12]',
  secondary: 'border border-line bg-card text-ink hover:bg-[#f3eadb]',
  danger: 'bg-overdue text-white hover:bg-[#881337]',
  ghost: 'bg-transparent text-ink hover:bg-[#efe6d4]',
} as const;

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
