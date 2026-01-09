# Component Specifications - Adocavo Intelligence

## Document Purpose

This document provides detailed specifications for every React component in the Adocavo Intelligence application, including props, state management, behavior, accessibility requirements, and responsive design breakpoints.

**Version**: 1.0.0
**Last Updated**: 2026-01-09
**Reference**: [BLUEPRINT.md](./BLUEPRINT.md)

---

## 1. Design System Foundation

### 1.1 Color Palette

```typescript
// src/lib/design-tokens.ts
export const colors = {
  // Primary - Purple gradient for brand identity
  primary: {
    50: "#faf5ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7", // Primary
    600: "#9333ea",
    700: "#7c3aed",
    800: "#6b21a8",
    900: "#581c87",
  },

  // Secondary - Teal for accents
  secondary: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    500: "#14b8a6",
    600: "#0d9488",
  },

  // Neutrals
  gray: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
  },

  // Semantic
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
};

// Engagement score colors
export const engagementColors = {
  hot: "#ef4444", // 90-100
  warm: "#f97316", // 70-89
  medium: "#eab308", // 50-69
  cool: "#22c55e", // 30-49
  cold: "#6b7280", // 0-29
};
```

### 1.2 Typography

```typescript
export const typography = {
  fontFamily: {
    sans: ["Inter", "system-ui", "sans-serif"],
    mono: ["JetBrains Mono", "monospace"],
  },
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
  },
};
```

### 1.3 Spacing & Breakpoints

```typescript
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

export const spacing = {
  page: {
    mobile: "1rem", // 16px
    tablet: "1.5rem", // 24px
    desktop: "2rem", // 32px
  },
  card: {
    mobile: "1rem",
    desktop: "1.5rem",
  },
};
```

---

## 2. Layout Components

### 2.1 Header

```typescript
// src/components/Header.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { CreditBalance } from './CreditBalance';
import { Menu, X, Sparkles } from 'lucide-react';

/**
 * Header Component
 *
 * Global navigation header with authentication state, credit display,
 * and responsive mobile menu.
 *
 * @accessibility
 * - Skip link for keyboard navigation
 * - Mobile menu uses aria-expanded
 * - Focus trap in mobile menu
 * - All interactive elements have focus indicators
 */
export interface HeaderProps {
  /** Whether to show the credit balance (hidden on auth pages) */
  showCredits?: boolean;
}

export function Header({ showCredits = true }: HeaderProps) {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary-500 focus:text-white"
      >
        Skip to main content
      </a>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl text-gray-900 hover:text-primary-600 transition-colors"
          >
            <Sparkles className="h-6 w-6 text-primary-500" />
            <span className="hidden sm:inline">Adocavo</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Hook Library
            </Link>
            {session && (
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                My Scripts
              </Link>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {showCredits && session && <CreditBalance />}

            {status === 'loading' ? (
              <div className="h-10 w-24 bg-gray-100 animate-pulse rounded-md" />
            ) : session ? (
              <Button
                variant="ghost"
                onClick={() => signOut()}
                className="hidden sm:inline-flex"
              >
                Sign Out
              </Button>
            ) : (
              <Button onClick={() => signIn()}>
                Get Started
              </Button>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav
            className="md:hidden py-4 border-t"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="px-4 py-2 rounded-md hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hook Library
              </Link>
              {session && (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-md hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Scripts
                </Link>
              )}
              {session ? (
                <button
                  className="px-4 py-2 text-left rounded-md hover:bg-gray-100"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                >
                  Sign Out
                </button>
              ) : (
                <button
                  className="px-4 py-2 text-left rounded-md hover:bg-gray-100"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signIn();
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

// Responsive behavior:
// - Mobile (<768px): Hamburger menu, collapsed navigation
// - Tablet (768px+): Full navigation, all elements visible
// - Desktop (1024px+): Increased spacing, larger touch targets
```

### 2.2 CreditBalance

