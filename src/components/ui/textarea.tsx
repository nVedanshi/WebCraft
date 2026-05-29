import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "flex w-full rounded-md border bg-background px-3 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input",
        premium: "border-border bg-muted/50 focus:bg-background focus:border-primary/50 focus:glow-primary-sm",
      },
      sizing: {
        default: "min-h-[80px]",
        sm: "min-h-[60px]",
        lg: "min-h-[120px]",
        xl: "min-h-[180px]",
      },
    },
    defaultVariants: {
      variant: "default",
      sizing: "default",
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, sizing, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, sizing, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
