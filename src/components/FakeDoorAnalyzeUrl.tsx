"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Link as LinkIcon, CheckCircle2, Mail, Video } from "lucide-react";

export function FakeDoorAnalyzeUrl() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    fetch("/api/track-fake-door", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature: "analyze_url" }),
    }).catch(console.error);

    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          featureInterest: "spy",
          sourceUrl: window.location.href,
        }),
      });
      setSubmitted(true);
    } catch {
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
          className="gap-2 border-dashed border-2 hover:border-solid hover:border-primary-400 hover:bg-primary-50 transition-all"
          onClick={handleClick}
        >
          <LinkIcon className="h-4 w-4" />
          Analyze URL
        </Button>
        <span
          className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white whitespace-nowrap shadow-sm animate-pulse"
          aria-label="Coming soon feature"
        >
          Coming Soon
        </span>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
                <Video className="h-5 w-5 text-purple-600" />
              </div>
              Spy Mode Coming Soon!
            </DialogTitle>
            <DialogDescription className="text-base">
              Paste any TikTok ad URL and we&apos;ll analyze the hook, script
              structure, and engagement patterns. Be first to know when it
              launches!
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center py-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-gray-900 font-medium mb-1">
                You&apos;re on the list!
              </p>
              <p className="text-sm text-gray-500">
                We&apos;ll email you when URL analysis launches.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  aria-invalid={!!error}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" loading={loading}>
                {loading ? undefined : "Notify Me When It Launches"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
