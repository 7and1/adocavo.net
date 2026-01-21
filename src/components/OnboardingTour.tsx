"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const tourSteps = [
  {
    target: ".hook-grid-section",
    title: "Welcome to Adocavo!",
    content:
      "Browse our library of 50+ viral TikTok hooks, organized by category. Each hook is tested and proven to convert.",
  },
  {
    target: ".category-filters",
    title: "Filter by Category",
    content:
      "Click a category to see hooks specific to your niche. Beauty, fitness, tech, food, and more.",
  },
  {
    target: ".hook-card",
    title: "Choose Your Hook",
    content:
      "Each hook card shows the text and engagement score. Click 'Use this hook' to generate 3 unique script variations.",
  },
  {
    target: ".script-generator",
    title: "Generate Scripts",
    content:
      "Describe your product, choose a tone, complete verification, and get 3 personalized scripts in seconds.",
  },
];

export function OnboardingTour() {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const hasSeenTour = localStorage.getItem("hasSeenTour");
    const isNewUser = !session?.user?.email;

    if (!hasSeenTour && isNewUser) {
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [session, isClient]);

  useEffect(() => {
    if (!isActive) return;

    const target = document.querySelector(tourSteps[currentStep]?.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 10,
        left: rect.left,
      });
    }
  }, [isActive, currentStep]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem("hasSeenTour", "true");
    trackEvent("onboarding_tour_completed", {
      steps: tourSteps.length,
    });
  };

  const handleSkip = () => {
    setIsActive(false);
    localStorage.setItem("hasSeenTour", "true");
    trackEvent("onboarding_tour_skipped");
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
        onClick={handleSkip}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[101] bg-white rounded-xl shadow-2xl p-6 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          top: `${Math.min(position.top, window.innerHeight - 300)}px`,
          left: `${Math.min(position.left, window.innerWidth - 400)}px`,
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {step.title}
            </h3>
            <div className="flex items-center gap-1">
              {tourSteps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === currentStep
                      ? "w-6 bg-primary-500"
                      : i < currentStep
                        ? "w-2 bg-primary-300"
                        : "w-2 bg-gray-200",
                  )}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Skip tour"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-4">{step.content}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            {currentStep < tourSteps.length - 1 ? (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              "Got it"
            )}
          </button>
        </div>
      </div>

      {/* Highlight target element */}
      <style jsx global>{`
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0px rgba(139, 92, 246, 0.7);
          }
          100% {
            box-shadow: 0 0 0 8px rgba(139, 92, 246, 0);
          }
        }
        .tour-target {
          position: relative;
          z-index: 101;
          animation: pulse-ring 2s infinite;
          border-radius: 8px;
        }
      `}</style>
    </>
  );
}
