import type { Metadata } from "next";
import { generateMetadata, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = generateMetadata(pageMetadata.privacy);

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <p className="text-lg text-gray-600">
        Adocavo Intelligence respects your privacy. This policy explains what we
        collect, why we collect it, and how we protect it.
      </p>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Information we collect</h2>
        <ul className="list-disc pl-5 text-gray-600 space-y-2">
          <li>Account information (name, email, profile photo).</li>
          <li>Usage data such as generated scripts and hook selections.</li>
          <li>Technical data like device type and IP address for security.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">How we use information</h2>
        <ul className="list-disc pl-5 text-gray-600 space-y-2">
          <li>Provide and improve the AI script generator.</li>
          <li>Maintain product security and prevent abuse.</li>
          <li>Communicate updates about new features or waitlist access.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Data retention</h2>
        <p className="text-gray-600">
          We retain your data only as long as needed to provide the service and
          meet legal obligations. You can request deletion at any time.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p className="text-gray-600">
          For privacy questions, contact us at support@adocavo.net.
        </p>
      </section>
    </div>
  );
}