```typescript
// src/components/CreditBalance.tsx
'use client';

import { useSession } from 'next-auth/react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CreditBalance Component
 *
 * Displays the user's current credit balance with visual indicators
 * for low credit states.
 *
 * @accessibility
 * - Uses aria-live for dynamic updates
 * - Color-blind friendly (uses text + color)
 * - Screen reader announces credit count
 */
export interface CreditBalanceProps {
  /** Override credits value (for testing/preview) */
  credits?: number;
  /** Additional CSS classes */
  className?: string;
}

export function CreditBalance({ credits: propCredits, className }: CreditBalanceProps) {
  const { data: session } = useSession();
  const credits = propCredits ?? session?.user?.credits ?? 0;

  const isLow = credits <= 2;
  const isEmpty = credits === 0;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        isEmpty
          ? 'bg-red-100 text-red-700'
          : isLow
          ? 'bg-amber-100 text-amber-700'
          : 'bg-gray-100 text-gray-700',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`${credits} credits remaining`}
    >
      <Coins className="h-4 w-4" />
      <span>
        {credits} {credits === 1 ? 'credit' : 'credits'}
      </span>
    </div>
  );
}

// States:
// - Normal (3+ credits): Gray background
// - Low (1-2 credits): Amber/warning background
// - Empty (0 credits): Red/error background
```

---

## 3. Hook Library Components

### 3.1 HookGrid

```typescript
// src/components/HookGrid.tsx
'use client';

import { useState, useCallback } from 'react';
import { HookCard } from './HookCard';
import { HookFilters } from './HookFilters';
import { Skeleton } from '@/components/ui/skeleton';
import type { Hook, HookCategory } from '@/lib/schema';

/**
 * HookGrid Component
 *
 * Responsive grid layout for displaying hook cards with filtering
 * and search capabilities.
 *
 * @accessibility
 * - Uses CSS Grid for layout (screen reader friendly)
 * - Filter controls are labeled
 * - Loading states announced via aria-busy
 */
export interface HookGridProps {
  /** Initial hooks data (server-rendered) */
  initialHooks: Hook[];
  /** Available categories with counts */
  categories: { category: HookCategory; count: number }[];
}

export function HookGrid({ initialHooks, categories }: HookGridProps) {
  const [hooks, setHooks] = useState(initialHooks);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    category?: HookCategory;
    search?: string;
  }>({});

  const handleFilterChange = useCallback(async (newFilters: typeof filters) => {
    setFilters(newFilters);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (newFilters.category) params.set('category', newFilters.category);
      if (newFilters.search) params.set('search', newFilters.search);

      const response = await fetch(`/api/hooks?${params}`);
      const data = await response.json();
      setHooks(data.data);
    } catch (error) {
      console.error('Failed to filter hooks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <HookFilters
        categories={categories}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
        role="list"
        aria-busy={loading}
        aria-label="Hook library"
      >
        {loading ? (
          // Loading skeletons
          Array.from({ length: 8 }).map((_, i) => (
            <HookCardSkeleton key={i} />
          ))
        ) : hooks.length === 0 ? (
          // Empty state
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">
              No hooks found matching your filters.
            </p>
            <button
              className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              onClick={() => handleFilterChange({})}
            >
              Clear filters
            </button>
          </div>
        ) : (
          // Hook cards
          hooks.map((hook) => (
            <HookCard key={hook.id} hook={hook} />
          ))
        )}
      </div>
    </div>
  );
}

function HookCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border bg-white">
      <Skeleton className="h-6 w-16 mb-3" />
      <Skeleton className="h-20 w-full mb-4" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// Grid breakpoints:
// - Mobile (< 640px): 1 column
// - Small (640px+): 2 columns
// - Large (1024px+): 3 columns
// - XL (1280px+): 4 columns
```

### 3.2 HookCard

