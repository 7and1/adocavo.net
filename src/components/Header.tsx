"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CreditBalance } from "@/components/CreditBalance";
import { Menu, X, Sparkles } from "lucide-react";

export interface HeaderProps {
  showCredits?: boolean;
}

export function Header({ showCredits = true }: HeaderProps) {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary-500 focus:text-white focus:rounded-md focus:m-4"
      >
        Skip to main content
      </a>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl text-gray-900 hover:text-primary-600 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            onClick={closeMobileMenu}
          >
            <Sparkles className="h-6 w-6 text-primary-500" aria-hidden="true" />
            <span className="hidden sm:inline">Adocavo</span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-6"
            aria-label="Main navigation"
          >
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 px-2 py-1"
            >
              Hook Library
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 px-2 py-1"
            >
              Blog
            </Link>
            {session && (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 px-2 py-1"
              >
                My Scripts
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {showCredits && session && <CreditBalance />}

            {status === "loading" ? (
              <div
                className="h-9 w-20 bg-gray-100 animate-pulse rounded-md"
                aria-hidden="true"
              />
            ) : session ? (
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            ) : (
              <Button size="sm" onClick={() => signIn()}>
                Sign in
              </Button>
            )}

            <button
              type="button"
              className="md:hidden p-2 text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">Toggle menu</span>
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={cn(
          "md:hidden border-t border-gray-200 bg-white",
          "transition-all duration-300 ease-in-out",
          mobileMenuOpen
            ? "max-h-64 opacity-100"
            : "max-h-0 opacity-0 pointer-events-none",
        )}
      >
        <nav
          className="flex flex-col px-4 py-4 gap-1"
          aria-label="Mobile navigation"
        >
          <Link
            href="/"
            className="px-3 py-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={closeMobileMenu}
          >
            Hook Library
          </Link>
          <Link
            href="/blog"
            className="px-3 py-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={closeMobileMenu}
          >
            Blog
          </Link>
          {session && (
            <Link
              href="/dashboard"
              className="px-3 py-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={closeMobileMenu}
            >
              My Scripts
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
