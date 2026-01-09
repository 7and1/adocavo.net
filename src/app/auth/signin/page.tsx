export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-4xl font-bold text-gray-900">Adocavo</span>
        </div>
        <h1 className="text-3xl font-bold">Sign in to Adocavo</h1>
        <p className="text-gray-600">
          Access your hook library, script history, and remaining credits.
        </p>
        <div className="space-y-3">
          <button className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow h-10 px-4 py-2">
            Continue with Google
          </button>
          <button className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300 h-10 px-4 py-2">
            Continue with GitHub
          </button>
        </div>
      </div>
    </main>
  );
}
