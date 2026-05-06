import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-95 hover:scale-105 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-lg hover:shadow-primary/30",
        outline:
          "border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md hover:shadow-primary/20",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/20",
        ghost:
          "hover:bg-primary/10 hover:text-primary hover:shadow-sm",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-5",
        xs: "h-7 gap-1 px-3 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-4 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-1.5 px-6 text-base",
        icon: "size-10",
        "icon-xs":
          "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8",
        "icon-lg": "size-11",
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
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
