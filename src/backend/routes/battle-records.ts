import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { battleRecordService } from "../services/battle-record";
import type {
  ApiResponse,
  BattleMatch,
  BattlePlayer,
  PlayerWatchlistEntry,
} from "@shared/types";

const router = Router();

router.use(requireAuth);

const searchSchema = z.object({
  q: z.string().trim().default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const matchPageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const watchSchema = z.object({
  playerId: z.string().min(1),
  notes: z.string().trim().max(300).optional(),
});

const discoverSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

router.get("/search", async (req, res) => {
  try {
    const { q, page, limit } = searchSchema.parse(req.query);
    const result = await battleRecordService.searchPlayersWithSync(q, page, limit);
    const pageCount = Math.max(1, Math.ceil(result.total / limit));

    const response: ApiResponse<BattlePlayer[]> = {
      success: true,
      data: result.players,
      meta: {
        total: result.total,
        page,
        limit,
        pageCount,
      },
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "搜索失败";
    res.status(400).json({ success: false, error: message });
  }
});

router.get("/player/:id", (req, res) => {
  try {
    const player = battleRecordService.getPlayer(req.params.id);
    if (!player) {
      return res.status(404).json({ success: false, error: "玩家不存在" });
    }

    if (player.profileHidden) {
      return res
        .status(403)
        .json({ success: false, error: "该玩家已开启战绩隐藏" });
    }

    res.json({ success: true, data: player } as ApiResponse<BattlePlayer>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取玩家失败";
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/player/:id/matches", async (req, res) => {
  try {
    const player = battleRecordService.getPlayer(req.params.id);
    if (!player) {
      return res.status(404).json({ success: false, error: "玩家不存在" });
    }

    if (player.profileHidden) {
      return res
        .status(403)
        .json({ success: false, error: "该玩家已开启战绩隐藏" });
    }

    await battleRecordService.refreshPlayerMatchesIfStale(req.params.id);

    const { page, limit } = matchPageSchema.parse(req.query);
    const result = battleRecordService.getMatches(req.params.id, page, limit);
    const pageCount = Math.max(1, Math.ceil(result.total / limit));

    const response: ApiResponse<BattleMatch[]> = {
      success: true,
      data: result.matches,
      meta: {
        total: result.total,
        page,
        limit,
        pageCount,
        isLastPage: page >= pageCount,
      },
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取战绩失败";
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/watchlist", (req, res) => {
  try {
    const userId = req.user!.id;
    const list = battleRecordService.getWatchlist(userId);
    res.json({ success: true, data: list } as ApiResponse<PlayerWatchlistEntry[]>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取关注列表失败";
    res.status(500).json({ success: false, error: message });
  }
});

router.post("/watchlist", (req, res) => {
  try {
    const userId = req.user!.id;
    const payload = watchSchema.parse(req.body);
    const player = battleRecordService.getPlayer(payload.playerId);
    if (!player) {
      return res.status(404).json({ success: false, error: "玩家不存在" });
    }
    if (player.profileHidden) {
      return res
        .status(403)
        .json({ success: false, error: "该玩家已开启战绩隐藏" });
    }
    const entry = battleRecordService.addWatch(userId, payload.playerId, payload.notes);
    res.status(201).json({ success: true, data: entry } as ApiResponse<PlayerWatchlistEntry>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "关注失败";
    res.status(400).json({ success: false, error: message });
  }
});

router.post("/discover", (req, res) => {
  try {
    if (process.env.BATTLE_MOCK_ENABLED !== "true") {
      return res.status(403).json({
        success: false,
        error: "当前环境未启用模拟战绩数据",
      });
    }

    const payload = discoverSchema.parse(req.body);
    const player = battleRecordService.discoverPlayer(payload.name);
    res.status(201).json({ success: true, data: player } as ApiResponse<BattlePlayer>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建玩家失败";
    res.status(400).json({ success: false, error: message });
  }
});

router.delete("/watchlist/:id", (req, res) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: "参数错误" });
    }

    const removed = battleRecordService.removeWatch(userId, id);
    if (!removed) {
      return res.status(404).json({ success: false, error: "关注项不存在" });
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取消关注失败";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
