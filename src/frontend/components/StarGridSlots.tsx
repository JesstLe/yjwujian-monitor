import type { VariationInfo } from "@shared/types";

interface StarGridSlotsProps {
  variationInfo: VariationInfo | null;
  dense?: boolean;
}

function toSlots(variationInfo: VariationInfo | null) {
  if (!variationInfo) {
    return [];
  }

  const qualities = variationInfo.variationQuality.split("-");
  return variationInfo.variationId.split("-").map((value, index) => {
    const quality = Number(qualities[index] || 0);
    return {
      value,
      quality,
      locked: quality <= 0 || value === "0",
    };
  });
}

function starsByQuality(quality: number) {
  if (quality <= 0) {
    return "☆";
  }

  return `${"★".repeat(Math.min(quality, 5))}${"☆".repeat(Math.max(0, 5 - quality))}`;
}

export default function StarGridSlots({ variationInfo, dense = false }: StarGridSlotsProps) {
  const slots = toSlots(variationInfo);

  if (slots.length === 0) {
    return null;
  }

  return (
    <ul className={`grid grid-cols-4 ${dense ? "gap-1.5" : "gap-2"}`}>
      {slots.map((slot, index) => (
        <li
          key={`${slot.value}-${index}`}
          className={`rounded-md border text-center ${
            dense
              ? "px-1.5 py-1 border-gray-200 bg-gray-50"
              : "p-2 border-slate-700/70 bg-slate-900/40"
          }`}
          title={`槽${index + 1}`}
        >
          <div
            className={dense ? "text-[10px] leading-none" : "text-[11px] leading-none"}
            style={{ color: slot.locked ? "#9ca3af" : "#f59e0b" }}
          >
            {starsByQuality(slot.quality)}
          </div>
          {!slot.locked && (
            <p
              className={
                dense
                  ? "mt-0.5 text-[11px] leading-none font-medium text-gray-600"
                  : "mt-1 text-sm font-semibold text-slate-200"
              }
            >
              {slot.value}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