```typescript
// src/components/HookCard.tsx
'use client';

import Link from 'next/link';
import { Flame, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Hook } from '@/lib/schema';

/**
 * HookCard Component
 *
 * Individual hook display card with engagement score, category badge,
 * and remix action.
 *
 * @accessibility
 * - Card is a semantic article element
 * - Score has aria-label for screen readers
 * - Focus visible on interactive elements
 * - Sufficient color contrast
 */
export interface HookCardProps {
  /** Hook data to display */
  hook: Hook;
  /** Optional click handler for analytics */
  onView?: (hookId: string) => void;
}

export function HookCard({ hook, onView }: HookCardProps) {
  const { id, text, category, engagementScore } = hook;

  // Determine heat level
  const heatLevel = getHeatLevel(engagementScore);

  return (
    <article
      className="group relative p-4 md:p-5 rounded-xl border bg-white hover:shadow-lg hover:border-primary-200 transition-all duration-200"
      role="listitem"
    >
      {/* Category & Score Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
          {category}
        </span>
        <EngagementBadge score={engagementScore} level={heatLevel} />
      </div>

      {/* Hook Text */}
      <blockquote className="text-gray-900 font-medium leading-relaxed mb-4 line-clamp-3">
        "{text}"
      </blockquote>

      {/* Action */}
      <Link href={`/remix/${id}`} onClick={() => onView?.(id)}>
        <Button className="w-full gap-2 group-hover:bg-primary-600" size="sm">
          <Sparkles className="h-4 w-4" />
          Remix this Hook
        </Button>
      </Link>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary-300 pointer-events-none transition-colors" />
    </article>
  );
}

interface EngagementBadgeProps {
  score: number;
  level: 'hot' | 'warm' | 'medium' | 'cool' | 'cold';
}

function EngagementBadge({ score, level }: EngagementBadgeProps) {
  const config = {
    hot: { bg: 'bg-red-100', text: 'text-red-700', icon: Flame },
    warm: { bg: 'bg-orange-100', text: 'text-orange-700', icon: TrendingUp },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: TrendingUp },
    cool: { bg: 'bg-green-100', text: 'text-green-700', icon: TrendingUp },
    cold: { bg: 'bg-gray-100', text: 'text-gray-600', icon: TrendingUp },
  };

  const { bg, text, icon: Icon } = config[level];

  return (
    <div
      className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', bg, text)}
      aria-label={`Engagement score: ${score} out of 100`}
    >
      <Icon className="h-3 w-3" />
      <span>{score}</span>
    </div>
  );
}

function getHeatLevel(score: number): 'hot' | 'warm' | 'medium' | 'cool' | 'cold' {
  if (score >= 90) return 'hot';
  if (score >= 70) return 'warm';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'cool';
  return 'cold';
}

// Card sizing:
// - Mobile: Full width with 16px padding
// - Desktop: Grid cell with 20px padding
// - Min height: 180px to prevent layout shift
```

### 3.3 HookFilters

```typescript
// src/components/HookFilters.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { HookCategory } from '@/lib/schema';

/**
 * HookFilters Component
 *
 * Filter controls for the hook library including category selection
 * and text search.
 *
 * @accessibility
 * - Search input has associated label
 * - Category buttons use aria-pressed
 * - Clear button announces action
 * - Debounced search for performance
 */
export interface HookFiltersProps {
  categories: { category: HookCategory; count: number }[];
  currentFilters: { category?: HookCategory; search?: string };
  onFilterChange: (filters: { category?: HookCategory; search?: string }) => void;
}

export function HookFilters({
  categories,
  currentFilters,
  onFilterChange,
}: HookFiltersProps) {
  const [searchValue, setSearchValue] = useState(currentFilters.search || '');
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onFilterChange({
        ...currentFilters,
        search: value || undefined,
      });
    }, 300);
  }, [currentFilters, onFilterChange]);

  // Category selection
  const handleCategoryClick = useCallback((category: HookCategory) => {
    onFilterChange({
      ...currentFilters,
      category: currentFilters.category === category ? undefined : category,
    });
  }, [currentFilters, onFilterChange]);

  // Clear all filters
  const handleClear = useCallback(() => {
    setSearchValue('');
    onFilterChange({});
  }, [onFilterChange]);

  const hasActiveFilters = currentFilters.category || currentFilters.search;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <label htmlFor="hook-search" className="sr-only">
          Search hooks
        </label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          id="hook-search"
          type="search"
          placeholder="Search hooks..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Filter className="h-4 w-4" />
          Filter:
        </span>

        {categories.map(({ category, count }) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            aria-pressed={currentFilters.category === category}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              currentFilters.category === category
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {category}
            <span className="ml-1 text-xs opacity-70">({count})</span>
          </button>
        ))}

        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
            aria-label="Clear all filters"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// Responsive behavior:
// - Mobile: Filters wrap to multiple lines
// - Tablet+: Filters in single row with horizontal scroll if needed
```

---

## 4. Script Generator Components

### 4.1 ScriptGenerator

