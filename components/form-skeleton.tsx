export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div
      className="flex max-w-[560px] animate-pulse flex-col gap-4 rounded-md border border-line bg-surface p-4 md:p-6"
      aria-busy="true"
    >
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="h-5 w-32 rounded-sm bg-line" />
          <div className="h-11 rounded-sm bg-line" />
        </div>
      ))}
      <div className="ml-auto h-10 w-40 rounded-pill bg-line" />
    </div>
  );
}
