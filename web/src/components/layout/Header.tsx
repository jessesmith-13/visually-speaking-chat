import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/ui/button";
import { useApp } from "@/app/hooks";
import { signOut } from "@/features/auth/api";
import { LogoWithText } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { toast } from "sonner";
import { useState } from "react";
import {
  Calendar,
  Plus,
  Users,
  Mail,
  User,
  LogOut,
  X,
  Menu,
  Tag,
} from "lucide-react";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      navigate("/");
      toast.success("Logged out successfully");
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => navigate("/")}>
            <LogoWithText size="md" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {user && (
              <>
                <Button
                  variant={
                    location.pathname === "/events" ? "default" : "ghost"
                  }
                  onClick={() => handleNavigate("/events")}
                >
                  <Calendar className="size-4 mr-2" />
                  Events
                </Button>
                {user.isAdmin && (
                  <>
                    <Button
                      variant={
                        location.pathname === "/create-event"
                          ? "default"
                          : "ghost"
                      }
                      onClick={() => handleNavigate("/create-event")}
                    >
                      <Plus className="size-4 mr-2" />
                      Create Event
                    </Button>
                    <Button
                      variant={
                        location.pathname === "/admin/users"
                          ? "default"
                          : "ghost"
                      }
                      onClick={() => handleNavigate("/admin/users")}
                    >
                      <Users className="size-4 mr-2" />
                      Users
                    </Button>
                    <Button
                      variant={
                        location.pathname === "/admin/email"
                          ? "default"
                          : "ghost"
                      }
                      onClick={() => handleNavigate("/admin/email")}
                    >
                      <Mail className="size-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant={
                        location.pathname === "/admin/promo-codes"
                          ? "default"
                          : "ghost"
                      }
                      onClick={() => handleNavigate("/admin/promo-codes")}
                    >
                      <Tag className="size-4 mr-2" />
                      Promo Codes
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <User className="size-4" />
                  <span className="text-sm font-medium">{user.name}</span>
                  {user.isAdmin && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="size-4" />
                </Button>
              </>
            )}
            {!user && (
              <>
                <ThemeToggle />
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </>
            )}
          </nav>

          {/* Mobile Hamburger Menu */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
                )}
              </Button>
            )}
            {!user && (
              <Button onClick={() => navigate("/auth")} size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden mt-4 pb-2 border-t dark:border-gray-800 pt-4">
            <nav className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2">
                <User className="size-4" />
                <span className="text-sm font-medium">{user.name}</span>
                {user.isAdmin && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </div>

              <Button
                variant={location.pathname === "/events" ? "default" : "ghost"}
                onClick={() => handleNavigate("/events")}
                className="justify-start"
              >
                <Calendar className="size-4 mr-2" />
                Events
              </Button>

              {user.isAdmin && (
                <>
                  <Button
                    variant={
                      location.pathname === "/create-event"
                        ? "default"
                        : "ghost"
                    }
                    onClick={() => handleNavigate("/create-event")}
                    className="justify-start"
                  >
                    <Plus className="size-4 mr-2" />
                    Create Event
                  </Button>
                  <Button
                    variant={
                      location.pathname === "/admin/users" ? "default" : "ghost"
                    }
                    onClick={() => handleNavigate("/admin/users")}
                    className="justify-start"
                  >
                    <Users className="size-4 mr-2" />
                    Users
                  </Button>
                  <Button
                    variant={
                      location.pathname === "/admin/email" ? "default" : "ghost"
                    }
                    onClick={() => handleNavigate("/admin/email")}
                    className="justify-start"
                  >
                    <Mail className="size-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant={
                      location.pathname === "/admin/promo-codes"
                        ? "default"
                        : "ghost"
                    }
                    onClick={() => handleNavigate("/admin/promo-codes")}
                    className="justify-start"
                  >
                    <Tag className="size-4 mr-2" />
                    Promo Codes
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                onClick={handleLogout}
                className="justify-start text-red-600 dark:text-red-400"
              >
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
