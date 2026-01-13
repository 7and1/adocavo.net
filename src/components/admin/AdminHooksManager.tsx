"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export type AdminHook = {
  id: string;
  text: string;
  category: string;
  engagementScore: number;
  source?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ReviewQueueItem = {
  id: string;
  text: string;
  category: string;
  engagementScore: number;
  source?: string | null;
  status: "pending" | "approved" | "rejected";
  reviewerId?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type HookFormState = {
  text: string;
  category: string;
  engagementScore: number;
  source: string;
  isActive: boolean;
};

type QueueFormState = {
  text: string;
  category: string;
  engagementScore: number;
  source: string;
  notes: string;
  status: "pending" | "approved" | "rejected";
  publish: boolean;
};

type Props = {
  initialHooks: AdminHook[];
  initialReviewQueue: ReviewQueueItem[];
  categories: string[];
};

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const message = payload?.error?.message || "Request failed";
    throw new Error(message);
  }

  return payload.data as T;
}

function clampScore(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function statusBadge(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export function AdminHooksManager({
  initialHooks,
  initialReviewQueue,
  categories,
}: Props) {
  const { toast } = useToast();
  const [hooks, setHooks] = useState<AdminHook[]>(initialHooks);
  const [reviewQueue, setReviewQueue] =
    useState<ReviewQueueItem[]>(initialReviewQueue);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [queueSearch, setQueueSearch] = useState("");
  const [queueCategoryFilter, setQueueCategoryFilter] = useState("all");
  const [queueStatusFilter, setQueueStatusFilter] = useState("pending");

  const [isCreatingHook, setIsCreatingHook] = useState(false);
  const [isCreatingQueue, setIsCreatingQueue] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [editingHook, setEditingHook] = useState<HookFormState | null>(null);
  const [editingHookId, setEditingHookId] = useState<string | null>(null);

  const [editingQueue, setEditingQueue] = useState<QueueFormState | null>(null);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);

  const [newHook, setNewHook] = useState<HookFormState>({
    text: "",
    category: categories[0] || "beauty",
    engagementScore: 90,
    source: "manual_curation",
    isActive: true,
  });

  const [newQueue, setNewQueue] = useState<QueueFormState>({
    text: "",
    category: categories[0] || "beauty",
    engagementScore: 85,
    source: "scrape_queue",
    notes: "",
    status: "pending",
    publish: true,
  });

  const filteredHooks = useMemo(() => {
    return hooks.filter((hook) => {
      if (categoryFilter !== "all" && hook.category !== categoryFilter) {
        return false;
      }
      if (statusFilter === "active" && !hook.isActive) return false;
      if (statusFilter === "inactive" && hook.isActive) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        if (
          !hook.text.toLowerCase().includes(term) &&
          !hook.id.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [hooks, search, categoryFilter, statusFilter]);

  const filteredQueue = useMemo(() => {
    return reviewQueue.filter((item) => {
      if (
        queueCategoryFilter !== "all" &&
        item.category !== queueCategoryFilter
      ) {
        return false;
      }
      if (queueStatusFilter !== "all" && item.status !== queueStatusFilter) {
        return false;
      }
      if (queueSearch.trim()) {
        const term = queueSearch.toLowerCase();
        if (
          !item.text.toLowerCase().includes(term) &&
          !item.id.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reviewQueue, queueSearch, queueCategoryFilter, queueStatusFilter]);

  const stats = useMemo(() => {
    const total = hooks.length;
    const active = hooks.filter((hook) => hook.isActive).length;
    const pending = reviewQueue.filter(
      (item) => item.status === "pending",
    ).length;
    return {
      total,
      active,
      inactive: total - active,
      pending,
    };
  }, [hooks, reviewQueue]);

  async function refreshAll() {
    setIsRefreshing(true);
    try {
      const [hooksData, queueData] = await Promise.all([
        apiRequest<AdminHook[]>("/api/admin/hooks?status=all&limit=200"),
        apiRequest<ReviewQueueItem[]>("/api/admin/review-queue?limit=200"),
      ]);
      setHooks(hooksData);
      setReviewQueue(queueData);
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCreateHook() {
    setIsCreatingHook(true);
    try {
      const created = await apiRequest<AdminHook>("/api/admin/hooks", {
        method: "POST",
        body: JSON.stringify({
          text: newHook.text,
          category: newHook.category,
          engagementScore: newHook.engagementScore,
          source: newHook.source || undefined,
          isActive: newHook.isActive,
        }),
      });
      setHooks((prev) => [created, ...prev]);
      setNewHook({
        text: "",
        category: newHook.category,
        engagementScore: 90,
        source: "manual_curation",
        isActive: true,
      });
      toast({
        title: "Hook created",
        description: "Added to the library.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Create failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingHook(false);
    }
  }

  async function handleCreateQueue() {
    setIsCreatingQueue(true);
    try {
      const created = await apiRequest<ReviewQueueItem[]>(
        "/api/admin/review-queue",
        {
          method: "POST",
          body: JSON.stringify({
            text: newQueue.text,
            category: newQueue.category,
            engagementScore: newQueue.engagementScore,
            source: newQueue.source || undefined,
            notes: newQueue.notes || undefined,
          }),
        },
      );
      setReviewQueue((prev) => [...created, ...prev]);
      setNewQueue({
        text: "",
        category: newQueue.category,
        engagementScore: 85,
        source: "scrape_queue",
        notes: "",
        status: "pending",
        publish: true,
      });
      toast({
        title: "Queued for review",
        description: "Hook added to review queue.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Queue failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingQueue(false);
    }
  }

  async function handleToggleHook(hook: AdminHook) {
    try {
      const updated = await apiRequest<AdminHook>(
        `/api/admin/hooks/${hook.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !hook.isActive }),
        },
      );
      setHooks((prev) =>
        prev.map((item) => (item.id === hook.id ? updated : item)),
      );
      toast({
        title: updated.isActive ? "Hook activated" : "Hook deactivated",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  async function handleSaveHook() {
    if (!editingHook || !editingHookId) return;
    try {
      const updated = await apiRequest<AdminHook>(
        `/api/admin/hooks/${editingHookId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            text: editingHook.text,
            category: editingHook.category,
            engagementScore: editingHook.engagementScore,
            source: editingHook.source || null,
            isActive: editingHook.isActive,
          }),
        },
      );
      setHooks((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast({
        title: "Hook updated",
        variant: "success",
      });
      setEditingHook(null);
      setEditingHookId(null);
    } catch (error) {
      toast({
        title: "Update failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  async function handleQueueAction(
    item: ReviewQueueItem,
    status: "approved" | "rejected",
  ) {
    try {
      const result = await apiRequest<{
        queueItem: ReviewQueueItem;
        hook?: AdminHook;
      }>(`/api/admin/review-queue/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, publish: true }),
      });

      setReviewQueue((prev) =>
        prev.map((entry) => (entry.id === item.id ? result.queueItem : entry)),
      );

      if (result.hook) {
        setHooks((prev) => {
          const hook = result.hook!;
          const exists = prev.find((h) => h.id === hook.id);
          if (exists) {
            return prev.map((h) => (h.id === hook.id ? hook : h));
          }
          return [hook, ...prev];
        });
      }

      toast({
        title: status === "approved" ? "Hook approved" : "Hook rejected",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Review action failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  async function handleSaveQueue() {
    if (!editingQueue || !editingQueueId) return;
    try {
      const result = await apiRequest<{
        queueItem: ReviewQueueItem;
        hook?: AdminHook;
      }>(`/api/admin/review-queue/${editingQueueId}`, {
        method: "PATCH",
        body: JSON.stringify({
          text: editingQueue.text,
          category: editingQueue.category,
          engagementScore: editingQueue.engagementScore,
          source: editingQueue.source || null,
          notes: editingQueue.notes || null,
          status: editingQueue.status,
          publish: editingQueue.publish,
        }),
      });

      setReviewQueue((prev) =>
        prev.map((entry) =>
          entry.id === editingQueueId ? result.queueItem : entry,
        ),
      );

      if (result.hook) {
        setHooks((prev) => {
          const hook = result.hook!;
          const exists = prev.find((h) => h.id === hook.id);
          if (exists) {
            return prev.map((h) => (h.id === hook.id ? hook : h));
          }
          return [hook, ...prev];
        });
      }

      toast({
        title: "Review updated",
        variant: "success",
      });
      setEditingQueue(null);
      setEditingQueueId(null);
    } catch (error) {
      toast({
        title: "Update failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Total hooks</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-semibold">{stats.active}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Inactive</div>
          <div className="text-2xl font-semibold">{stats.inactive}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Pending review</div>
          <div className="text-2xl font-semibold">{stats.pending}</div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Hook Management</h2>
          <p className="text-sm text-gray-500">
            Curate the library and approve new hook submissions.
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll} loading={isRefreshing}>
          Refresh data
        </Button>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create new hook</h3>
          <div className="space-y-2">
            <Label htmlFor="hook-text">Hook text</Label>
            <Textarea
              id="hook-text"
              value={newHook.text}
              onChange={(event) =>
                setNewHook((prev) => ({ ...prev, text: event.target.value }))
              }
              placeholder="Stop scrolling if you have..."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hook-category">Category</Label>
              <select
                id="hook-category"
                className="h-10 w-full rounded-md border border-gray-200 px-3"
                value={newHook.category}
                onChange={(event) =>
                  setNewHook((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hook-score">Engagement score</Label>
              <Input
                id="hook-score"
                type="number"
                min={0}
                max={100}
                value={newHook.engagementScore}
                onChange={(event) =>
                  setNewHook((prev) => ({
                    ...prev,
                    engagementScore: clampScore(Number(event.target.value)),
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hook-source">Source</Label>
              <Input
                id="hook-source"
                value={newHook.source}
                onChange={(event) =>
                  setNewHook((prev) => ({
                    ...prev,
                    source: event.target.value,
                  }))
                }
                placeholder="manual_curation"
              />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <input
                id="hook-active"
                type="checkbox"
                className="h-4 w-4"
                checked={newHook.isActive}
                onChange={(event) =>
                  setNewHook((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }))
                }
              />
              <Label htmlFor="hook-active">Active immediately</Label>
            </div>
          </div>
          <Button onClick={handleCreateHook} loading={isCreatingHook}>
            Create hook
          </Button>
        </div>

        <div className="rounded-2xl border bg-white p-6 space-y-4">
          <h3 className="text-lg font-semibold">Add to review queue</h3>
          <div className="space-y-2">
            <Label htmlFor="queue-text">Hook text</Label>
            <Textarea
              id="queue-text"
              value={newQueue.text}
              onChange={(event) =>
                setNewQueue((prev) => ({ ...prev, text: event.target.value }))
              }
              placeholder="Potential hook from scraping..."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="queue-category">Category</Label>
              <select
                id="queue-category"
                className="h-10 w-full rounded-md border border-gray-200 px-3"
                value={newQueue.category}
                onChange={(event) =>
                  setNewQueue((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="queue-score">Engagement score</Label>
              <Input
                id="queue-score"
                type="number"
                min={0}
                max={100}
                value={newQueue.engagementScore}
                onChange={(event) =>
                  setNewQueue((prev) => ({
                    ...prev,
                    engagementScore: clampScore(Number(event.target.value)),
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="queue-source">Source</Label>
              <Input
                id="queue-source"
                value={newQueue.source}
                onChange={(event) =>
                  setNewQueue((prev) => ({
                    ...prev,
                    source: event.target.value,
                  }))
                }
                placeholder="scrape_queue"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="queue-notes">Notes</Label>
              <Input
                id="queue-notes"
                value={newQueue.notes}
                onChange={(event) =>
                  setNewQueue((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional review notes"
              />
            </div>
          </div>
          <Button onClick={handleCreateQueue} loading={isCreatingQueue}>
            Add to queue
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Hook library</h3>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search hooks"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-56"
            />
            <select
              className="h-10 rounded-md border border-gray-200 px-3"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-gray-200 px-3"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {filteredHooks.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">
            No hooks match your filters.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredHooks.map((hook) => (
              <div key={hook.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold">“{hook.text}”</p>
                    <div className="text-sm text-gray-500">
                      {hook.category} · Score {hook.engagementScore}
                    </div>
                    <div className="text-xs text-gray-400">{hook.id}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        hook.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {hook.isActive ? "Active" : "Inactive"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingHookId(hook.id);
                        setEditingHook({
                          text: hook.text,
                          category: hook.category,
                          engagementScore: hook.engagementScore,
                          source: hook.source || "",
                          isActive: hook.isActive,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant={hook.isActive ? "secondary" : "default"}
                      size="sm"
                      onClick={() => handleToggleHook(hook)}
                    >
                      {hook.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Review queue</h3>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search queue"
              value={queueSearch}
              onChange={(event) => setQueueSearch(event.target.value)}
              className="w-56"
            />
            <select
              className="h-10 rounded-md border border-gray-200 px-3"
              value={queueCategoryFilter}
              onChange={(event) => setQueueCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-gray-200 px-3"
              value={queueStatusFilter}
              onChange={(event) => setQueueStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">
            No review items match your filters.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredQueue.map((item) => (
              <div key={item.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold">“{item.text}”</p>
                    <div className="text-sm text-gray-500">
                      {item.category} · Score {item.engagementScore}
                    </div>
                    <div className="text-xs text-gray-400">{item.id}</div>
                    {item.notes && (
                      <div className="text-xs text-gray-500">
                        Notes: {item.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${statusBadge(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingQueueId(item.id);
                        setEditingQueue({
                          text: item.text,
                          category: item.category,
                          engagementScore: item.engagementScore,
                          source: item.source || "",
                          notes: item.notes || "",
                          status: item.status,
                          publish: true,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    {item.status !== "approved" && (
                      <Button
                        size="sm"
                        onClick={() => handleQueueAction(item, "approved")}
                      >
                        Approve
                      </Button>
                    )}
                    {item.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleQueueAction(item, "rejected")}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(editingHook)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingHook(null);
            setEditingHookId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit hook</DialogTitle>
          </DialogHeader>
          {editingHook && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Hook text</Label>
                <Textarea
                  value={editingHook.text}
                  onChange={(event) =>
                    setEditingHook((prev) =>
                      prev ? { ...prev, text: event.target.value } : prev,
                    )
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-200 px-3"
                    value={editingHook.category}
                    onChange={(event) =>
                      setEditingHook((prev) =>
                        prev ? { ...prev, category: event.target.value } : prev,
                      )
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Engagement score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingHook.engagementScore}
                    onChange={(event) =>
                      setEditingHook((prev) =>
                        prev
                          ? {
                              ...prev,
                              engagementScore: clampScore(
                                Number(event.target.value),
                              ),
                            }
                          : prev,
                      )
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input
                    value={editingHook.source}
                    onChange={(event) =>
                      setEditingHook((prev) =>
                        prev ? { ...prev, source: event.target.value } : prev,
                      )
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input
                    id="editing-hook-active"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={editingHook.isActive}
                    onChange={(event) =>
                      setEditingHook((prev) =>
                        prev
                          ? { ...prev, isActive: event.target.checked }
                          : prev,
                      )
                    }
                  />
                  <Label htmlFor="editing-hook-active">Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEditingHook(null);
                setEditingHookId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveHook}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingQueue)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingQueue(null);
            setEditingQueueId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit review item</DialogTitle>
          </DialogHeader>
          {editingQueue && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Hook text</Label>
                <Textarea
                  value={editingQueue.text}
                  onChange={(event) =>
                    setEditingQueue((prev) =>
                      prev ? { ...prev, text: event.target.value } : prev,
                    )
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-200 px-3"
                    value={editingQueue.category}
                    onChange={(event) =>
                      setEditingQueue((prev) =>
                        prev ? { ...prev, category: event.target.value } : prev,
                      )
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Engagement score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingQueue.engagementScore}
                    onChange={(event) =>
                      setEditingQueue((prev) =>
                        prev
                          ? {
                              ...prev,
                              engagementScore: clampScore(
                                Number(event.target.value),
                              ),
                            }
                          : prev,
                      )
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input
                    value={editingQueue.source}
                    onChange={(event) =>
                      setEditingQueue((prev) =>
                        prev ? { ...prev, source: event.target.value } : prev,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={editingQueue.notes}
                    onChange={(event) =>
                      setEditingQueue((prev) =>
                        prev ? { ...prev, notes: event.target.value } : prev,
                      )
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-200 px-3"
                    value={editingQueue.status}
                    onChange={(event) =>
                      setEditingQueue((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: event.target
                                .value as QueueFormState["status"],
                            }
                          : prev,
                      )
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input
                    id="queue-publish"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={editingQueue.publish}
                    onChange={(event) =>
                      setEditingQueue((prev) =>
                        prev
                          ? { ...prev, publish: event.target.checked }
                          : prev,
                      )
                    }
                  />
                  <Label htmlFor="queue-publish">Publish when approved</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEditingQueue(null);
                setEditingQueueId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveQueue}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
