import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/** Shared lockup for navbars and footers: mark + wordmark with one typographic rhythm. */
export function Brand({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Logo size={size} />
      <span className="text-sm font-semibold tracking-tight">Joby</span>
    </span>
  );
}
