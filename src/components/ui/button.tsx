import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-normal transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.975] motion-reduce:active:scale-100 motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/40 focus-visible:ring-[3px] focus-visible:ring-offset-0 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--vvisa-shadow-sm)] hover:bg-[var(--vvisa-primary-hover)] hover:shadow-[var(--vvisa-shadow-md)]",
        brand:
          "text-primary-foreground shadow-[var(--vvisa-shadow-sm)] bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklab,var(--primary)_72%,var(--vvisa-info)))] hover:shadow-[0_16px_40px_color-mix(in_oklab,var(--primary)_32%,transparent)] hover:brightness-[1.06]",
        subtle:
          "bg-vvisa-surface-2 text-foreground hover:bg-accent",
        destructive:
          "bg-destructive text-white shadow-[var(--vvisa-shadow-sm)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-vvisa-border bg-vvisa-surface shadow-[var(--vvisa-shadow-sm)] hover:bg-vvisa-surface-2 hover:text-foreground dark:bg-vvisa-surface dark:hover:bg-vvisa-surface-2",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--vvisa-shadow-sm)] hover:bg-accent",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/70",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-4",
        xl: "h-13 rounded-xl px-7 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
