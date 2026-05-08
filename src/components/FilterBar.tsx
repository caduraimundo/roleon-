'use client'

import { useState } from 'react'

// Gêneros musicais — sem emoji, só texto
const GENRES = ['Samba', 'MPB', 'Rock', 'Funk', 'Sertanejo']

interface FilterBarProps {
  activeGenre: string | null
  onGenreChange: (genre: string | null) => void
}

export default function FilterBar({ activeGenre, onGenreChange }: FilterBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '0 16px 4px',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
      className="no-scrollbar"
    >
      {GENRES.map((genre) => {
        const active = activeGenre === genre
        return (
          <button
            key={genre}
            onClick={() => onGenreChange(active ? null : genre)}
            style={{
              flex: '0 0 auto',
              padding: '8px 15px',
              borderRadius: 999,
              border: 0,
              cursor: 'pointer',
              // Ativo = fundo escuro + texto branco | Inativo = fundo branco + texto escuro
              background: active ? '#1A1A1A' : '#ffffff',
              color: active ? '#ffffff' : '#1A1A1A',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Noto Sans', sans-serif",
              whiteSpace: 'nowrap',
              // Sombra suave no inativo, sem sombra no ativo
              boxShadow: active
                ? '0 4px 12px rgba(0,0,0,0.18)'
                : '0 2px 8px rgba(0,0,0,0.07), 0 0 0 0.5px rgba(0,0,0,0.04)',
              transition: 'background 160ms, color 160ms, transform 120ms',
              lineHeight: 1,
            }}
          >
            {genre}
          </button>
        )
      })}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
