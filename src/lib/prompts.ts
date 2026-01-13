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
 *
 * Security features:
 * - Blocks instruction override attempts
 * - Prevents Unicode homograph attacks
 * - Removes delimiter injection attempts
 * - Limits length to prevent token flooding
 * - Validates against dangerous patterns
 */
export function sanitizePromptInput(input: string, maxLength = 500): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Step 1: Remove Unicode homograph attacks (spoofed characters)
  // Normalize to NFKC form to decompose combined characters
  let sanitized = input.normalize("NFKC");

  // Step 2: Remove potentially dangerous patterns
  sanitized = sanitized
    // Remove instructions to ignore previous context
    .replace(/ignore\s+(all\s+)?(previous|above|the\s+system)/gi, "")
    // Remove instructions to change system behavior
    .replace(
      /(forget|disregard|override|bypass|ignore)\s+(everything|all\s+instructions|rules|constraints|security|filters)/gi,
      "",
    )
    // Remove attempts to switch roles or modes
    .replace(
      /(act|pretend|behave|roleplay|simulate|become|you\s+are\s+now|role:\s*|mode:\s*)/gi,
      "",
    )
    // Remove delimiter attempts that could break prompt structure
    .replace(/---+/g, "")
    .replace(/===+/g, "")
    .replace(/\[END\]/gi, "")
    .replace(/<<\s*END\s*>>/gi, "")
    // Remove JSON injection attempts
    .replace(/\{[\s"]*scripts[\s"]*:/gi, "")
    .replace(/\]\s*\}\s*$/gi, "")
    // Remove markdown code block injections
    .replace(/```\s*(json)?/gi, "")
    // Remove XML-style tag injections
    .replace(/<\/?(?:system|assistant|user|prompt|instruction)>/gi, "")
    // Remove control characters (except newline and tab)
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
    // Remove zero-width characters (invisible spoofing)
    .replace(/[\u200B-\u200D\uFEFF\uFFF9-\uFFFB]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Step 3: Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Step 4: Validate no dangerous patterns remain
  const dangerousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /data:\s*text\/html/i,
    /\beval\b/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      // If dangerous pattern found, return empty string
      console.warn("Dangerous pattern detected in input, sanitizing to empty");
      return "";
    }
  }

  return sanitized;
}

/**
 * Validates AI-generated script output for safety and quality.
 * This provides defense-in-depth against malicious model outputs.
 */
export function validateScriptOutput(scripts: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!scripts || typeof scripts !== "object") {
    return { valid: false, error: "Invalid output structure" };
  }

  const scriptsObj = scripts as Record<string, unknown>;

  // Check if it's a scripts array
  if (!("scripts" in scriptsObj) || !Array.isArray(scriptsObj.scripts)) {
    return { valid: false, error: "Missing scripts array" };
  }

  const scriptsArray = scriptsObj.scripts;

  // Validate script count
  if (scriptsArray.length < 1 || scriptsArray.length > 10) {
    return { valid: false, error: "Invalid number of scripts" };
  }

  // Validate each script
  for (const script of scriptsArray) {
    if (typeof script !== "object" || script === null) {
      return { valid: false, error: "Invalid script structure" };
    }

    const s = script as Record<string, unknown>;

    // Check required fields
    if (!("angle" in s) || !("script" in s)) {
      return { valid: false, error: "Missing required fields" };
    }

    // Validate field types
    if (typeof s.angle !== "string" || typeof s.script !== "string") {
      return { valid: false, error: "Invalid field types" };
    }

    // Validate script length (prevent token flooding)
    if (s.script.length > 5000) {
      return { valid: false, error: "Script too long" };
    }

    // Check for dangerous content in script
    const dangerousContent = [
      /<script[^>]*>.*?<\/script>/gis,
      /javascript:/gi,
      /data:\s*text\/html/gi,
      /\beval\s*\(/gi,
    ];

    for (const pattern of dangerousContent) {
      if (pattern.test(s.script as string)) {
        return { valid: false, error: "Dangerous content detected" };
      }
    }
  }

  return { valid: true };
}

export function buildUserPrompt(
  hook: string,
  product: string,
  remixInstruction?: string,
  remixTone?: string,
): string {
  // Sanitize both inputs before using them
  const sanitizedHook = sanitizePromptInput(hook, 200);
  const sanitizedProduct = sanitizePromptInput(product, 500);
  const sanitizedInstruction = remixInstruction
    ? sanitizePromptInput(remixInstruction, 200)
    : "";
  const sanitizedTone = remixTone ? sanitizePromptInput(remixTone, 40) : "";

  const remixGuidance: string[] = [];
  if (sanitizedTone && sanitizedTone !== "default") {
    remixGuidance.push(`Tone: ${sanitizedTone}`);
  }
  if (sanitizedInstruction) {
    remixGuidance.push(`Style notes: ${sanitizedInstruction}`);
  }

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

  const remixBlock =
    remixGuidance.length > 0
      ? `\nRemix guidance:\n- ${remixGuidance.join("\n- ")}\n`
      : "";

  return `${examples}

NOW GENERATE FOR:
Hook: "${sanitizedHook}"
Product: ${sanitizedProduct}
${remixBlock}

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

const modelSize = (process.env.AI_MODEL_SIZE || "70b").toLowerCase();

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
