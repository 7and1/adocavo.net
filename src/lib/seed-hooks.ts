import seedHooks from "../../data/hooks-seed.json";
import type { Hook } from "@/lib/schema";
import type { HookCategory } from "@/lib/validations";

export interface SeedHookFilters {
  category?: HookCategory;
  search?: string;
  page?: number;
  limit?: number;
}

const now = new Date();
const normalizedHooks: Hook[] = (
  seedHooks as Array<{
    id: string;
    text: string;
    category: HookCategory;
    engagementScore: number;
    source?: string;
  }>
).map((hook) => ({
  id: hook.id,
  text: hook.text,
  category: hook.category,
  engagementScore: hook.engagementScore,
  source: hook.source ?? null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
}));

export function getSeedHooks(filters: SeedHookFilters = {}) {
  const { category, search, page = 1, limit = 20 } = filters;
  let results = normalizedHooks;

  if (category) {
    results = results.filter((hook) => hook.category === category);
  }

  if (search) {
    const query = search.toLowerCase();
    results = results.filter((hook) => hook.text.toLowerCase().includes(query));
  }

  results = results.sort((a, b) => b.engagementScore - a.engagementScore);

  const offset = (page - 1) * limit;
  return results.slice(offset, offset + limit);
}

export function getSeedHookById(id: string) {
  return normalizedHooks.find((hook) => hook.id === id) ?? null;
}

export function getSeedCategories() {
  const counts = normalizedHooks.reduce<Record<string, number>>((acc, hook) => {
    acc[hook.category] = (acc[hook.category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([category, count]) => ({
      category: category as HookCategory,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function getSeedHookCount(category?: HookCategory) {
  if (!category) return normalizedHooks.length;
  return normalizedHooks.filter((hook) => hook.category === category).length;
}
