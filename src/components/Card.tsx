import type { HTMLAttributes } from 'react';

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={`min-w-0 max-w-full rounded-2xl border border-line bg-card shadow-[0_1px_0_rgba(28,25,21,0.04)] ${className}`} {...props}>
      {children}
    </section>
  );
}
