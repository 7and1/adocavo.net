import { AppError } from "@/lib/errors";
import { getBindings, type EnvBindings } from "@/lib/cloudflare";
import { getClientIp } from "@/lib/rate-limit";

interface TurnstileVerificationResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

interface TurnstileVerifyOptions {
  action?: string;
  env?: EnvBindings;
}

export async function verifyTurnstileToken(
  request: Request,
  token: string | undefined,
  options: TurnstileVerifyOptions = {},
): Promise<TurnstileVerificationResponse> {
  if (!token) {
    throw new AppError(
      "TURNSTILE_REQUIRED",
      "Please complete the verification.",
      400,
    );
  }

  const env = options.env ?? getBindings();
  const secret = env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new AppError(
      "TURNSTILE_MISSING",
      "Turnstile secret key is not configured.",
      500,
    );
  }

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token);

  const ip = getClientIp(request);
  if (ip && ip !== "unknown") {
    body.append("remoteip", ip);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  const data = (await response.json()) as TurnstileVerificationResponse;

  if (!response.ok) {
    throw new AppError(
      "TURNSTILE_ERROR",
      "Verification failed. Please try again.",
      502,
      { status: response.status },
    );
  }

  if (!data.success) {
    throw new AppError(
      "TURNSTILE_FAILED",
      "Verification failed. Please try again.",
      403,
      { errorCodes: data["error-codes"] },
    );
  }

  if (options.action && data.action && data.action !== options.action) {
    throw new AppError(
      "TURNSTILE_ACTION_MISMATCH",
      "Verification failed. Please try again.",
      403,
      { expected: options.action, received: data.action },
    );
  }

  return data;
}
