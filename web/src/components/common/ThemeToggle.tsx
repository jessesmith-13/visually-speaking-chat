import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/ui/button';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  // Avoid hydration mismatch by only showing icon based on resolvedTheme
  // resolvedTheme is undefined during SSR/initial render
  if (!resolvedTheme) {
    return (
      <Button variant="ghost" size="icon" className="size-9">
        <Sun className="size-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="size-9"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </Button>
  );
}