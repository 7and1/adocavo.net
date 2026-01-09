import { getAuthHandler } from "@/lib/auth";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async (req: NextRequest) => {
  const { handlers } = await getAuthHandler();
  return handlers.GET(req);
};

export const POST = async (req: NextRequest) => {
  const { handlers } = await getAuthHandler();
  return handlers.POST(req);
};
