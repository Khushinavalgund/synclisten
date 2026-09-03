import { cn } from "@/lib/utils";

/** Bold rounded play-button mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="7"
        fill="currentColor"
      />
      <path
        d="M9.4 7.9v8.2c0 .6.7 1 1.2.7l6.4-4.1c.4-.3.4-.9 0-1.2l-6.4-4.1c-.5-.3-1.2.1-1.2.5z"
        fill="var(--background)"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <Mark className={cn("size-6 text-primary", markClassName)} />
      <span className="text-[16px] font-bold tracking-tight text-foreground">
        MyMusic
      </span>
    </span>
  );
}