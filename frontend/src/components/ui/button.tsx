import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md border text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700/30 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-blue-700 bg-blue-700 text-white hover:bg-blue-800",
        outline: "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        ghost:
          "border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
        destructive: "border-rose-600 bg-rose-600 text-white hover:bg-rose-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-11 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
