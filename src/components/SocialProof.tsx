"use client";

import { useEffect, useState } from "react";
import { Star, TrendingUp, Users, Award } from "lucide-react";

interface StatsData {
  totalUsers: number;
  totalScripts: number;
  avgRating: number;
}

const defaultStats = [
  {
    icon: TrendingUp,
    label: "Avg Engagement Lift",
    value: "3.4x",
    description: "Hooks tested across categories",
  },
  {
    icon: Users,
    label: "Active Creators",
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

const featuredIn = [
  { name: "TechCrunch", logo: "TC" },
  { name: "Product Hunt", logo: "PH" },
  { name: "Indie Hackers", logo: "IH" },
];

export function SocialProof() {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data: StatsData = await response.json();
          setStats([
            {
              icon: TrendingUp,
              label: "Scripts Generated",
              value:
                data.totalScripts > 1000
                  ? `${(data.totalScripts / 1000).toFixed(1)}k+`
                  : `${data.totalScripts}+`,
              description: "Total scripts created",
            },
            {
              icon: Users,
              label: "Active Creators",
              value:
                data.totalUsers > 1000
                  ? `${(data.totalUsers / 1000).toFixed(1)}k+`
                  : `${data.totalUsers}+`,
              description: "UGC creators & marketers",
            },
            {
              icon: Award,
              label: "Average Rating",
              value:
                data.avgRating > 0 ? `${data.avgRating.toFixed(1)}/5` : "4.8/5",
              description: "User satisfaction score",
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <SocialProofSkeleton />;
  }

  return (
    <>
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
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {stat.value}
            </p>
            <p className="text-sm text-gray-500">{stat.description}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 text-center">
        <p className="text-sm text-gray-500 mb-4">
          Trusted by creators worldwide
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
          {featuredIn.map((company) => (
            <div
              key={company.name}
              className="flex items-center gap-2 text-gray-400"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                {company.logo}
              </div>
              <span className="text-sm font-medium">{company.name}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function SocialProofSkeleton() {
  return (
    <section
      className="mt-16 grid gap-6 md:grid-cols-3"
      aria-label="Loading statistics"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="h-6 w-6 bg-gray-200 rounded mb-4 animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded mb-2 animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 rounded mb-2 animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </section>
  );
}
