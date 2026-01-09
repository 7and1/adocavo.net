import { Star, TrendingUp, Users } from "lucide-react";

const stats = [
  {
    icon: TrendingUp,
    label: "Avg Engagement Lift",
    value: "3.4x",
    description: "Hooks tested across categories",
  },
  {
    icon: Users,
    label: "Creators in Beta",
    value: "500+",
    description: "UGC creators & marketers",
  },
  {
    icon: Star,
    label: "Script Satisfaction",
    value: "92%",
    description: "Would generate again",
  },
];

export function SocialProof() {
  return (
    <section
      className="mt-16 grid gap-6 md:grid-cols-3"
      aria-label="Social proof statistics"
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between mb-4">
            <stat.icon className="h-6 w-6 text-primary-500" />
            <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <stat.icon className="h-4 w-4 text-primary-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
          <p className="text-sm text-gray-500">{stat.description}</p>
        </div>
      ))}
    </section>
  );
}
