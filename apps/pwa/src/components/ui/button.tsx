"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#7f8a44] text-white hover:bg-[#6a7338]",
        secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-100",
        ghost: "hover:bg-slate-100 text-slate-700"
      },
      size: {
        default: "h-11 px-5 text-base",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-7 text-lg"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
