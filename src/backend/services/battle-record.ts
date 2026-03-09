import db from "../db/index";
import axios from "axios";
import {
  parseRequiredSqliteDateTime,
  parseSqliteDateTime,
} from "../utils/date-utils";
import type {
  BattleMatch,
  BattlePlayer,
  PlayerWatchlistEntry,
} from "@shared/types";

interface SearchResult {
  players: BattlePlayer[];
  total: number;
}

interface MatchPageResult {
  matches: BattleMatch[];
  total: number;
}

type ExternalPlayer = {
  roleId: string;
  roleName: string;
  profileHidden: boolean;
};

const BATTLE_PROVIDER = process.env.BATTLE_PROVIDER || "xiaoheihe";
const REAL_SOURCE_BASE_URL =
  process.env.BATTLE_REAL_SOURCE_BASE_URL || "https://gamedb.gamersky.com";
const REAL_SOURCE_SERVER = process.env.BATTLE_REAL_SOURCE_SERVER || "163";
const REAL_SYNC_TTL_MS = Number(process.env.BATTLE_REAL_SYNC_TTL_MS || 5 * 60 * 1000);
const XIAOHEIHE_BASE_URL =
  process.env.BATTLE_XIAOHEIHE_BASE_URL || "https://api.xiaoheihe.cn";
const XIAOHEIHE_COOKIE = process.env.BATTLE_XIAOHEIHE_COOKIE || "";
const XIAOHEIHE_HEYBOX_ID = process.env.BATTLE_XIAOHEIHE_HEYBOX_ID || "1057809";
const XIAOHEIHE_BATTLE_TID = process.env.BATTLE_XIAOHEIHE_BATTLE_TID || "5000001";
const XIAOHEIHE_SEASON = process.env.BATTLE_XIAOHEIHE_SEASON || "pre-01";

const MODE_LABEL_MAP: Record<string, string> = {
  "4": "天人之战-单排",
  "5": "天人之战-三排",
  "6": "快速匹配-单排",
  "7": "快速匹配-三排",
  "12": "天选之人-双排",
  "5000000": "天选之人-单排",
  "5000001": "天选之人-三排",
  "5000010": "无尽试炼",
};

