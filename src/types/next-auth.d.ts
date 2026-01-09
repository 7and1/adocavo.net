import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      credits: number;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    credits?: number;
    role?: string;
  }
}
