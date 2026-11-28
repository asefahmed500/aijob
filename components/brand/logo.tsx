import { cn } from "@/lib/utils";

/**
 * Joby brand mark: a clean monogram tile with a verification dot.
 * Icon only, semantic colours, monochrome in light and dark themes.
 */
export function Logo({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Joby"
      className={cn("shrink-0", className)}
    >
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-foreground" />
      <path
        d="M11.5 9.5v10.2a4.3 4.3 0 0 0 8.6 0"
        fill="none"
        stroke="var(--background)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M11.5 9.5h3.2"
        fill="none"
        stroke="var(--background)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="23.5" cy="9.5" r="2.6" fill="var(--background)" />
    </svg>
  );
}
