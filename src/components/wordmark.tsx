import { cn } from "@/lib/utils";

/** Minimal two-circle "duo" mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="9"
        cy="12"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="15"
        cy="12"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.5"
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
      <Mark className={cn("size-5 text-foreground", markClassName)} />
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        Duet
      </span>
    </span>
  );
}