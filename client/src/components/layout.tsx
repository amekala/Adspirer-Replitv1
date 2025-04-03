import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, Menu, UserCircle } from "lucide-react";
import { useState } from "react";
import { AnimatedBackground } from "./animated-background";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/");
  };

  const closeSheet = () => setIsOpen(false);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Adspirer
          </Link>

          <div className="flex items-center gap-4">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {/* Only show About Us and Privacy links when not on the chat page */}
              {!location.startsWith('/chat') && (
                <>
                  <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                    About Us
                  </Link>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </>
              )}
              
              {/* Show Dashboard link when on chat page */}
              {location.startsWith('/chat') && user && (
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              )}

              {/* User Menu for Desktop */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20">
                      <UserCircle className="h-5 w-5" />
                      {user.email}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-md border-white/20">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/chat">AI Chat</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                      className="cursor-pointer"
                      aria-label="Logout"
                    >
                      {logoutMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Auth Button for Desktop */}
              {!user && !isLoading && (
                <Button asChild className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0">
                  <Link href="/auth">Get Started</Link>
                </Button>
              )}

              {/* Loading State */}
              {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>

            {/* Mobile Navigation Links */}
            <div className="flex items-center md:hidden">
              {user && (
                <Link href="/chat" className="flex items-center gap-1 mr-3 text-sm font-medium bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white rounded-full px-3 py-1">
                  AI Chat
                </Link>
              )}
            </div>

            {/* Mobile Menu Trigger */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-background/95 backdrop-blur-md border-white/20">
                <SheetHeader>
                  <SheetTitle className="text-left bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-8">
                  <Link href="/" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                    Home
                  </Link>
                  
                  {/* Only show About Us and Privacy when not on chat page */}
                  {!location.startsWith('/chat') && (
                    <>
                      <Link href="/about" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                        About Us
                      </Link>
                      <Link href="/privacy" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                        Privacy
                      </Link>
                    </>
                  )}
                  
                  {user ? (
                    <>
                      <Link href="/dashboard" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                        Dashboard
                      </Link>
                      <Link href="/chat" onClick={closeSheet} className="flex items-center gap-2 text-white font-medium">
                        <span className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-1 rounded-full">AI Chat</span>
                      </Link>
                      <Link href="/settings" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          closeSheet();
                        }}
                        className="text-left text-muted-foreground hover:text-foreground transition-colors"
                        disabled={logoutMutation.isPending}
                        aria-label="Logout"
                      >
                        {logoutMutation.isPending ? (
                          <span className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging out...
                          </span>
                        ) : (
                          "Logout"
                        )}
                      </button>
                    </>
                  ) : (
                    <Link href="/auth" onClick={closeSheet} className="text-gradient bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-medium">
                      Get Started
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)] relative z-10">{children}</main>
    </div>
  );
}