import { cn } from "@/lib/utils";

/**
 * aijob brand mark. Icon only — no wordmark — so it can be dropped into any
 * header, navbar or footer without changing the surrounding typography.
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
      <rect x="1" y="1" width="30" height="30" rx="9" className="fill-foreground" />
      <path
        d="M8.5 23.5 15.4 8.8l6.9 14.7"
        fill="none"
        stroke="var(--background)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.8 18.7h7.2"
        fill="none"
        stroke="var(--background)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M23.4 6.8l0.8 2.2 2.2 0.8-2.2 0.8-0.8 2.2-0.8-2.2-2.2-0.8 2.2-0.8z"
        fill="var(--background)"
      />
    </svg>
  );
}
