import { cn } from "@/lib/utils";

/**
 * aijob brand mark: a verified résumé card. Icon only, so it can be dropped
 * into any navbar, sidebar or footer without changing surrounding typography.
 * Uses semantic colours and stays monochrome in both light and dark themes.
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
      aria-label="aijob"
      className={cn("shrink-0", className)}
    >
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-foreground" />
      <rect
        x="8"
        y="6.5"
        width="16"
        height="19"
        rx="2"
        fill="none"
        stroke="var(--background)"
        strokeWidth="1.8"
      />
      <path
        d="M11.5 11.5h9M11.5 15h9M11.5 18.5h5"
        fill="none"
        stroke="var(--background)"
        strokeOpacity="0.7"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="23" cy="23.5" r="5.2" fill="var(--background)" />
      <path
        d="m20.6 23.4 1.6 1.6 3.2-3.3"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