type BattlePlayerRow = {
  id: string;
  role_name: string;
  server: string;
  source: string;
  profile_hidden: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

type BattleHistoryRow = {
  id: number;
  player_id: string;
  match_id: string;
  mode: string | null;
  hero: string | null;
  rank: number | null;
  kills: number | null;
  damage: number | null;
  result: string | null;
  played_at: string;
};

type WatchlistRow = {
  id: number;
  user_id: string;
  player_id: string;
  notes: string | null;
  alert_enabled: number;
  last_notified_match_id: string | null;
  added_at: string;
  role_name: string;
  server: string;
  source: string;
  profile_hidden: number;
  last_synced_at: string | null;
  player_created_at: string;
  player_updated_at: string;
};

function toBattlePlayer(row: BattlePlayerRow): BattlePlayer {
  return {
    id: row.id,
    roleName: row.role_name,
    server: row.server,
    source: row.source,
    profileHidden: row.profile_hidden === 1,
    lastSyncedAt: parseSqliteDateTime(row.last_synced_at),
    createdAt: parseRequiredSqliteDateTime(row.created_at),
    updatedAt: parseRequiredSqliteDateTime(row.updated_at),
  };
}

function toBattleMatch(row: BattleHistoryRow): BattleMatch {
  const result = row.result;
  const normalizedResult: BattleMatch["result"] =
    result === "win" || result === "top10" || result === "normal"
      ? result
      : "normal";

  return {
    id: row.id,
    playerId: row.player_id,
    matchId: row.match_id,
    mode: row.mode || "未知模式",
    hero: row.hero || "未知英雄",
    rank: row.rank || 0,
    kills: row.kills || 0,
    damage: row.damage || 0,
    result: normalizedResult,
    playedAt: parseRequiredSqliteDateTime(row.played_at),
  };
}

function hashText(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function seededRandom(seed: number) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HERO_POOL = [
  "胡桃",
  "宁红夜",
  "迦南",
  "特木尔",
  "季沧海",
  "天海",
  "妖刀姬",
  "崔三娘",
  "岳山",
  "无尘",
];

const MODE_POOL = ["天选单排", "天选三排", "匹配单排", "匹配三排"];

class BattleRecordService {
  private getProviderHeaders() {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    };

    if (BATTLE_PROVIDER === "xiaoheihe" && XIAOHEIHE_COOKIE) {
      headers.Cookie = XIAOHEIHE_COOKIE;
    }

    return headers;
  }

  private normalizeMode(raw: Record<string, unknown>): string {
    const modeText =
      (typeof raw.battleMode === "string" && raw.battleMode) ||
      (typeof raw.mode === "string" && raw.mode) ||
      "";
    if (modeText) {
      return modeText;
    }

    const modeId =
      (typeof raw.battle_tid === "number" && String(raw.battle_tid)) ||
      (typeof raw.battle_tid === "string" && raw.battle_tid) ||
      (typeof raw.modeId === "string" && raw.modeId) ||
      "";

    return MODE_LABEL_MAP[modeId] || (modeId ? `模式-${modeId}` : "未知模式");
  }

  private extractPlayerList(payload: Record<string, unknown>): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = [];
    const data = payload.data;
    const result = payload.result;

    if (data && typeof data === "object") {
      const dataObj = data as Record<string, unknown>;
      if (Array.isArray(dataObj.list)) {
        out.push(
          ...(dataObj.list.filter((item) => item && typeof item === "object") as Record<
            string,
            unknown
          >[]),
        );
      }
      if (Array.isArray(dataObj.userList)) {
        out.push(
          ...(dataObj.userList.filter((item) => item && typeof item === "object") as Record<
            string,
            unknown
          >[]),
        );
      }
    }

    if (result && typeof result === "object") {
      const resultObj = result as Record<string, unknown>;
      if (Array.isArray(resultObj.user_list)) {
        out.push(
          ...(resultObj.user_list.filter((item) => item && typeof item === "object") as Record<
            string,
            unknown
          >[]),
        );
      }
    }

    return out;
  }

  private extractMatchesList(payload: Record<string, unknown>): Record<string, unknown>[] {
    const data = payload.data;
    if (data && typeof data === "object") {
      const dataObj = data as Record<string, unknown>;
      if (Array.isArray(dataObj.list)) {
        return dataObj.list.filter((item) => item && typeof item === "object") as Record<
          string,
          unknown
        >[];
      }
    }

    const result = payload.result;
    if (result && typeof result === "object") {
      const resultObj = result as Record<string, unknown>;
      if (Array.isArray(resultObj.matches)) {
        return resultObj.matches.filter((item) => item && typeof item === "object") as Record<
          string,
          unknown
        >[];
      }
    }

    return [];
  }

  private resolvePlayedAt(raw: Record<string, unknown>, fallbackIndex: number): string {
    const candidateKeys = [
      "start_ts",
      "startTs",
      "start_time",
      "startTime",
      "time",
      "ts",
      "createTime",
      "end_ts",
    ];

    for (const key of candidateKeys) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        const ms = value > 10_000_000_000 ? value : value * 1000;
        return new Date(ms).toISOString();
      }
      if (typeof value === "string" && value.trim()) {
        const asNum = Number(value);
        if (!Number.isNaN(asNum)) {
          const ms = asNum > 10_000_000_000 ? asNum : asNum * 1000;
          return new Date(ms).toISOString();
        }
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
          return new Date(parsed).toISOString();
        }
      }
    }

    return new Date(Date.now() - fallbackIndex * 60 * 1000).toISOString();
  }

  private deriveResult(rank: number): BattleMatch["result"] {
    if (rank === 1) {
      return "win";
    }
    if (rank > 1 && rank <= 10) {
      return "top10";
    }
    return "normal";
  }

  private parseExternalPlayers(payload: unknown): ExternalPlayer[] {
    if (!payload || typeof payload !== "object") {
      return [];
    }

    const maybeObj = payload as Record<string, unknown>;
    const candidates = this.extractPlayerList(maybeObj);

    const mapped = candidates
      .map((item) => {
        const roleIdRaw = item.roleId ?? item.role_id;
        const roleId =
          typeof roleIdRaw === "string"
            ? roleIdRaw
            : typeof roleIdRaw === "number"
              ? String(roleIdRaw)
              : "";
        const roleName =
          (typeof item.roleName === "string" && item.roleName) ||
          (typeof item.role_name === "string" && item.role_name) ||
          "";
        const hiddenRaw =
          item.profile_hidden ??
          item.profileHidden ??
          item.hidden ??
          item.record_hidden ??
          0;
        const hidden =
          hiddenRaw === 1 ||
          hiddenRaw === true ||
          hiddenRaw === "1" ||
          hiddenRaw === "true";

        if (!roleId || !roleName) {
          return null;
        }

        return {
          roleId,
          roleName,
          profileHidden: hidden,
        };
      })
      .filter((item): item is ExternalPlayer => Boolean(item));

    const seen = new Set<string>();
    return mapped.filter((item) => {
      if (seen.has(item.roleId)) {
        return false;
      }
      seen.add(item.roleId);
      return true;
    });
  }

  private upsertExternalPlayer(
    player: ExternalPlayer,
    rawProfile: unknown,
    source: string,
  ): BattlePlayer {
    db.prepare(
      `INSERT INTO battle_players (id, role_name, server, source, profile_hidden, raw_profile, last_synced_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         role_name = excluded.role_name,
         server = excluded.server,
         source = excluded.source,
         profile_hidden = excluded.profile_hidden,
         raw_profile = excluded.raw_profile,
         last_synced_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
    ).run(
      player.roleId,
      player.roleName,
      REAL_SOURCE_SERVER,
      source,
      player.profileHidden ? 1 : 0,
      JSON.stringify({
        provider: source,
        roleId: player.roleId,
        roleName: player.roleName,
        fetchedAt: new Date().toISOString(),
        hasPayload: Boolean(rawProfile),
      }),
    );

    const row = db
      .prepare(
        `SELECT id, role_name, server, source, profile_hidden, last_synced_at, created_at, updated_at
         FROM battle_players WHERE id = ?`,
      )
      .get(player.roleId) as BattlePlayerRow;

    return toBattlePlayer(row);
  }

  async syncPlayerFromRealSourceByName(name: string): Promise<BattlePlayer[]> {
    const q = name.trim();
    if (!q) {
      return [];
    }

    let response;
    let source = "unknown";

    if (BATTLE_PROVIDER === "xiaoheihe") {
      response = await axios.post(
        `${XIAOHEIHE_BASE_URL}/game/yjwj/search`,
        undefined,
        {
          params: {
            q,
          },
          timeout: 12000,
          headers: this.getProviderHeaders(),
        },
      );
      source = "xiaoheihe";
    } else {
      response = await axios.get(`${REAL_SOURCE_BASE_URL}/yjwujian/search/getSearchResult`, {
        params: {
          serverId: REAL_SOURCE_SERVER,
          roleName: q,
        },
        timeout: 12000,
        headers: this.getProviderHeaders(),
      });
      source = "gamedb";
    }

    const players = this.parseExternalPlayers(response.data);
    if (players.length === 0) {
      return [];
    }

    return players.map((item) => this.upsertExternalPlayer(item, response.data, source));
  }

  async syncRecentMatches(playerId: string, pageSize: number = 50): Promise<number> {
    let response;
    let source = "unknown";

    if (BATTLE_PROVIDER === "xiaoheihe") {
      try {
        await axios.post(`${XIAOHEIHE_BASE_URL}/game/yjwj/update`, undefined, {
          params: {
            server: REAL_SOURCE_SERVER,
            role_id: playerId,
          },
          timeout: 10000,
          headers: this.getProviderHeaders(),
        });
      } catch {
      }

      response = await axios.post(`${XIAOHEIHE_BASE_URL}/game/yjwj/home/data`, undefined, {
        params: {
          battle_tid: XIAOHEIHE_BATTLE_TID,
          season: XIAOHEIHE_SEASON,
          server: REAL_SOURCE_SERVER,
          role_id: playerId,
          heybox_id: XIAOHEIHE_HEYBOX_ID,
        },
        timeout: 12000,
        headers: this.getProviderHeaders(),
      });
      source = "xiaoheihe";
    } else {
      response = await axios.get(
        `${REAL_SOURCE_BASE_URL}/yjwujian/record/getRecentRecords`,
        {
          params: {
            roleId: playerId,
            pageIndex: 1,
            pageSize,
          },
          timeout: 12000,
          headers: this.getProviderHeaders(),
        },
      );
      source = "gamedb";
    }

    const payload = response.data as Record<string, unknown>;
    const list = this.extractMatchesList(payload);

    const insertStmt = db.prepare(
      `INSERT OR IGNORE INTO battle_history (
        player_id, match_id, mode, hero, rank, kills, damage, result, played_at, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    let inserted = 0;

    list.forEach((entry, idx) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const row = entry as Record<string, unknown>;

      const mode = this.normalizeMode(row);
      const tsCandidate = Number(
        row.time ?? row.start_ts ?? row.startTs ?? row.start_time ?? row.end_ts ?? 0,
      );
      const stableTs = Number.isFinite(tsCandidate) && tsCandidate > 0 ? tsCandidate : 0;
      const modeKey = String(row.battle_tid ?? row.modeId ?? mode);

      const matchId =
        (typeof row.roomId === "string" && row.roomId) ||
        (typeof row.roomId === "number" && String(row.roomId)) ||
        (typeof row.room_id === "string" && row.room_id) ||
        (typeof row.room_id === "number" && String(row.room_id)) ||
        (typeof row.matchId === "string" && row.matchId) ||
        (typeof row.matchId === "number" && String(row.matchId)) ||
        `${playerId}-${modeKey}-${stableTs}-${idx}`;
      const hero =
        (typeof row.hero === "string" && row.hero) ||
        (typeof row.heroName === "string" && row.heroName) ||
        (typeof row.hero_id === "string" && row.hero_id) ||
        "未知英雄";

      const rank = Number(row.rank ?? 0) || 0;
      const kills = Number(row.killTimes ?? row.kills ?? 0) || 0;
      const damage = Number(row.damage ?? 0) || 0;
      const result = this.deriveResult(rank);
      const playedAt = this.resolvePlayedAt(row, idx);

      const runResult = insertStmt.run(
        playerId,
        matchId,
        mode,
        hero,
        rank,
        kills,
        damage,
        result,
        playedAt,
        JSON.stringify(row),
      );

      inserted += runResult.changes > 0 ? 1 : 0;
    });

    db.prepare(
      `UPDATE battle_players
       SET source = ?, last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).run(source, playerId);

    return inserted;
  }

  async refreshPlayerMatchesIfStale(playerId: string): Promise<void> {
    const player = this.getPlayer(playerId);
    if (!player || player.profileHidden || player.source === "mock") {
      return;
    }

    const totalRow = db
      .prepare(`SELECT COUNT(1) AS count FROM battle_history WHERE player_id = ?`)
      .get(playerId) as { count: number };

    const now = Date.now();
    const syncedAt = player.lastSyncedAt ? new Date(player.lastSyncedAt).getTime() : 0;
    const stale = !syncedAt || now - syncedAt > REAL_SYNC_TTL_MS;

    if (totalRow.count === 0 || stale) {
      await this.syncRecentMatches(playerId, 50);
    }
  }

  private ensureSyntheticPlayer(name: string): BattlePlayer {
    const normalized = name.trim();
    const id = `mock-${hashText(normalized)}`;
    const existing = db
      .prepare(
        `SELECT id, role_name, server, source, profile_hidden, last_synced_at, created_at, updated_at
         FROM battle_players WHERE id = ?`,
      )
      .get(id) as BattlePlayerRow | undefined;

    if (!existing) {
      db.prepare(
        `INSERT INTO battle_players (id, role_name, server, source, profile_hidden, raw_profile, last_synced_at)
         VALUES (?, ?, '163', 'mock', 0, ?, CURRENT_TIMESTAMP)`,
      ).run(id, normalized, JSON.stringify({ queryName: normalized }));
    } else {
      db.prepare(
        `UPDATE battle_players SET role_name = ?, updated_at = CURRENT_TIMESTAMP, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).run(normalized, id);
    }

    this.ensureSyntheticMatches(id, 50);

    const row = db
      .prepare(
        `SELECT id, role_name, server, source, profile_hidden, last_synced_at, created_at, updated_at
         FROM battle_players WHERE id = ?`,
      )
      .get(id) as BattlePlayerRow;

    return toBattlePlayer(row);
  }

  private ensureSyntheticMatches(playerId: string, desiredCount: number) {
    const countRow = db
      .prepare(`SELECT COUNT(1) AS count FROM battle_history WHERE player_id = ?`)
      .get(playerId) as { count: number };

    const existingCount = countRow.count;
    if (existingCount >= desiredCount) {
      return;
    }

    const randomSeed = parseInt(hashText(playerId).slice(0, 6), 36) || 123456;
    const rand = seededRandom(randomSeed);
    const insertStmt = db.prepare(
      `INSERT OR IGNORE INTO battle_history (
        player_id, match_id, mode, hero, rank, kills, damage, result, played_at, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const now = Date.now();

    for (let idx = existingCount; idx < desiredCount; idx += 1) {
      const rank = Math.floor(rand() * 60) + 1;
      const kills = Math.floor(rand() * 9);
      const damage = 3000 + Math.floor(rand() * 16000);
      const result = rank === 1 ? "win" : rank <= 10 ? "top10" : "normal";
      const mode = MODE_POOL[Math.floor(rand() * MODE_POOL.length)];
      const hero = HERO_POOL[Math.floor(rand() * HERO_POOL.length)];
      const playedAt = new Date(now - idx * 1000 * 60 * 90).toISOString();
      const matchId = `${playerId}-m-${idx + 1}`;

      insertStmt.run(
        playerId,
        matchId,
        mode,
        hero,
        rank,
        kills,
        damage,
        result,
        playedAt,
        JSON.stringify({ mode, hero, rank, kills, damage }),
      );
    }
  }

  searchPlayers(query: string, page: number, limit: number): SearchResult {
    const q = query.trim();
    const offset = (page - 1) * limit;

    let total = 0;
    let rows: BattlePlayerRow[] = [];

    if (q) {
      const keyword = `%${q}%`;
      const totalRow = db
        .prepare(
          `SELECT COUNT(1) AS count FROM battle_players WHERE role_name LIKE ?`,
        )
        .get(keyword) as { count: number };
      total = totalRow.count;
      rows = db
        .prepare(
          `SELECT id, role_name, server, source, profile_hidden, last_synced_at, created_at, updated_at
           FROM battle_players
           WHERE role_name LIKE ?
           ORDER BY updated_at DESC
           LIMIT ? OFFSET ?`,
        )
        .all(keyword, limit, offset) as BattlePlayerRow[];
    } else {
      const totalRow = db
        .prepare(`SELECT COUNT(1) AS count FROM battle_players`)
        .get() as { count: number };
      total = totalRow.count;
      rows = db
        .prepare(
          `SELECT id, role_name, server, source, profile_hidden, last_synced_at, created_at, updated_at
           FROM battle_players
           ORDER BY updated_at DESC
           LIMIT ? OFFSET ?`,
        )
        .all(limit, offset) as BattlePlayerRow[];
    }

    return {
      players: rows.map(toBattlePlayer),
      total,
    };
  }

  async searchPlayersWithSync(
    query: string,
    page: number,
    limit: number,
  ): Promise<SearchResult> {
    const localResult = this.searchPlayers(query, page, limit);
    const q = query.trim();

    if (!q || localResult.total > 0) {
      return localResult;
    }

    try {
      await this.syncPlayerFromRealSourceByName(q);
      return this.searchPlayers(query, page, limit);
    } catch (error) {
      if (localResult.total === 0) {
        const detail = error instanceof Error ? error.message : "未知错误";
        throw new Error(`小黑盒战绩源请求失败: ${detail}`);
      }
      return localResult;
    }
  }

  discoverPlayer(name: string): BattlePlayer {
    return this.ensureSyntheticPlayer(name);
  }

  getPlayer(playerId: string): BattlePlayer | null {
    const row = db
      .prepare(
        `SELECT id, role_name, server, source, profile_hidden, last_synced_at, created_at, updated_at
         FROM battle_players WHERE id = ?`,
      )
      .get(playerId) as BattlePlayerRow | undefined;

    if (!row) {
      return null;
    }

    return toBattlePlayer(row);
  }

  getMatches(playerId: string, page: number, limit: number): MatchPageResult {
    const offset = (page - 1) * limit;
    const totalRow = db
      .prepare(`SELECT COUNT(1) AS count FROM battle_history WHERE player_id = ?`)
      .get(playerId) as { count: number };
    const total = totalRow.count;

    const rows = db
      .prepare(
        `SELECT id, player_id, match_id, mode, hero, rank, kills, damage, result, played_at
         FROM battle_history
         WHERE player_id = ?
         ORDER BY played_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(playerId, limit, offset) as BattleHistoryRow[];

    return {
      matches: rows.map(toBattleMatch),
      total,
    };
  }

  getWatchlist(userId: string): PlayerWatchlistEntry[] {
    const rows = db
      .prepare(
        `SELECT
          w.id,
          w.user_id,
          w.player_id,
          w.notes,
          w.alert_enabled,
          w.last_notified_match_id,
          w.added_at,
          p.role_name,
          p.server,
          p.source,
          p.profile_hidden,
          p.last_synced_at,
          p.created_at AS player_created_at,
          p.updated_at AS player_updated_at
        FROM player_watchlist w
        JOIN battle_players p ON p.id = w.player_id
        WHERE w.user_id = ?
        ORDER BY w.added_at DESC`,
      )
      .all(userId) as WatchlistRow[];

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      playerId: row.player_id,
      notes: row.notes,
      alertEnabled: row.alert_enabled === 1,
      lastNotifiedMatchId: row.last_notified_match_id,
      addedAt: parseRequiredSqliteDateTime(row.added_at),
      player: {
        id: row.player_id,
        roleName: row.role_name,
        server: row.server,
        source: row.source,
        profileHidden: row.profile_hidden === 1,
        lastSyncedAt: parseSqliteDateTime(row.last_synced_at),
        createdAt: parseRequiredSqliteDateTime(row.player_created_at),
        updatedAt: parseRequiredSqliteDateTime(row.player_updated_at),
      },
    }));
  }

  addWatch(userId: string, playerId: string, notes?: string): PlayerWatchlistEntry {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error("玩家不存在");
    }

    db.prepare(
      `INSERT OR IGNORE INTO player_watchlist (user_id, player_id, notes, alert_enabled)
       VALUES (?, ?, ?, 1)`,
    ).run(userId, playerId, notes || null);

    const row = db
      .prepare(
        `SELECT
          w.id,
          w.user_id,
          w.player_id,
          w.notes,
          w.alert_enabled,
          w.last_notified_match_id,
          w.added_at,
          p.role_name,
          p.server,
          p.source,
          p.profile_hidden,
          p.last_synced_at,
          p.created_at AS player_created_at,
          p.updated_at AS player_updated_at
        FROM player_watchlist w
        JOIN battle_players p ON p.id = w.player_id
        WHERE w.user_id = ? AND w.player_id = ?`,
      )
      .get(userId, playerId) as WatchlistRow;

    return {
      id: row.id,
      userId: row.user_id,
      playerId: row.player_id,
      notes: row.notes,
      alertEnabled: row.alert_enabled === 1,
      lastNotifiedMatchId: row.last_notified_match_id,
      addedAt: parseRequiredSqliteDateTime(row.added_at),
      player,
    };
  }

  removeWatch(userId: string, watchId: number): boolean {
    const result = db
      .prepare(`DELETE FROM player_watchlist WHERE id = ? AND user_id = ?`)
      .run(watchId, userId);
    return result.changes > 0;
  }
}

export const battleRecordService = new BattleRecordService();
