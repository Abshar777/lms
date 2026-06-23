'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 select-none whitespace-nowrap',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-[#FF6B1A] to-[#FF8C42] text-white shadow-[0_4px_20px_rgba(255,107,26,0.30)] hover:shadow-[0_8px_28px_rgba(255,107,26,0.40)] hover:-translate-y-0.5 active:translate-y-0',
        secondary:
          'bg-[#2F6BFF] text-white shadow-[0_4px_20px_rgba(47,107,255,0.24)] hover:bg-[#1A53E0] hover:shadow-[0_8px_28px_rgba(47,107,255,0.34)] hover:-translate-y-0.5 active:translate-y-0',
        outline:
          'border border-[#E4E7ED] bg-white text-[#0D0F1A] hover:bg-[#F4F5F8] hover:border-[#CDD0DA] active:bg-[#EDEEF2]',
        'outline-primary':
          'border border-[rgba(255,107,26,0.4)] bg-[rgba(255,107,26,0.06)] text-[#FF6B1A] hover:bg-[rgba(255,107,26,0.12)] hover:border-[rgba(255,107,26,0.6)]',
        ghost:
          'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#0D0F1A] active:bg-[#EDEEF2]',
        'ghost-danger':
          'text-[#EF4444] hover:bg-[#FEE2E2] active:bg-[#FECACA]',
        destructive:
          'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[0_4px_16px_rgba(239,68,68,0.25)] hover:-translate-y-0.5 active:translate-y-0',
        link:
          'text-[#FF6B1A] underline-offset-4 hover:underline p-0 h-auto shadow-none',
        dark:
          'bg-[#0D0F1A] text-white hover:bg-[#1E2235] shadow-card hover:-translate-y-0.5 active:translate-y-0',
      },
      size: {
        default:   'h-10 px-5 py-2.5',
        sm:        'h-8 px-3 py-1.5 text-xs rounded-lg',
        lg:        'h-12 px-6 py-3 text-base',
        xl:        'h-14 px-8 py-4 text-base rounded-2xl',
        icon:      'h-9 w-9 rounded-xl',
        'icon-sm': 'h-7 w-7 rounded-lg text-xs',
        'icon-lg': 'h-11 w-11 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

/** Drop-in for `motion.button` — accepts all Framer Motion props plus Button variants. */
const MotionButton = motion(Button)

export { Button, MotionButton, buttonVariants }
