import { type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-text-secondary mb-1.5",
        className
      )}
      {...props}
    />
  );
}

export { Label };
