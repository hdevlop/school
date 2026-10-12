export function LandingSectionTitle({ title, suffix }: { title: string; suffix?: string | null }) {
  // Keep translated words intact, including connected Arabic glyphs and spacing.
  const parts = title.split(/(\s+)/);

  return <h2 className="landing-section-title">
    {parts.map((part, index) => {
      if (index === parts.length - 1 && index > 0) {
        return <span className="landing-title-coral" key={index}>{part}</span>;
      }
      if (index === 2 && parts.length > 3) {
        return <span className="landing-title-lilac" key={index}>{part}</span>;
      }
      return part;
    })}
    {suffix && <> · {suffix}</>}
  </h2>;
}
