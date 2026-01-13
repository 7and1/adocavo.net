"use client";

import { useEffect } from "react";

export function InteractionTracker() {
  useEffect(() => {
    const handleInteraction = () => {
      if (!sessionStorage.getItem("has-interacted")) {
        sessionStorage.setItem("has-interacted", "true");
      }
    };

    const events = ["click", "scroll", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, handleInteraction, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, []);

  return null;
}
