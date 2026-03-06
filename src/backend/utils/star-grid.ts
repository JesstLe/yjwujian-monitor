/**
 * 解析 starGrid JSON，兼容新旧两种格式
 * 旧格式: {"color":0,"style":0} 或 {"color":4,"style":4,"special":1}
 * 新格式: {"slots":[0,0,null,null]}
 */
export function parseStarGrid(starGridJson: string): {
    slots: (number | null)[];
} {
    const parsed = JSON.parse(starGridJson);
    // 如果已经是新格式，直接返回
    if (parsed.slots) {
        return parsed;
    }
    // 将旧格式转换为新的 slots 格式
    return {
        slots: [
            parsed.color ?? null,
            parsed.style ?? null,
            parsed.special ?? null,
            null, // 旧格式没有第4个槽位
        ],
    };
}

/**
 * 安全地将 collectCount 转为数字
 * CBG API 有时返回 "99+" 字符串
 */
export function safeCollectCount(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}
