import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default function AuthErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Link
            href="/"
            className="text-4xl font-bold text-gray-900 hover:text-primary-600"
          >
            Adocavo
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Authentication error</h1>
        <p className="text-gray-600">
          We couldn&apos;t sign you in. Please try again.
        </p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow h-10 px-4 py-2"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
