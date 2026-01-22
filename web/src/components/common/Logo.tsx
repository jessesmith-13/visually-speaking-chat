interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", size = "md" }: LogoProps) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizes[size]} flex-shrink-0`}>
        <img
          src="/visually-speaking-logo.png"
          alt="Visually Speaking Logo"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}

export function LogoWithText({ className = "", size = "md" }: LogoProps) {
  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={size} />
      <div className="flex flex-col leading-tight">
        <span
          className={`${textSizes[size]} font-bold text-gray-900 dark:text-white`}
        >
          Visually Speaking
        </span>
      </div>
    </div>
  );
}
