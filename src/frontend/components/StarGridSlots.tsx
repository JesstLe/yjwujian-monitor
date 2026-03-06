import type { VariationInfo } from "@shared/types";

interface StarGridSlotsProps {
  variationInfo: VariationInfo | null;
  theme?: "light" | "dark";
}

function toSlots(variationInfo: VariationInfo | null) {
  if (!variationInfo) {
    return [];
  }

  const names = variationInfo.variationName.split("-");
  const qualities = variationInfo.variationQuality.split("-");
  const values = variationInfo.variationId.split("-");

  return values.map((value, index) => {
    const quality = Number(qualities[index] || 0);
    return {
      name: names[index] || `槽${index + 1}`,
      value,
      quality,
      locked: quality <= 0 || value === "0",
    };
  });
}

const STAR_COLORS: Record<number, string> = {
  5: "text-[#C83737]", // 红色
  4: "text-[#F59E0B]", // 金色 (amber-500)
  3: "text-[#AE5CDF]", // 紫色
  2: "text-[#4576D2]", // 蓝色
  1: "text-gray-400", // 灰色
  0: "text-transparent", // 不显示
};

export default function StarGridSlots({
  variationInfo,
  theme = "dark",
}: StarGridSlotsProps) {
  const slots = toSlots(variationInfo);

  if (slots.length === 0) {
    return null;
  }

  const isLight = theme === "light";

  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 w-full text-sm">
      {slots.map((slot, index) => {
        const starColor = STAR_COLORS[slot.quality] || STAR_COLORS[1];

        return (
          <li
            key={`${slot.name}-${index}`}
            className={`flex justify-between items-center py-1.5 border-b ${isLight ? "border-gray-100" : "border-slate-800/60"
              }`}
            title={`品质: ${slot.quality}`}
          >
            <span className={isLight ? "text-gray-500" : "text-slate-400"}>
              {slot.name}
            </span>
            {slot.locked ? (
              <span className={isLight ? "text-gray-300" : "text-slate-600"}>-</span>
            ) : (
              <div
                className={`flex items-center gap-0.5 font-mono ${isLight ? "text-gray-800 font-medium" : "text-slate-200"
                  }`}
              >
                <span className={`${starColor} text-sm drop-shadow-sm`}>★</span>
                <span>{slot.value}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
