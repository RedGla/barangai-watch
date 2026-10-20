import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return <input
    data-slot="input"
    type={type}
    className={cn('flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-slate-400 focus-visible:border-teal-600 focus-visible:ring-2 focus-visible:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-50', className)}
    {...props}
  />
}
