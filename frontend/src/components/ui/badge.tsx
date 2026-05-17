import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700",
        scheduled: "bg-blue-100 text-blue-800",
        waiting: "bg-amber-100 text-amber-800",
        inprogress: "bg-indigo-100 text-indigo-800",
        completed: "bg-emerald-100 text-emerald-800",
        cancelled: "bg-rose-100 text-rose-800",
        noshow: "bg-slate-200 text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
