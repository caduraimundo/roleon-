"use client";

export type FilterOption =
  | "Todos"
  | "Hoje"
  | "Samba"
  | "Pagode"
  | "MPB"
  | "Rock"
  | "Funk"
  | "Sertanejo"
  | "Grátis";

interface FilterBarProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

const filters: { label: FilterOption; emoji: string }[] = [
  { label: "Todos", emoji: "🎵" },
  { label: "Hoje", emoji: "📅" },
  { label: "Samba", emoji: "🥁" },
  { label: "Pagode", emoji: "🎸" },
  { label: "MPB", emoji: "🎤" },
  { label: "Rock", emoji: "🤘" },
  { label: "Funk", emoji: "🔥" },
  { label: "Sertanejo", emoji: "🤠" },
  { label: "Grátis", emoji: "🎁" },
];

export default function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div className="absolute top-4 left-0 right-0 z-10 px-4 pointer-events-none">
      <div className="flex gap-2 overflow-x-auto pb-1 pointer-events-auto no-scrollbar">
        {filters.map(({ label, emoji }) => {
          const isActive = activeFilter === label;
          return (
            <button
              key={label}
              onClick={() => onFilterChange(label)}
              style={isActive ? { backgroundColor: "#0EA5A0" } : undefined}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-md transition-colors",
                isActive
                  ? "text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50",
              ].join(" ")}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
