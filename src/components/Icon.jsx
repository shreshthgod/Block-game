const paths = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  pause: <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>,
  settings: <><path d="m9 3-.6 3-2.6 1-2.5 2 2 2-.1 3-1.9 2 2.6 2 2.5 1 .6 2h6l.6-2 2.5-1 2.6-2-1.9-2-.1-3 2-2-2.5-2-2.6-1L15 3Z" /><circle cx="12" cy="12" r="3" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 8a2.6 2.6 0 0 1 5 .9c0 2-2.5 2.1-2.5 4.1M12 17h.01" /></>,
  crown: <><path d="M3 7 7 10l5-6 5 6 4-3-2 11H5Z" /><path d="M6 21h12" /></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  sound: <><path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  restart: <><path d="M3 10a9 9 0 1 1 1 7M3 4v6h6" /></>,
  sparkle: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z" /></>
};
export function Icon({
  name,
  size = 20
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Brand({
  large = false
}) {
  return <div className={`brand ${large ? 'brand-large' : ''}`}><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>prism<span className="brand-nine">nine</span><span className="brand-dot">.</span></span></div>;
}
