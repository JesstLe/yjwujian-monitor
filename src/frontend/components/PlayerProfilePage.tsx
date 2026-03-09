import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import type { BattleMatch, BattlePlayer } from "@shared/types";

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<BattlePlayer | null>(null);
  const [matches, setMatches] = useState<BattleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadPage = async (targetPage: number, append: boolean) => {
    if (!id) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const [playerRes, matchRes] = await Promise.all([
        api.battleRecords.getPlayer(id),
        api.battleRecords.getMatches(id, targetPage, 20),
      ]);

      setPlayer(playerRes);
      setMatches((prev) => (append ? [...prev, ...(matchRes.data || [])] : matchRes.data || []));
      setHasMore(Boolean(matchRes.meta && targetPage < matchRes.meta.pageCount));
      setPage(targetPage);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPage(1, false);
  }, [id]);

  if (loading) {
    return <div className="text-sm text-gray-500">加载中...</div>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => navigate("/battle-records")}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          返回战绩助手
        </button>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/battle-records")}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        返回战绩助手
      </button>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h1 className="text-2xl font-bold text-gray-900">{player?.roleName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          服务器: {player?.server} · 数据源: {player?.source}
        </p>
        {player?.source === "mock" && (
          <p className="text-xs text-amber-600 mt-2">
            该玩家数据为历史模拟数据，不代表真实战绩。
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          最近同步: {player?.lastSyncedAt ? new Date(player.lastSyncedAt).toLocaleString() : "-"}
        </p>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">最近战绩</h2>

        {matches.length === 0 ? (
          <p className="text-sm text-gray-500">暂无战绩</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4">时间</th>
                  <th className="py-2 pr-4">模式</th>
                  <th className="py-2 pr-4">英雄</th>
                  <th className="py-2 pr-4">排名</th>
                  <th className="py-2 pr-4">击杀</th>
                  <th className="py-2 pr-4">伤害</th>
                  <th className="py-2 pr-4">结果</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-700">
                      {new Date(match.playedAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{match.mode}</td>
                    <td className="py-2 pr-4 text-gray-700">{match.hero}</td>
                    <td className="py-2 pr-4 text-gray-700">#{match.rank}</td>
                    <td className="py-2 pr-4 text-gray-700">{match.kills}</td>
                    <td className="py-2 pr-4 text-gray-700">{match.damage}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          match.result === "win"
                            ? "bg-emerald-100 text-emerald-700"
                            : match.result === "top10"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {match.result === "win"
                          ? "吃鸡"
                          : match.result === "top10"
                            ? "前十"
                            : "普通"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div className="mt-4">
            <button
              onClick={() => loadPage(page + 1, true)}
              disabled={loadingMore}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {loadingMore ? "加载中..." : "加载更多"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
