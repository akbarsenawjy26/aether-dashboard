import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left Side: 3D Image & Branding (Hidden on mobile) */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <Image
          src="/images/login-bg.png"
          alt="Aether Node Air Quality Monitoring"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay with glassmorphism */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-transparent flex flex-col justify-end p-20">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 backdrop-blur-md border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-bold tracking-widest text-primary uppercase">
                Air Quality Monitoring System
              </span>
            </div>
            <div>
              <h1 className="text-6xl font-black text-white tracking-tighter mb-2">
                Aether Node
              </h1>
              <p className="text-2xl text-white/70 font-medium tracking-tight">
                "Real-time Sense, Zero Risk"
              </p>
            </div>
            <div className="h-1 w-20 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
            <p className="text-white/60 text-base max-w-lg leading-relaxed font-medium">
              Sistem pemantauan kualitas udara cerdas untuk lingkungan industri, pergudangan, dan perkantoran modern.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-32 bg-background relative overflow-hidden">
        {/* Subtle background glow for dark mode */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="mx-auto w-full max-w-sm lg:w-96 relative z-10">
          {children}
        </div>

        {/* Mobile Branding (Show only on small screens) */}
        <div className="lg:hidden mt-8 text-center space-y-2 opacity-60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Aether Node
          </p>
          <p className="text-xs italic text-muted-foreground">
            "Real-time Sense, Zero Risk"
          </p>
        </div>
      </div>
    </div>
  );
}