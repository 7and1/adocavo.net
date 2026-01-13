"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RemixTone } from "@/lib/validations";

export interface ToneOption {
  value: RemixTone;
  label: string;
  description: string;
}

const DEFAULT_TONE_OPTIONS: Array<ToneOption> = [
  {
    value: "default",
    label: "Standard",
    description: "Balanced UGC tone that feels natural on TikTok.",
  },
  {
    value: "funny",
    label: "Funny",
    description: "Light humor and playful lines to boost watch time.",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Polished, credible voice for premium products.",
  },
  {
    value: "luxury",
    label: "Luxury",
    description: "Aspirational, high-end language and visuals.",
  },
  {
    value: "urgent",
    label: "Urgent",
    description: "Scarcity-driven, time-sensitive framing.",
  },
  {
    value: "playful",
    label: "Playful",
    description: "Energetic, upbeat delivery with casual vibes.",
  },
  {
    value: "direct",
    label: "Direct",
    description: "Concise, no-fluff messaging that gets to the point.",
  },
];

export interface ToneSelectorProps {
  tone: RemixTone;
  onToneChange: (tone: RemixTone) => void;
  instruction: string;
  onInstructionChange: (instruction: string) => void;
  toneOptions?: Array<ToneOption>;
  disabled?: boolean;
}

export function ToneSelector({
  tone,
  onToneChange,
  instruction,
  onInstructionChange,
  toneOptions = DEFAULT_TONE_OPTIONS,
  disabled = false,
}: ToneSelectorProps) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 md:p-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Remix tone</Label>
        <RadioGroup
          value={tone}
          onValueChange={(value) => onToneChange(value as RemixTone)}
          className="grid gap-3 sm:grid-cols-2"
          disabled={disabled}
        >
          {toneOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex flex-col gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                "hover:border-primary-300 hover:bg-primary-50",
                tone === option.value
                  ? "border-primary-300 bg-primary-50"
                  : "border-gray-200",
              )}
            >
              <span className="flex items-center gap-2">
                <RadioGroupItem value={option.value} />
                <span className="font-medium text-gray-900">
                  {option.label}
                </span>
              </span>
              <span className="text-xs text-gray-500">
                {option.description}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remix-instruction" className="text-sm font-medium">
          Custom instruction (optional)
        </Label>
        <Textarea
          id="remix-instruction"
          placeholder='e.g., "Make this sound like a creator review with playful sarcasm."'
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          maxLength={200}
          rows={2}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">
          Add a specific style request like &quot;make this funny&quot; or
          &quot;make this professional.&quot;
        </p>
      </div>
    </div>
  );
}
