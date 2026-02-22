import type {
  ApiResponse,
  Item,
  WatchlistEntry,
  WatchlistGroup,
  Alert,
  PriceHistoryPoint,
} from "@shared/types";

const API_BASE = "/api";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Request failed");
  }

  return data.data;
}

async function fetchApiWithMeta<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export const api = {
  items: {
    search: (params: {
      q?: string;
      category?: string;
      rarity?: string;
      minPrice?: number;
      maxPrice?: number;
      starLevel?: number;
      slot1Min?: number;
      slot1Max?: number;
      slot2Min?: number;
      slot2Max?: number;
      slot3Min?: number;
      slot3Max?: number;
      slot4Min?: number;
      slot4Max?: number;
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      return fetchApiWithMeta<Item[]>(`/items/search?${searchParams}`);
    },

    getById: (id: string, ordersn?: string) => {
      const url = ordersn ? `/items/${id}?ordersn=${ordersn}` : `/items/${id}`;
      return fetchApi<Item>(url);
    },

    getHistory: (id: string, days: number = 30) =>
      fetchApi<PriceHistoryPoint[]>(`/items/${id}/history?days=${days}`),

    getListings: (
      id: string,
      params?: { searchType?: string; page?: number; sort?: string },
    ) => {
      const { searchType, page, sort } = params || {};
      const queryParams = new URLSearchParams();
      if (searchType) queryParams.append("searchType", searchType);
      if (page) queryParams.append("page", String(page));
      if (sort) queryParams.append("sort", sort);
      return fetchApiWithMeta<Item[]>(
        `/items/type/${id}/listings?${queryParams}`,
      );
    },
  },

  watchlist: {
    getAll: () => fetchApi<WatchlistEntry[]>("/watchlist"),

    add: (data: {
      itemId: string;
      groupId?: number;
      targetPrice?: number;
      notes?: string;
      item?: Item;
    }) =>
      fetchApi<WatchlistEntry>("/watchlist", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (
      id: number,
      data: {
        targetPrice?: number;
        alertEnabled?: boolean;
        groupId?: number;
        notes?: string;
      },
    ) =>
      fetchApi<void>(`/watchlist/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      fetchApi<void>(`/watchlist/${id}`, {
        method: "DELETE",
      }),
  },

  groups: {
    getAll: () => fetchApi<WatchlistGroup[]>("/groups"),

    create: (data: { name: string; color?: string }) =>
      fetchApi<WatchlistGroup>("/groups", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (
      id: number,
      data: { name?: string; color?: string; alertEnabled?: boolean },
    ) =>
      fetchApi<void>(`/groups/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      fetchApi<void>(`/groups/${id}`, {
        method: "DELETE",
      }),
  },

  alerts: {
    getAll: (unreadOnly: boolean = false) =>
      fetchApi<Alert[]>(`/alerts?unread=${unreadOnly}`),

    markRead: (id: number) =>
      fetchApi<void>(`/alerts/${id}/read`, { method: "PUT" }),

    resolve: (id: number) =>
      fetchApi<void>(`/alerts/${id}/resolve`, { method: "PUT" }),

    delete: (id: number) =>
      fetchApi<void>(`/alerts/${id}`, { method: "DELETE" }),
  },

  settings: {
    get: () => fetchApi<Record<string, unknown>>("/settings"),
    update: (data: Record<string, unknown>) =>
      fetchApi<void>("/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    testNotification: (data: { type: string; config: any }) =>
      fetchApi("/settings/test", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  monitor: {
    getStatus: () =>
      fetchApi<{ running: boolean; intervalMinutes: number }>(
        "/monitor/status",
      ),

    start: () =>
      fetchApi<{ running: boolean; intervalMinutes: number }>(
        "/monitor/start",
        {
          method: "POST",
        },
      ),

    stop: () =>
      fetchApi<{ running: boolean; intervalMinutes: number }>("/monitor/stop", {
        method: "POST",
      }),

    checkNow: () =>
      fetchApi<{ checkedCount: number; message: string }>(
        "/monitor/check-now",
        {
          method: "POST",
        },
      ),
  },
};

export default api;
