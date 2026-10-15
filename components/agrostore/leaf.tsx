export function Leaf({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path className="ag-card-leaf" d="M8 40 A32 32 0 0 1 40 8 A32 32 0 0 1 8 40Z" />
    </svg>
  );
}
