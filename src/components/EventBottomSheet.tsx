"use client";

import { useEffect } from "react";
import { type Event } from "@/data/events";

interface EventBottomSheetProps {
  event: Event;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  Samba: "#F59E0B",
  Pagode: "#8B5CF6",
  MPB: "#3B82F6",
  Rock: "#EF4444",
  Funk: "#F97316",
  Sertanejo: "#10B981",
};

const categoryEmojis: Record<string, string> = {
  Samba: "🥁",
  Pagode: "🎸",
  MPB: "🎤",
  Rock: "🤘",
  Funk: "🔥",
  Sertanejo: "🤠",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function EventBottomSheet({ event, onClose }: EventBottomSheetProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const tagColor = categoryColors[event.category] ?? "#0EA5A0";
  const tagEmoji = categoryEmojis[event.category] ?? "🎵";

  return (
    <>
      {/* Overlay */}
      <div
        className="absolute inset-0 z-20 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={event.name}
        className="absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl bg-white px-5 pb-8 pt-3 shadow-2xl"
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />

        {/* Category tag */}
        <span
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: tagColor }}
        >
          {tagEmoji} {event.category}
        </span>

        {/* Name */}
        <h2 className="mt-3 text-xl font-bold leading-tight text-gray-900">
          {event.name}
        </h2>

        {/* Venue */}
        <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-4 shrink-0 text-gray-400"
          >
            <path
              fillRule="evenodd"
              d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.013 3.5-4.619 3.5-7.327A8.5 8.5 0 003.21 9.74c-.245.636-.377 1.31-.381 1.992a.75.75 0 00.007.11 8.498 8.498 0 002.164 5.158 19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
          <span>{event.venue}</span>
        </div>

        {/* Date & time */}
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-4 shrink-0 text-gray-400"
          >
            <path
              fillRule="evenodd"
              d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z"
              clipRule="evenodd"
            />
          </svg>
          <span className="capitalize">{formatDate(event.date)}</span>
          <span className="text-gray-300">·</span>
          <span>{event.time}</span>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm leading-relaxed text-gray-600">
          {event.description}
        </p>

        {/* Price + CTA */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400">Valor</p>
            {event.isFree ? (
              <p className="text-lg font-bold" style={{ color: "#0EA5A0" }}>
                Grátis
              </p>
            ) : (
              <p className="text-lg font-bold text-gray-900">
                R$ {event.price.toFixed(2).replace(".", ",")}
              </p>
            )}
          </div>

          <button
            className="flex-1 rounded-2xl py-3.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: "#0EA5A0" }}
          >
            {event.isFree ? "Participar" : "Comprar ingresso"}
          </button>
        </div>
      </div>
    </>
  );
}
