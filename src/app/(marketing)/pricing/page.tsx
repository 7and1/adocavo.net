import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { generateMetadata, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = generateMetadata(pageMetadata.pricing);

export default function PricingPage() {
  return (
    <div className="max-w-3xl mx-auto text-center space-y-6">
      <h1 className="text-4xl font-bold">Pricing</h1>
      <p className="text-lg text-gray-600">
        We&apos;re launching pricing once we finalize the best plan for creators
        and teams.
      </p>
      <div className="rounded-2xl border bg-white p-8">
        <h2 className="text-2xl font-semibold mb-2">Early Access</h2>
        <p className="text-gray-600 mb-6">
          Join the waitlist to get notified as soon as premium plans launch.
        </p>
        <Button asChild>
          <Link href="/">Join Waitlist</Link>
        </Button>
      </div>

      <section className="pt-8 border-t">
        <h2 className="text-2xl font-semibold mb-4">What&apos;s included?</h2>
        <div className="grid gap-4 md:grid-cols-3 text-left">
          <div className="rounded-xl border bg-gray-50 p-4">
            <h3 className="font-semibold mb-2">Free Tier</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Access to 50+ hooks</li>
              <li>Basic script generation</li>
              <li>Community support</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-gray-50 p-4">
            <h3 className="font-semibold mb-2">Pro (Coming Soon)</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Unlimited scripts</li>
              <li>Advanced AI models</li>
              <li>Priority support</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-gray-50 p-4">
            <h3 className="font-semibold mb-2">Team (Coming Soon)</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Multi-user access</li>
              <li>Team collaboration</li>
              <li>API access</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
