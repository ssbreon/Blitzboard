export function PlayDiagramIcon({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="5" cy="19" r="2.8" />
      <path d="M8 18.5h9.8q1.2 0 1.2-1.2V10.5" />
      <path d="M15.5 10.5H22.5" />
      <path d="m16.5 2.5 5 5m0-5-5 5" />
    </svg>
  )
}