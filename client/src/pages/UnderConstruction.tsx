import { Construction } from "lucide-react";

export default function UnderConstruction() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Logo */}
        <div className="mb-8">
          <img
            src="https://rs.rtsg.org/whiteandredrtsg_c075c4b3.png"
            alt="RTSG"
            className="w-24 h-24 mx-auto mb-6 opacity-90"
          />
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Construction className="w-8 h-8 text-primary" />
        </div>

        {/* Text */}
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
          Under Construction
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          We're building something great. RTSG will be available soon. Check back later.
        </p>

        {/* Decorative line */}
        <div className="mt-8 w-16 h-0.5 bg-primary/40 mx-auto rounded-full" />
      </div>
    </div>
  );
}
