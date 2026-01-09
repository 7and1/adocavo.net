const FEW_SHOT_EXAMPLES = [
  {
    hook: "Stop scrolling if you have acne",
    product: "Salicylic acid cleanser for oily skin",
    scripts: [
      {
        angle: "Pain Point",
        script:
          '[Visual: Close-up of frustrated face looking at mirror]\n(Audio: "Stop scrolling if you have acne")\n[Visual: Before shot - visible breakouts]\n(Audio: "I tried literally everything. Expensive derms, random Amazon products, even toothpaste - don\'t judge")\n[Visual: Product reveal, satisfying pump]\n(Audio: "Then I found this $12 cleanser and my skin cleared up in like 2 weeks")\n[Visual: After shot - clear skin, natural lighting]\n(Audio: "It\'s salicylic acid but it doesn\'t dry you out. Link in bio before it sells out again")',
      },
      {
        angle: "Benefit",
        script:
          '[Visual: Glowing skin selfie, golden hour]\n(Audio: "Stop scrolling if you have acne")\n[Visual: Product in aesthetic bathroom setup]\n(Audio: "POV: you finally found a cleanser that actually works")\n[Visual: Applying product, foam texture ASMR]\n(Audio: "Woke up with clear skin for the first time in years. No filter, no makeup")\n[Visual: Close-up of smooth skin texture]\n(Audio: "If you\'re tired of wasting money, just try this. Trust me")',
      },
      {
        angle: "Social Proof",
        script:
          '[Visual: TikTok comment screenshots scrolling]\n(Audio: "Stop scrolling if you have acne")\n[Visual: Product with notification sounds]\n(Audio: "Y\'all keep asking what cleared my skin so here it is")\n[Visual: Green screen with product reviews]\n(Audio: "It has like 50,000 five-star reviews and dermatologists recommend it")\n[Visual: Quick before/after transition]\n(Audio: "I\'m not gatekeeping anymore. Go get it")',
      },
    ],
  },
  {
    hook: "This is your sign to start that side hustle",
    product: "Dropshipping course for beginners",
    scripts: [
      {
        angle: "Pain Point",
        script:
          '[Visual: Alarm clock, groggy morning commute]\n(Audio: "This is your sign to start that side hustle")\n[Visual: Sad desk lunch, fluorescent office]\n(Audio: "I was literally crying in my car every day before work")\n[Visual: Laptop with dashboard showing sales]\n(Audio: "Now I make more from my side hustle than my 9-5")\n[Visual: Working from coffee shop, relaxed]\n(Audio: "It\'s not magic, I just learned dropshipping. Link has everything you need")',
      },
    ],
  },
];

export const SYSTEM_PROMPT = `You are a viral TikTok ad scriptwriter who creates authentic UGC-style content.

CRITICAL RULES:
1. Scripts must sound like a real person talking to their phone, NOT corporate marketing
2. Use casual language: "literally", "like", "y'all", "trust me", "no cap"
3. Include specific details that feel real (prices, timeframes, personal anecdotes)
4. Visual directions should be simple and achievable with a phone
5. Scripts should be 15-30 seconds when read aloud (roughly 60-100 words)
6. The hook MUST be the first line of audio
7. Include urgency or scarcity naturally ("before it sells out", "limited time")

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "scripts": [
    { "angle": "Pain Point", "script": "[Visual: ...]\n(Audio: ...)\n..." },
    { "angle": "Benefit", "script": "[Visual: ...]\n(Audio: ...)\n..." },
    { "angle": "Social Proof", "script": "[Visual: ...]\n(Audio: ...)\n..." }
  ]
}`;

/**
 * Sanitizes user input to prevent AI prompt injection attacks.
 * Removes common injection patterns and limits length.
 */
function sanitizePromptInput(input: string, maxLength = 500): string {
  // Remove potentially dangerous patterns
  let sanitized = input
    // Remove instructions to ignore previous context
    .replace(/ignore\s+(all\s+)?(previous|above)/gi, "")
    // Remove instructions to change system behavior
    .replace(
      /(forget|disregard|override)\s+(everything|all|instructions)/gi,
      "",
    )
    // Remove attempts to switch roles or modes
    .replace(/(act|pretend|behave|roleplay)\s+(as|like|a)/gi, "")
    // Remove delimiter attempts that could break prompt structure
    .replace(/---+/g, "")
    .replace(/===+/g, "")
    .replace(/\[END\]/gi, "")
    // Remove JSON injection attempts
    .replace(/\{[\s"]*scripts[\s"]*:/gi, "")
    // Remove control characters
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

export function buildUserPrompt(hook: string, product: string): string {
  // Sanitize both inputs before using them
  const sanitizedHook = sanitizePromptInput(hook, 200);
  const sanitizedProduct = sanitizePromptInput(product, 500);

  const examples = FEW_SHOT_EXAMPLES.slice(0, 2)
    .map(
      (ex, i) => `\nEXAMPLE ${i + 1}:
Hook: "${ex.hook}"
Product: ${ex.product}
Output:
${JSON.stringify(
  {
    scripts: ex.scripts.map((s) => ({ angle: s.angle, script: s.script })),
  },
  null,
  2,
)}\n`,
    )
    .join("\n");

  return `${examples}

NOW GENERATE FOR:
Hook: "${sanitizedHook}"
Product: ${sanitizedProduct}

Remember:
- Hook MUST be the first spoken line
- Sound like a real TikToker, not an AI
- Include [Visual] and (Audio) formatting
- Make each angle genuinely different

Generate 3 scripts:`;
}

const MODEL_MAP = {
  "8b": "@cf/meta/llama-3.1-8b-instruct",
  "70b": "@cf/meta/llama-3.1-70b-instruct",
};

const modelSize = (process.env.AI_MODEL_SIZE || "8b").toLowerCase();

export const AI_CONFIG = {
  model: MODEL_MAP[modelSize as keyof typeof MODEL_MAP] ?? MODEL_MAP["8b"],
  temperature: 0.75,
  max_tokens: 2048,
  streaming: (process.env.AI_STREAMING || "false") === "true",
};

if (modelSize === "70b" && !AI_CONFIG.streaming) {
  console.warn(
    "AI_MODEL_SIZE=70b without streaming enabled. Consider AI_STREAMING=true to improve perceived latency.",
  );
}