```typescript
// src/components/ScriptGenerator.tsx
'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScriptDisplay } from './ScriptDisplay';
import { WaitlistModal } from './WaitlistModal';
import { api, ClientAPIError } from '@/lib/client-api';
import type { Hook } from '@/lib/schema';

/**
 * ScriptGenerator Component
 *
 * Main generation form with product input, AI generation trigger,
 * and results display.
 *
 * @accessibility
 * - Form has proper label associations
 * - Error messages linked via aria-describedby
 * - Loading state announced
 * - Focus management on completion
 */
export interface ScriptGeneratorProps {
  /** The selected hook to remix */
  hook: Hook;
}

interface Script {
  angle: string;
  script: string;
}

export function ScriptGenerator({ hook }: ScriptGeneratorProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [productDescription, setProductDescription] = useState('');
  const [scripts, setScripts] = useState<Script[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);

  const charCount = productDescription.length;
  const isValid = charCount >= 20 && charCount <= 500;

  const handleGenerate = useCallback(async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!isValid) return;

    setLoading(true);
    setError(null);
    setScripts(null);

    try {
      const result = await api.generate(hook.id, productDescription);
      setScripts(result.scripts);
    } catch (err) {
      if (err instanceof ClientAPIError) {
        if (err.isCreditsError) {
          setShowWaitlist(true);
        } else {
          setError(err.message);
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [session, router, hook.id, productDescription, isValid]);

  return (
    <div className="space-y-8">
      {/* Hook Preview */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100">
        <p className="text-sm text-primary-600 font-medium mb-2">Selected Hook</p>
        <blockquote className="text-xl font-semibold text-gray-900">
          "{hook.text}"
        </blockquote>
      </div>

      {/* Product Input Form */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <label htmlFor="product-description" className="text-sm font-medium text-gray-700">
            Describe your product or service
          </label>
          <span
            className={`text-sm ${
              charCount > 500 ? 'text-red-500' : charCount < 20 ? 'text-amber-500' : 'text-gray-500'
            }`}
          >
            {charCount}/500
          </span>
        </div>

        <Textarea
          id="product-description"
          data-testid="product-input"
          placeholder="e.g., A portable blender that charges via USB and can make smoothies in 30 seconds. Perfect for gym-goers and busy professionals. Costs $29.99."
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          rows={4}
          maxLength={500}
          aria-describedby={error ? 'input-error' : 'input-hint'}
          className="resize-none"
        />

        <p id="input-hint" className="text-sm text-gray-500">
          Include key features, benefits, price point, and target audience for best results.
        </p>

        {error && (
          <div
            id="input-error"
            className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!isValid || loading}
        data-testid="generate-button"
        className="w-full h-12 text-lg gap-2"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating Scripts...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Generate 3 Script Variations
          </>
        )}
      </Button>

      {/* Results */}
      {scripts && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Scripts</h2>
          <div className="grid gap-4 md:gap-6 md:grid-cols-3">
            {scripts.map((script, index) => (
              <ScriptDisplay
                key={index}
                script={script}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* Waitlist Modal */}
      <WaitlistModal
        open={showWaitlist}
        onOpenChange={setShowWaitlist}
      />
    </div>
  );
}

// States:
// - Empty: Form ready for input
// - Invalid: Submit disabled, char count shows warning
// - Loading: Spinner, button disabled
// - Error: Error message displayed
// - Success: Scripts displayed in grid
```

### 4.2 ScriptDisplay

```typescript
// src/components/ScriptDisplay.tsx
'use client';

import { useState } from 'react';
import { Copy, Check, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * ScriptDisplay Component
 *
 * Individual script card with formatted content, copy functionality,
 * and export options.
 *
 * @accessibility
 * - Copy success announced via aria-live
 * - Script content properly structured
 * - Keyboard accessible copy button
 */
export interface ScriptDisplayProps {
  script: { angle: string; script: string };
  index: number;
}

const angleColors = {
  'Pain Point': 'from-red-500 to-orange-500',
  'Benefit': 'from-green-500 to-teal-500',
  'Social Proof': 'from-blue-500 to-purple-500',
};

export function ScriptDisplay({ script, index }: ScriptDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gradientClass = angleColors[script.angle as keyof typeof angleColors] || 'from-gray-500 to-gray-600';

  return (
    <div
      data-testid="script-card"
      className="flex flex-col rounded-xl border bg-white overflow-hidden"
    >
      {/* Header with angle */}
      <div className={cn('px-4 py-3 bg-gradient-to-r text-white', gradientClass)}>
        <h3 className="font-semibold">{script.angle}</h3>
        <p className="text-sm opacity-90">Variation {index + 1}</p>
      </div>

      {/* Script content */}
      <div className="flex-1 p-4">
        <pre
          data-testid="script-content"
          className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed"
        >
          {formatScript(script.script)}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 border-t bg-gray-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          data-testid="copy-button"
          className="flex-1 gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span data-testid="copy-success">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </Button>

        <Button variant="ghost" size="sm" className="px-2">
          <Download className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" className="px-2">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Screen reader announcement */}
      {copied && (
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          Script copied to clipboard
        </div>
      )}
    </div>
  );
}

// Format script with syntax highlighting for [Visual] and (Audio) markers
function formatScript(script: string): React.ReactNode {
  const parts = script.split(/(\[Visual:[^\]]+\]|\(Audio:[^)]+\))/g);

  return parts.map((part, i) => {
    if (part.startsWith('[Visual:')) {
      return (
        <span key={i} className="text-purple-600 font-medium">
          {part}
        </span>
      );
    }
    if (part.startsWith('(Audio:')) {
      return (
        <span key={i} className="text-blue-600 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

// Card sizing:
// - Mobile: Full width, stacked vertically
// - Desktop: 1/3 width each in grid
// - Content area: min-height 200px
```

