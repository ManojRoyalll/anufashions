import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-700 text-white hover:bg-brand-800",
        secondary: "bg-white text-slate-800 border border-brand-200 hover:bg-brand-50",
        accent: "bg-accent-500 text-white hover:bg-accent-600",
        ghost: "hover:bg-brand-100 text-slate-700"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 py-1 text-xs",
        lg: "h-11 px-6 py-2"
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
