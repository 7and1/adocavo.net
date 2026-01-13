import { Star, Quote, TrendingUp, CheckCircle } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company?: string;
  avatar: string;
  content: string;
  rating: number;
  metrics?: {
    label: string;
    value: string;
  };
  verified?: boolean;
  caseStudy?: string;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "UGC Creator",
    company: "Freelance",
    avatar: "SC",
    content:
      "Adocavo has completely transformed my content workflow. I used to spend hours brainstorming hooks, but now I get 3 fresh variations in seconds. My engagement rates have jumped 40% since I started using it.",
    rating: 5,
    metrics: {
      label: "Avg CTR Increase",
      value: "+40%",
    },
    verified: true,
  },
  {
    id: "2",
    name: "Marcus Johnson",
    role: "E-commerce Manager",
    company: "GymShark",
    avatar: "MJ",
    content:
      "The quality of scripts is incredible. They actually sound like real TikToks, not generic ad copy. Our creative testing speed has 3x'd and we're finding winning hooks much faster.",
    rating: 5,
    metrics: {
      label: "Creative Testing Speed",
      value: "3x faster",
    },
    verified: true,
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    role: "Marketing Lead",
    company: "HelloFresh",
    avatar: "ER",
    content:
      "We tested 50+ hooks in our first week. The pain point angles perform exceptionally well for our meal kits. The tone remixing feature is a game-changer for matching our brand voice.",
    rating: 5,
    metrics: {
      label: "Hooks Tested",
      value: "50+ in week 1",
    },
    verified: true,
    caseStudy: "#",
  },
  {
    id: "4",
    name: "Alex Kim",
    role: "D2C Founder",
    company: "Bee's Wrap",
    avatar: "AK",
    content:
      "As a small team, we don't have the budget for big agencies. Adocavo gives us agency-quality scripts at a fraction of the cost. Our ROAS has improved significantly.",
    rating: 5,
    metrics: {
      label: "ROAS Improvement",
      value: "+2.5x",
    },
    verified: true,
  },
  {
    id: "5",
    name: "Jessica Taylor",
    role: "Content Strategist",
    company: "Agency",
    avatar: "JT",
    content:
      "I manage TikTok for 8 clients now. Adocavo lets me scale creative production without hiring more copywriters. The hook library is gold - every pattern is backed by actual viral examples.",
    rating: 5,
    metrics: {
      label: "Clients Managed",
      value: "8 clients",
    },
    verified: true,
  },
  {
    id: "6",
    name: "David Park",
    role: "Growth Marketer",
    company: "Notion",
    avatar: "DP",
    content:
      "The custom tone feature is perfect for B2B SaaS. I can generate professional scripts that still feel native to TikTok. Our lead gen ads are finally performing on the platform.",
    rating: 5,
    metrics: {
      label: "Lead Cost Reduction",
      value: "-35%",
    },
    verified: true,
  },
];

export function Testimonials() {
  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Loved by 500+ Creators & Marketers
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how teams are using Adocavo to scale their TikTok creative
            production and drive real results.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-gray-200 shadow-sm">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="h-5 w-5 text-yellow-400 fill-yellow-400"
                />
              ))}
            </div>
            <span className="font-semibold text-gray-900">4.9 out of 5</span>
            <span className="text-gray-500">based on 200+ reviews</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300">
      {testimonial.verified && (
        <div className="absolute top-4 right-4">
          <div
            className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full"
            title="Verified user"
          >
            <CheckCircle className="h-3 w-3" />
            Verified
          </div>
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {testimonial.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 truncate">
            {testimonial.name}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {testimonial.role}
            {testimonial.company && ` @ ${testimonial.company}`}
          </div>
        </div>
      </div>

      <div className="flex mb-3">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
        ))}
      </div>

      <Quote className="h-6 w-6 text-gray-200 mb-2" />

      <p className="text-gray-700 mb-4 text-sm leading-relaxed">
        {testimonial.content}
      </p>

      {testimonial.metrics && (
        <div className="rounded-lg bg-primary-50 p-3 mb-4">
          <div className="text-xs text-primary-600 font-medium mb-1">
            {testimonial.metrics.label}
          </div>
          <div className="text-2xl font-bold text-primary-700">
            {testimonial.metrics.value}
          </div>
        </div>
      )}

      {testimonial.caseStudy && (
        <a
          href={testimonial.caseStudy}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          Read case study
          <TrendingUp className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
