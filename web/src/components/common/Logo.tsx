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
      {/* ASL Hand Logo */}
      <div className={`${sizes[size]} flex-shrink-0`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Video camera circle background */}
          <circle cx="50" cy="50" r="48" fill="#3B82F6" />
          <circle cx="50" cy="50" r="48" stroke="#2563EB" strokeWidth="2" />

          {/* ASL "I Love You" hand sign */}
          {/* Palm */}
          <path
            d="M 35 55 Q 35 45 40 40 L 45 35 Q 50 32 55 35 L 60 40 Q 65 45 65 55 L 65 65 Q 63 70 58 72 L 42 72 Q 37 70 35 65 Z"
            fill="white"
            stroke="white"
            strokeWidth="1"
          />

          {/* Thumb (up and left) */}
          <path
            d="M 40 40 Q 35 38 32 35 L 28 28 Q 27 24 28 22 Q 30 20 33 21 L 38 25 Q 42 30 42 35 Z"
            fill="white"
            stroke="white"
            strokeWidth="1"
          />

          {/* Index finger (straight up) */}
          <path
            d="M 45 35 Q 44 30 44 25 L 44 15 Q 44 12 46 11 Q 48 10 50 11 Q 52 12 52 15 L 52 25 Q 52 30 51 35 Z"
            fill="white"
            stroke="white"
            strokeWidth="1"
          />

          {/* Pinky finger (up and right) */}
          <path
            d="M 60 40 Q 62 35 65 30 L 70 22 Q 71 19 73 18 Q 75 18 77 20 Q 78 22 77 25 L 72 33 Q 68 38 65 42 Z"
            fill="white"
            stroke="white"
            strokeWidth="1"
          />

          {/* Video play icon overlay (small triangle) */}
          <path d="M 48 58 L 48 52 L 54 55 Z" fill="#3B82F6" />
        </svg>
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
