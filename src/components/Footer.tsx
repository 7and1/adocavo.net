import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-4 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Product</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/" prefetch className="hover:text-gray-900">
                  Hook Library
                </Link>
              </li>
              <li>
                <Link href="/examples" prefetch className="hover:text-gray-900">
                  Examples
                </Link>
              </li>
              <li>
                <Link href="/pricing" prefetch className="hover:text-gray-900">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Resources</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/blog" prefetch className="hover:text-gray-900">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/blog" prefetch className="hover:text-gray-900">
                  TikTok Ad Scripts
                </Link>
              </li>
              <li>
                <Link href="/blog" prefetch className="hover:text-gray-900">
                  Viral Hooks Guide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/about" prefetch className="hover:text-gray-900">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/privacy" prefetch className="hover:text-gray-900">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" prefetch className="hover:text-gray-900">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-4 border-t text-sm text-gray-500 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p>© 2026 Adocavo Intelligence. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
