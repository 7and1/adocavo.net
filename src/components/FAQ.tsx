import { getFAQJsonLd, safeJsonLdStringify } from "@/lib/seo";

const faqs = [
  {
    q: "What is a TikTok hook?",
    a: "A TikTok hook is the first 1-3 seconds of your ad that stops the scroll. It's the most important part of your creative—without a strong hook, viewers will swipe past before seeing your product. Effective hooks either call out a specific audience, create curiosity, or challenge a common belief.",
  },
  {
    q: "How does the AI script generator work?",
    a: "Select a viral hook from our library, enter your product details, and our AI generates 3 unique script variations. Each script uses proven frameworks like the 5-part structure: Hook, Problem, Product, Proof, CTA. Scripts are optimized to sound authentic and native to TikTok.",
  },
  {
    q: "How many credits do I need?",
    a: "Each script generation uses 1 credit and produces 3 variations. New users get 10 free credits to start. When you run out, you can join the waitlist for premium access and future credit options.",
  },
  {
    q: "What categories do you support?",
    a: "Our hook library covers 50+ patterns across beauty, tech, fitness, food, finance, and pets. Each category includes proven hooks tailored to that niche.",
  },
  {
    q: "Can I use these for Instagram Reels too?",
    a: "Yes. TikTok and Reels share similar formats—short, vertical video that hooks fast. The scripts work on both platforms. The main difference is TikTok requires a bolder hook (you have less time), while Reels can be slightly more polished.",
  },
  {
    q: "Do scripts sound like AI?",
    a: "No. Our AI is guided by real viral examples and uses casual, creator-style language. Scripts are designed to feel like authentic UGC, not corporate copy. You can generate multiple variations by remixing additional hooks.",
  },
];

interface FAQProps {
  limit?: number;
}

export function FAQ({ limit = faqs.length }: FAQProps) {
  const displayedFaqs = faqs.slice(0, limit);
  const jsonLd = getFAQJsonLd(displayedFaqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
      />
      <section className="max-w-3xl mx-auto" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <dl className="space-y-6">
          {displayedFaqs.map((faq, index) => (
            <div
              key={index}
              className="border-b border-gray-200 pb-6 last:border-0"
            >
              <dt className="text-lg font-semibold text-gray-900 mb-2">
                {faq.q}
              </dt>
              <dd className="text-gray-600 leading-relaxed">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
