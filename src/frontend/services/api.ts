import type {
  ApiResponse,
  Item,
  WatchlistEntry,
  WatchlistGroup,
  Alert,
  PriceHistoryPoint,
  CompareItem,
  BattlePlayer,
  BattleMatch,
  PlayerWatchlistEntry,
  User,
  AuthResponse,
} from "@shared/types";

const API_BASE = "/api";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();

  if (!data.success && data.error) {
    throw new Error(data.error || "Request failed");
  }

  return data.data ?? data;
}

async function fetchApiWithMeta<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();

  if (!data.success && data.error) {
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
      variationUnlockLevel?: number;
      seller?: string;
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
      params?: {
        searchType?: string;
        page?: number;
        sort?: string;
        variationUnlockLevel?: number;
        slotIndex?: number;
        targetValue?: number;
        minValue?: number;
        maxValue?: number;
        seller?: string;
      },
    ) => {
      const {
        searchType,
        page,
        sort,
        variationUnlockLevel,
        slotIndex,
        targetValue,
        minValue,
        maxValue,
        seller,
      } = params || {};
      const queryParams = new URLSearchParams();
      if (searchType) queryParams.append("searchType", searchType);
      if (page) queryParams.append("page", String(page));
      if (sort) queryParams.append("sort", sort);
      if (variationUnlockLevel !== undefined) {
        queryParams.append(
          "variationUnlockLevel",
          String(variationUnlockLevel),
        );
      }
      if (slotIndex !== undefined)
        queryParams.append("slotIndex", String(slotIndex));
      if (targetValue !== undefined) {
        queryParams.append("targetValue", String(targetValue));
      }
      if (minValue !== undefined)
        queryParams.append("minValue", String(minValue));
      if (maxValue !== undefined)
        queryParams.append("maxValue", String(maxValue));
      if (seller) queryParams.append("seller", seller);
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
    testNotification: (data: { type: string; config: unknown }) =>
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

  // Compare API - 对比功能
  compare: {
    // 获取所有物品类型列表
    getTypes: () => fetchApi<Item[]>("/compare/types"),

    // 按父层+编号搜索子物品
    searchBySerialNum: (
      parentTypeId: string,
      serialNum: string,
      maxPages?: number,
    ) => {
      const params = new URLSearchParams();
      params.append("parentTypeId", parentTypeId);
      params.append("serialNum", serialNum);
      if (maxPages) params.append("maxPages", String(maxPages));
      return fetchApi<Item | null>(`/compare/search?${params}`);
    },

    // 对比列表 CRUD
    getAll: () => fetchApi<CompareItem[]>("/compare"),

    add: (item: Omit<CompareItem, "id">) =>
      fetchApi<CompareItem>("/compare", {
        method: "POST",
        body: JSON.stringify(item),
      }),

    remove: (id: string) =>
      fetchApi<void>(`/compare/${id}`, {
        method: "DELETE",
      }),
  },

  // Auth API - 认证功能
  auth: {
    register: async (
      email: string,
      password: string,
      username?: string,
    ): Promise<AuthResponse> => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
        credentials: "include",
      });
      return response.json();
    },

    login: async (email: string, password: string): Promise<AuthResponse> => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      return response.json();
    },

    logout: async (): Promise<{ success: boolean }> => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      return response.json();
    },

    verifyEmail: async (token: string): Promise<AuthResponse> => {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "include",
      });
      return response.json();
    },

    verifyDevice: async (
      email: string,
      code: string,
    ): Promise<AuthResponse> => {
      const response = await fetch("/api/auth/verify-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
        credentials: "include",
      });
      return response.json();
    },

    forgotPassword: async (
      email: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      return response.json();
    },

    resetPassword: async (
      token: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
        credentials: "include",
      });
      return response.json();
    },

    getMe: async (): Promise<{
      success: boolean;
      user?: User;
      error?: string;
    }> => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      return response.json();
    },

    resendVerification: async (
      email: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      return response.json();
    },
  },

  battleRecords: {
    search: (params: { q?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.append("q", params.q);
      if (params.page) searchParams.append("page", String(params.page));
      if (params.limit) searchParams.append("limit", String(params.limit));
      return fetchApiWithMeta<BattlePlayer[]>(
        `/battle-records/search?${searchParams}`,
      );
    },

    getPlayer: (id: string) => fetchApi<BattlePlayer>(`/battle-records/player/${id}`),

    getMatches: (id: string, page: number = 1, limit: number = 20) =>
      fetchApiWithMeta<BattleMatch[]>(
        `/battle-records/player/${id}/matches?page=${page}&limit=${limit}`,
      ),

    getWatchlist: () =>
      fetchApi<PlayerWatchlistEntry[]>("/battle-records/watchlist"),

    addWatch: (data: { playerId: string; notes?: string }) =>
      fetchApi<PlayerWatchlistEntry>("/battle-records/watchlist", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    removeWatch: (id: number) =>
      fetchApi<void>(`/battle-records/watchlist/${id}`, { method: "DELETE" }),
  },
};

export default api;
