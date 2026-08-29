interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  image: string;
  /** Overlay darkness 0–1, default 0.55 */
  overlay?: number;
}

export function PageHero({ eyebrow, title, subtitle, image, overlay = 0.55 }: PageHeroProps) {
  return (
    <section className="relative h-[100vh] min-h-[340px] max-h-[520px] flex items-end overflow-hidden">
      {/* Background image */}
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover object-center scale-105"
        style={{ animation: "heroZoom 12s ease-in-out infinite alternate" }}
      />

      {/* Gradient overlays */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,${overlay}) 0%, rgba(0,0,0,${overlay * 0.4}) 60%, rgba(0,0,0,0.1) 100%)`,
        }}
      />
      {/* subtle colored tint */}
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{ background: "linear-gradient(135deg, rgba(100,70,40,0.3) 0%, transparent 70%)" }}
      />

      {/* Noise texture for luxury feel */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-6 md:px-10 pb-12">
        {/* Thin gold line above */}
        <div className="w-8 h-px bg-primary mb-4 opacity-80" />

        <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-primary/90 mb-3 drop-shadow-md">
          {eyebrow}
        </p>
        <h1
          className="text-4xl md:text-6xl font-serif font-bold text-white leading-tight drop-shadow-lg"
          style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-white/70 text-sm md:text-base max-w-md leading-relaxed drop-shadow-md">
            {subtitle}
          </p>
        )}
      </div>

      {/* Bottom fade into page background */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />

      <style>{`
        @keyframes heroZoom {
          from { transform: scale(1.05); }
          to   { transform: scale(1.12); }
        }
      `}</style>
    </section>
  );
}
