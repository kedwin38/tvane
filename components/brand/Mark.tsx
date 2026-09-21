// Vector approximation of the Tidevane wave/vane mark, for crisp rendering
// at UI sizes (nav bar, favicons-in-app, loading states) where the raster
// brand asset in /public/brand would soften. The full raster lockup is used
// in marketing contexts (landing hero) instead of this.
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tv-mark-grad" x1="4" y1="34" x2="40" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2E7CF6" />
          <stop offset="1" stopColor="#2FE0CB" />
        </linearGradient>
      </defs>
      <path
        d="M4 30C10 30 12 20 18 20C24 20 26 30 32 30C36.5 30 38.5 25 40 20"
        stroke="url(#tv-mark-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M33 12L40.5 19.5L33 22.5"
        stroke="url(#tv-mark-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