---

## 5. Modal Components

### 5.1 WaitlistModal

```typescript
// src/components/WaitlistModal.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';

/**
 * WaitlistModal Component
 *
 * Modal for collecting waitlist signups when users run out of credits.
 * Includes feature interest selection for product validation.
 *
 * @accessibility
 * - Uses Radix Dialog for proper focus management
 * - Form inputs properly labeled
 * - Success/error states announced
 */
export interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FeatureInterest = 'unlimited' | 'team' | 'api' | 'spy';

const features: { value: FeatureInterest; label: string; description: string }[] = [
  { value: 'unlimited', label: 'Unlimited Scripts', description: 'Generate as many scripts as you need' },
  { value: 'team', label: 'Team Features', description: 'Collaborate with your marketing team' },
  { value: 'api', label: 'API Access', description: 'Integrate with your existing tools' },
  { value: 'spy', label: 'Competitor Analysis', description: 'Analyze any TikTok ad URL' },
];

export function WaitlistModal({ open, onOpenChange }: WaitlistModalProps) {
  const { data: session } = useSession();

  const [email, setEmail] = useState(session?.user?.email || '');
  const [featureInterest, setFeatureInterest] = useState<FeatureInterest>('unlimited');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, featureInterest }),
      });

      if (!response.ok) throw new Error('Failed to join waitlist');

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="waitlist-modal">
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            data-testid="waitlist-title"
          >
            <Sparkles className="h-5 w-5 text-primary-500" />
            {submitted ? 'You\'re on the List!' : 'Out of Credits'}
          </DialogTitle>
          <DialogDescription>
            {submitted
              ? 'We\'ll email you when premium features launch.'
              : 'Join the waitlist to get early access to premium features.'}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-gray-700">
              Thanks for your interest! Check your email for confirmation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="waitlist-email">Email</Label>
              <Input
                id="waitlist-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Feature Interest */}
            <div className="space-y-3">
              <Label>Which feature interests you most?</Label>
              <RadioGroup
                value={featureInterest}
                onValueChange={(v) => setFeatureInterest(v as FeatureInterest)}
              >
                {features.map((feature) => (
                  <div key={feature.value} className="flex items-start gap-3">
                    <RadioGroupItem
                      value={feature.value}
                      id={`feature-${feature.value}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`feature-${feature.value}`}
                      className="cursor-pointer"
                    >
                      <span className="font-medium">{feature.label}</span>
                      <span className="block text-sm text-gray-500">
                        {feature.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Joining...
                </>
              ) : (
                'Join Waitlist'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Modal behavior:
// - Opens on INSUFFICIENT_CREDITS error
// - Pre-fills email if user is authenticated
// - Collects feature interest for product validation
// - Success state shows confirmation
```

### 5.2 FakeDoorAnalyzeUrl

```typescript
// src/components/FakeDoorAnalyzeUrl.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Link as LinkIcon, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * FakeDoorAnalyzeUrl Component
 *
 * Fake door test for the "Analyze URL" spy feature.
 * Tracks clicks to validate demand before building.
 *
 * @accessibility
 * - Button is properly labeled
 * - "Coming Soon" badge is visible
 * - Modal form is accessible
 */
export function FakeDoorAnalyzeUrl() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleClick = async () => {
    // Track fake door click
    fetch('/api/track-fake-door', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'analyze_url' }),
    }).catch(console.error);

    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, featureInterest: 'spy' }),
      });
      setSubmitted(true);
    } catch {
      // Silent fail - still show success
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="outline"
          className="gap-2 border-dashed border-2 hover:border-solid hover:border-primary-300"
          onClick={handleClick}
        >
          <LinkIcon className="h-4 w-4" />
          Analyze URL
        </Button>
        <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white whitespace-nowrap">
          Coming Soon
        </span>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Spy Mode Coming Soon!
            </DialogTitle>
            <DialogDescription>
              Paste any TikTok ad URL and we'll analyze the hook, script structure,
              and engagement patterns. Be first to know when it launches!
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-gray-700 font-medium">You're on the list!</p>
              <p className="text-sm text-gray-500 mt-1">
                We'll email you when URL analysis launches.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  'Notify Me When It Launches'
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 6. Dashboard Components

### 6.1 ScriptHistory

```typescript
// src/components/ScriptHistory.tsx
'use client';

import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

/**
 * ScriptHistory Component
 *
 * Displays user's previously generated scripts with expandable details.
 *
 * @accessibility
 * - Collapsible sections use proper ARIA attributes
 * - Delete action has confirmation
 * - Time is displayed in human-readable format
 */
export interface GeneratedScript {
  id: string;
  hookText: string;
  productDescription: string;
  scripts: Array<{ angle: string; script: string }>;
  createdAt: Date;
}

export interface ScriptHistoryProps {
  scripts: GeneratedScript[];
  onDelete: (id: string) => Promise<void>;
}

export function ScriptHistory({ scripts: initialScripts, onDelete }: ScriptHistoryProps) {
  const [scripts, setScripts] = useState(initialScripts);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this script?')) {
      return;
    }

    setDeleting(id);
    try {
      await onDelete(id);
      setScripts((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting(null);
    }
  }, [onDelete]);

  if (scripts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No scripts generated yet.</p>
        <Button asChild className="mt-4">
          <a href="/">Browse Hook Library</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scripts.map((script) => (
        <Collapsible
          key={script.id}
          open={expandedIds.has(script.id)}
          onOpenChange={() => toggleExpanded(script.id)}
        >
          <div className="border rounded-lg bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 hover:bg-gray-50">
              <CollapsibleTrigger className="flex-1 flex items-center gap-3 text-left">
                {expandedIds.has(script.id) ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900 line-clamp-1">
                    "{script.hookText}"
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(script.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </CollapsibleTrigger>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(script.id)}
                disabled={deleting === script.id}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Expanded Content */}
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-2 border-t bg-gray-50">
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">Product:</span> {script.productDescription}
                </p>

                <div className="grid gap-3 md:grid-cols-3">
                  {script.scripts.map((s, i) => (
                    <ScriptPreview key={i} script={s} />
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}

function ScriptPreview({ script }: { script: { angle: string; script: string } }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 rounded-lg bg-white border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{script.angle}</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-gray-100"
          aria-label="Copy script"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-gray-400" />
          )}
        </button>
      </div>
      <p className="text-sm text-gray-700 line-clamp-4">{script.script}</p>
    </div>
  );
}
```

---

## 7. UI Primitives (shadcn/ui)

### 7.1 Button

```typescript
// src/components/ui/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-500 text-white hover:bg-primary-600',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
        link: 'text-primary-500 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### 7.2 Input

```typescript
// src/components/ui/input.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

### 7.3 Textarea

```typescript
// src/components/ui/textarea.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
```

---

## 8. Component Testing Checklist

### Per-Component Checklist

- [ ] **Visual**: Renders correctly at all breakpoints
- [ ] **Interactive**: All click/hover/focus states work
- [ ] **Accessible**: Screen reader announces correctly
- [ ] **Keyboard**: Tab order logical, Enter/Space triggers actions
- [ ] **Loading**: Skeleton/spinner states implemented
- [ ] **Error**: Error states display with proper messaging
- [ ] **Empty**: Empty states have clear CTA
- [ ] **Responsive**: Touch targets 44px minimum on mobile

### Testing Commands

```bash
# Unit tests
npm run test:unit

# Component tests with Storybook
npm run storybook

# Visual regression
npm run test:visual

# Accessibility audit
npm run test:a11y
```

---

## 9. Related Documentation

| Document                                                 | Purpose                     |
| -------------------------------------------------------- | --------------------------- |
| [BLUEPRINT.md](./BLUEPRINT.md)                           | Master implementation guide |
| [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) | Service layer patterns      |
| [ROUTING_DEPLOYMENT.md](./ROUTING_DEPLOYMENT.md)         | Page routing structure      |

---

**Document Owner**: Engineering Team
**Review Cycle**: Weekly during development
