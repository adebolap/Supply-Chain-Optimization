export default function WeddingBackdrop({ photoUrl }: { photoUrl: string | null }) {
  if (!photoUrl) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt=""
        className="h-full w-full object-cover opacity-25"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, var(--background) 0%, color-mix(in srgb, var(--background) 55%, transparent) 40%, var(--background) 100%)",
        }}
      />
    </div>
  );
}
