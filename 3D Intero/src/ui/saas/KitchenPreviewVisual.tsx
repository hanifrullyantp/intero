/** Self-contained kitchen preview (no external images). */
export default function KitchenPreviewVisual({
  variant = 0,
  className = '',
  animate = false,
}: {
  variant?: number;
  className?: string;
  animate?: boolean;
}) {
  const v = variant % 4;
  return (
    <div
      className={`saas-kitchen-preview ${animate ? 'saas-kitchen-preview--animate' : ''} ${className}`}
      data-variant={v}
      aria-hidden
    >
      <div className="saas-kp-floor" />
      <div className="saas-kp-wall" />
      <div className="saas-kp-cab-base" />
      <div className="saas-kp-cab-upper" />
      {v >= 1 && <div className="saas-kp-island" />}
      {v >= 2 && <div className="saas-kp-hood" />}
      {v >= 3 && <div className="saas-kp-window" />}
      <div className="saas-kp-counter" />
    </div>
  );
}
