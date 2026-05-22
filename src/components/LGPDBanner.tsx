"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LGPDBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("roleon_banner_dismissed")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem("roleon_banner_dismissed", "true");
    setVisible(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#fff",
        borderTop: "1px solid #E5E5EA",
        borderRadius: "12px 12px 0 0",
        padding: "16px",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "'Noto Sans', sans-serif",
        fontSize: "13px",
        color: "#6E6E73",
      }}
    >
      <span>
        Usamos dados para melhorar sua experiência. Saiba mais em nossa{" "}
        <Link href="/privacidade" style={{ color: "#0EA5A0", textDecoration: "none" }}>
          Política de Privacidade
        </Link>
      </span>
      <button
        onClick={dismiss}
        aria-label="Fechar aviso"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          color: "#6E6E73",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          marginLeft: "16px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
