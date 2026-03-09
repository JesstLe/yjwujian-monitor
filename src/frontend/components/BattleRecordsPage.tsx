import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import type { BattlePlayer, PlayerWatchlistEntry } from "@shared/types";

export default function BattleRecordsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<BattlePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<PlayerWatchlistEntry[]>([]);
  const [notesByPlayer, setNotesByPlayer] = useState<Record<string, string>>({});

  const watchedPlayerIds = useMemo(() => {
    return new Set(watchlist.map((entry) => entry.playerId));
  }, [watchlist]);

  const watchedEntryIdByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    watchlist.forEach((entry) => map.set(entry.playerId, entry.id));
    return map;
  }, [watchlist]);

  const loadWatchlist = async () => {
    try {
      const list = await api.battleRecords.getWatchlist();
      setWatchlist(list);
    } catch (err) {
      console.error(err);
    }
  };

  const searchPlayers = async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.battleRecords.search({ q: value, page: 1, limit: 12 });
      setPlayers(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "搜索失败";
      setError(message);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
    searchPlayers("");
  }, []);

  const handleSearch = () => {
    searchPlayers(query.trim());
  };

  const handleWatch = async (playerId: string) => {
    try {
      const notes = notesByPlayer[playerId]?.trim();
      await api.battleRecords.addWatch({ playerId, notes: notes || undefined });
      await loadWatchlist();
    } catch (err) {
      const message = err instanceof Error ? err.message : "关注失败";
      setError(message);
    }
  };

  const handleUnwatch = async (playerId: string) => {
    try {
      const entryId = watchedEntryIdByPlayer.get(playerId);
      if (!entryId) return;
      await api.battleRecords.removeWatch(entryId);
      await loadWatchlist();
    } catch (err) {
      const message = err instanceof Error ? err.message : "取消关注失败";
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">战绩助手</h1>
        <p className="text-sm text-gray-500 mt-1">
          搜索玩家、查看最近战绩，并加入你的关注列表。
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="输入玩家昵称，例如：不舟滩妖姬"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            搜索
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">玩家搜索结果</h2>
            {loading && <span className="text-xs text-gray-500">加载中...</span>}
          </div>
          <div className="space-y-3">
            {players.length === 0 && !loading ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">暂无结果，试试输入昵称后搜索。</p>
                <p className="text-xs text-amber-600">
                  将尝试通过小黑盒战绩接口实时同步；若仍无结果，可能是昵称不匹配或该玩家开启了隐私限制。
                </p>
              </div>
            ) : (
              players.map((player) => {
                const watched = watchedPlayerIds.has(player.id);
                return (
                  <div
                    key={player.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{player.roleName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          服务器: {player.server} · 数据源: {player.source}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/battle-records/player/${player.id}`)}
                          className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          查看详情
                        </button>
                        {watched ? (
                          <button
                            onClick={() => handleUnwatch(player.id)}
                            className="px-3 py-1.5 rounded-md bg-gray-100 text-sm text-gray-700 hover:bg-gray-200"
                          >
                            取消关注
                          </button>
                        ) : (
                          <button
                            onClick={() => handleWatch(player.id)}
                            className="px-3 py-1.5 rounded-md bg-blue-600 text-sm text-white hover:bg-blue-700"
                          >
                            加入关注
                          </button>
                        )}
                      </div>
                    </div>
                    {!watched && (
                      <div className="mt-2">
                        <input
                          value={notesByPlayer[player.id] || ""}
                          onChange={(e) =>
                            setNotesByPlayer((prev) => ({
                              ...prev,
                              [player.id]: e.target.value,
                            }))
                          }
                          placeholder="关注备注（可选）"
                          className="w-full px-3 py-2 rounded-md border border-gray-300 text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">我的关注</h2>
          <div className="space-y-2">
            {watchlist.length === 0 ? (
              <p className="text-sm text-gray-500">暂无关注玩家</p>
            ) : (
              watchlist.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => navigate(`/battle-records/player/${entry.playerId}`)}
                  className="w-full text-left p-2 rounded-md border border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {entry.player?.roleName || entry.playerId}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{entry.notes}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
