"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  chat, generateImage, generateTTS, getVoices, refinePrompt, generateScript,
  type VoiceOption,
} from "@/lib/api";

/* ── Types ── */

interface Message {
  id: string;
  role: "user" | "assistant";
  type: "text" | "image" | "error";
  content: string;
  url?: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

/* ── Constants ── */

const EMOTIONS = [
  "excited", "whisper", "dramatic", "warm", "angry", "sad",
  "laughing", "happy", "serious", "playful", "neutral",
  "fearful", "surprised", "calm",
];

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

const COLORS = {
  accent: "#06b6d4",
  purple: "#8b5cf6",
  bg: "#0a1628",
  bg2: "#0d1d33",
  surface: "#12233d",
  surface2: "#172b4a",
  surface3: "#1c3358",
  border: "rgba(148,163,184,0.12)",
  border2: "rgba(148,163,184,0.22)",
  text: "#e2e8f0",
  muted: "#7a8ba8",
  gradient: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
} as const;

/* ── Helpers ── */

function createConversation(title: string): Conversation {
  return { id: uid(), title, messages: [], createdAt: now() };
}

function createMessage(role: "user" | "assistant", type: Message["type"], content: string, url?: string): Message {
  return { id: uid(), role, type, content, url, timestamp: now() };
}

/* ── Markdown Renderer ── */

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    let match: RegExpExecArray | null;
    match = /`([^`]+)`/.exec(remaining);
    if (match) {
      const idx = match.index;
      if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      parts.push(<code key={key++} style={{ background: COLORS.surface3, padding: "1px 6px", borderRadius: 4, fontSize: 12, color: COLORS.accent, fontFamily: "var(--font-mono, monospace)" }}>{match[1]}</code>);
      remaining = remaining.slice(idx + match[0].length);
      continue;
    }
    match = /\*\*([^*]+)\*\*/.exec(remaining);
    if (match) {
      const idx = match.index;
      if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      parts.push(<strong key={key++} style={{ fontWeight: 600 }}>{match[1]}</strong>);
      remaining = remaining.slice(idx + match[0].length);
      continue;
    }
    match = /\*([^*]+)\*/.exec(remaining);
    if (match) {
      const idx = match.index;
      if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      parts.push(<em key={key++}>{match[1]}</em>);
      remaining = remaining.slice(idx + match[0].length);
      continue;
    }
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }
  return <>{parts}</>;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        elements.push(
          <div key={`code-${i}`} style={{ margin: "8px 0", borderRadius: 8, overflow: "hidden" }}>
            {codeLang && <div style={{ background: COLORS.surface3, padding: "4px 12px", fontSize: 11, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>{codeLang}</div>}
            <pre style={{ background: COLORS.bg2, padding: "12px 16px", overflow: "auto", margin: 0 }}>
              <code style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{codeLines.join("\n")}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeLines = [];
        codeLang = "";
      }
      i++;
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); i++; continue; }
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} style={{ fontSize: 14, fontWeight: 600, margin: "8px 0 4px", color: COLORS.text }}>{renderInline(line.slice(4))}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i} style={{ fontSize: 15, fontWeight: 600, margin: "10px 0 4px", color: COLORS.text }}>{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith("# ")) {
      elements.push(<h2 key={i} style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 4px", color: COLORS.text }}>{renderInline(line.slice(2))}</h2>);
    } else if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(lines[i].replace(/^[-*] /, "")); i++; }
      elements.push(<ul key={`ul-${i}`} style={{ margin: "4px 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 2 }}>{items.map((item, j) => <li key={j} style={{ color: COLORS.text, lineHeight: 1.6 }}>{renderInline(item)}</li>)}</ul>);
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(lines[i].replace(/^\d+\. /, "")); i++; }
      elements.push(<ol key={`ol-${i}`} style={{ margin: "4px 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 2 }}>{items.map((item, j) => <li key={j} style={{ color: COLORS.text, lineHeight: 1.6 }}>{renderInline(item)}</li>)}</ol>);
      continue;
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(<p key={i} style={{ margin: "2px 0", lineHeight: 1.6 }}>{renderInline(line)}</p>);
    }
    i++;
  }
  return <>{elements}</>;
}

/* ── Components ── */

function Logo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: "block", margin: "0 auto" }}>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor={COLORS.accent} />
          <stop offset="1" stopColor={COLORS.purple} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" stroke="url(#logoGrad)" strokeWidth="3" fill="none" />
      <path d="M16 20 C16 14, 32 14, 32 20 L32 24 C32 28, 24 32, 24 32 C24 32, 16 28, 16 24 Z" fill="url(#logoGrad)" opacity="0.85" />
      <circle cx="24" cy="22" r="4" fill={COLORS.bg} />
    </svg>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 0", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent, animation: `dotBlink 1.2s ${i * 0.2}s infinite ease-in-out` }} />
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}
      style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
      title={copied ? "Copied!" : "Copy"}>
      {copied
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>}
    </button>
  );
}

function LandingPage({ onEnterChat }: { onEnterChat: () => void }) {
  const features = [
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>, title: "Image Generation", desc: "Transform text into stunning visuals with AI-powered image creation." },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>, title: "Voice Synthesis", desc: "Convert text into natural speech with emotion and expression." },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>, title: "AI Enhancement", desc: "Refine your prompts and scripts with intelligent AI assistance." },
  ];
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
      <div style={{ position: "absolute", top: "10%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "rgba(6,182,212,0.08)", filter: "blur(80px)", animation: "blobFloat 12s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 280, height: 280, borderRadius: "50%", background: "rgba(139,92,246,0.08)", filter: "blur(80px)", animation: "blobFloat2 14s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "60%", width: 200, height: 200, borderRadius: "50%", background: "rgba(6,182,212,0.05)", filter: "blur(60px)", animation: "blobFloat 10s ease-in-out infinite 2s", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "20%", right: "25%", width: 180, height: 180, borderRadius: "50%", background: "rgba(139,92,246,0.06)", filter: "blur(70px)", animation: "blobFloat2 11s ease-in-out infinite 1s", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 36, padding: "0 24px", maxWidth: 900, width: "100%", animation: "slideUp 0.6s ease-out" }}>
        <div style={{ textAlign: "center" }}>
          <Logo size={64} />
          <h1 style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1, marginTop: 20, marginBottom: 16, background: COLORS.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VoxAI</h1>
          <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, background: COLORS.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI that speaks, sees, and creates</p>
          <p style={{ fontSize: 15, color: COLORS.muted, maxWidth: 500, lineHeight: 1.6, margin: "0 auto" }}>Generate images, synthesize voice with emotion, and enhance your creative workflow — all powered by advanced AI.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, width: "100%", maxWidth: 800 }}>
          {features.map((f, i) => (
            <div key={f.title} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", animation: `slideUp 0.5s ease-out ${i * 0.1}s both`, transition: "border-color 0.2s, transform 0.2s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = COLORS.accent; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = COLORS.border; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(6,182,212,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={onEnterChat} style={{ fontSize: 16, fontWeight: 600, padding: "16px 40px", borderRadius: 16, background: COLORS.gradient, color: "white", border: "none", cursor: "pointer", marginTop: 8, boxShadow: "0 4px 24px rgba(6,182,212,0.3)", transition: "transform 0.15s, box-shadow 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}>Get Started</button>
      </div>
    </div>
  );
}

function Sidebar({ conversations, activeId, onSelect, onNew, collapsed, onToggle }: {
  conversations: Conversation[]; activeId: string; onSelect: (id: string) => void;
  onNew: () => void; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <aside style={{ width: collapsed ? 56 : 260, height: "100%", background: COLORS.bg2, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", transition: "width 0.25s ease", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", padding: "16px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
        {!collapsed && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Logo size={24} /><span style={{ fontSize: 16, fontWeight: 700, background: COLORS.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VoxAI</span></div>}
        <button onClick={onToggle} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>
        </button>
      </div>
      {!collapsed && (
        <div style={{ padding: "12px 12px 0" }}>
          <button onClick={onNew} style={{ width: "100%", fontSize: 13, fontWeight: 500, padding: "10px 14px", borderRadius: 10, background: COLORS.gradient, color: "white", border: "none", cursor: "pointer" }}>+ New Chat</button>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "8px 6px" : "12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {conversations.map((c) => (
          <div key={c.id} onClick={() => onSelect(c.id)} title={c.title}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: collapsed ? "8px 0" : "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: c.id === activeId ? COLORS.text : COLORS.muted, background: c.id === activeId ? "rgba(6,182,212,0.1)" : "transparent", justifyContent: collapsed ? "center" : "flex-start", whiteSpace: "nowrap", overflow: "hidden", textOverflow: collapsed ? "unset" : "ellipsis" }}>
            {collapsed ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> : <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</span>}
          </div>
        ))}
      </div>
    </aside>
  );
}

function WelcomeChat({ onQuickStart }: { onQuickStart: (text: string) => void }) {
  const suggestions = [
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>, prompt: "/image", label: "Generate an image" },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>, prompt: "/voice", label: "Open Voice Studio" },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>, prompt: "What can you help me create today?", label: "Ask anything" },
  ];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 40, animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ textAlign: "center" }}>
        <Logo size={56} />
        <h2 style={{ fontSize: 22, fontWeight: 600, color: COLORS.text, marginTop: 16, marginBottom: 8 }}>How can I help you create?</h2>
        <p style={{ fontSize: 14, color: COLORS.muted }}>Type a message or try one of these suggestions</p>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", maxWidth: 600 }}>
        {suggestions.map((s) => (
          <button key={s.prompt} onClick={() => onQuickStart(s.prompt)}
            style={{ padding: "14px 20px", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: COLORS.text, background: COLORS.surface, border: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 500, transition: "border-color 0.15s, transform 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = COLORS.accent; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = COLORS.border; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}>
            {s.icon}<span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", padding: "4px 0", animation: "slideUp 0.3s ease-out" }}>
      <div style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-start", gap: 10, maxWidth: "75%" }}>
        {!isUser && (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a5 5 0 015 5v3a5 5 0 01-10 0V7a5 5 0 015-5z" /><path d="M9 14h6" /><path d="M12 14v6" /></svg>
          </div>
        )}
        <div style={{ borderRadius: 16, padding: "12px 16px", fontSize: 14, lineHeight: 1.6, background: isUser ? COLORS.gradient : COLORS.surface, color: isUser ? "white" : COLORS.text, border: isUser ? "none" : `1px solid ${COLORS.border}`, position: "relative" }}>
          {message.type === "text" && (isUser
            ? <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
            : <div style={{ position: "relative" }}>{renderMarkdown(message.content)}<div style={{ position: "absolute", top: 0, right: 0, opacity: 0.5 }}><CopyButton text={message.content} /></div></div>
          )}
          {message.type === "image" && (
            <div>
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={message.url} alt={message.content} style={{ borderRadius: 12, maxWidth: "100%", display: "block" }} />
                <a href={message.url} download={`voxai-${message.id}.png`} target="_blank" rel="noopener noreferrer"
                  style={{ position: "absolute", bottom: 8, right: 8, width: 34, height: 34, borderRadius: 9, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", textDecoration: "none" }} title="Download image">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </a>
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>{message.content}</div>
            </div>
          )}
          {message.type === "error" && <div style={{ color: "#ef4444" }}>{message.content}</div>}
        </div>
      </div>
    </div>
  );
}

function ImageEnhancer({ initialPrompt, onEnhance, onClose }: { initialPrompt: string; onEnhance: (prompt: string) => void; onClose: () => void }) {
  const [step, setStep] = useState<"write" | "enhance">(initialPrompt ? "enhance" : "write");
  const [userPrompt, setUserPrompt] = useState(initialPrompt);
  const [enhancedEditable, setEnhancedEditable] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step !== "enhance" || !userPrompt.trim()) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await refinePrompt(userPrompt);
        if (!cancelled) setEnhancedEditable(data.enhanced);
      } catch { if (!cancelled) setEnhancedEditable(userPrompt); } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [step, userPrompt]);

  const inputStyle: React.CSSProperties = { width: "100%", background: COLORS.bg2, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 14, outline: "none", resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "92vw", background: COLORS.surface, border: `1px solid ${COLORS.border2}`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 20, animation: "slideUp 0.3s ease-out", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 17, fontWeight: 600 }}>{step === "write" ? "Describe Your Image" : "Enhance Prompt"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 20 }}>&times;</button>
        </div>
        {step === "write" ? (
          <>
            <div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>What do you want to create?</div>
              <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} placeholder="e.g. a cat sitting on the moon..." rows={4} style={{ ...inputStyle, minHeight: 100 }} autoFocus />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "10px 18px", fontSize: 13, borderRadius: 10, background: COLORS.surface2, color: COLORS.text, border: `1px solid ${COLORS.border}`, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => userPrompt.trim() && setStep("enhance")} disabled={!userPrompt.trim()} style={{ padding: "10px 18px", fontSize: 13, borderRadius: 10, background: userPrompt.trim() ? COLORS.gradient : COLORS.surface2, color: userPrompt.trim() ? "white" : COLORS.muted, border: "none", cursor: userPrompt.trim() ? "pointer" : "not-allowed", fontWeight: 500 }}>Enhance with AI</button>
            </div>
          </>
        ) : loading ? (
          <div style={{ padding: 30, textAlign: "center" }}><LoadingDots /></div>
        ) : (
          <>
            <div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Your prompt</div>
              <div style={{ background: COLORS.bg2, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", whiteSpace: "pre-wrap", fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{userPrompt}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>AI Enhanced (editable)</div>
              <textarea value={enhancedEditable} onChange={(e) => setEnhancedEditable(e.target.value)} rows={5} style={{ ...inputStyle, borderColor: COLORS.accent, minHeight: 120 }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setStep("write")} style={{ padding: "10px 18px", fontSize: 13, borderRadius: 10, background: COLORS.surface2, color: COLORS.text, border: `1px solid ${COLORS.border}`, cursor: "pointer" }}>Back</button>
              <button onClick={() => { const p = enhancedEditable.trim() || userPrompt.trim(); if (p) onEnhance(p); }} style={{ padding: "10px 18px", fontSize: 13, borderRadius: 10, background: COLORS.gradient, color: "white", border: "none", cursor: "pointer", fontWeight: 500 }}>Generate Image</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VoiceStudio({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"tts" | "script">("tts");
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [emotion, setEmotion] = useState("neutral");
  const [rate, setRate] = useState(1);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [topic, setTopic] = useState("");
  const [scriptStyle, setScriptStyle] = useState("narrative");
  const [scriptResult, setScriptResult] = useState("");
  const [expressions, setExpressions] = useState<string[]>([]);
  const [scriptLoading, setScriptLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getVoices().then((v) => { if (v.length) { setVoices(v); setSelectedVoice(v[0].short_name); } }).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    return () => { if (audioSrc) URL.revokeObjectURL(audioSrc); };
  }, [audioSrc]);

  const handleTTS = async () => {
    if (!ttsText.trim()) return;
    setTtsLoading(true);
    try {
      const rateStr = rate >= 1 ? `+${Math.round((rate - 1) * 100)}%` : `-${Math.round((1 - rate) * 100)}%`;
      const blob = await generateTTS({ text: ttsText, voice: selectedVoice, rate: rateStr, emotion });
      const url = URL.createObjectURL(blob);
      setAudioSrc(url);
      setIsPlaying(true);
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (err) { console.error(err); } finally { setTtsLoading(false); }
  };

  const handleGenerateScript = async () => {
    if (!topic.trim()) return;
    setScriptLoading(true);
    try {
      const data = await generateScript(topic, scriptStyle);
      setScriptResult(data.script);
      setExpressions(data.expressions ?? []);
    } catch { setScriptResult("Failed to generate script."); setExpressions([]); } finally { setScriptLoading(false); }
  };

  if (!isOpen) return null;

  const tabBtn = (key: typeof tab, label: string) => (
    <button onClick={() => setTab(key)} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", borderRadius: 8, background: tab === key ? "rgba(6,182,212,0.15)" : "transparent", color: tab === key ? COLORS.accent : COLORS.muted, transition: "all 0.15s ease" }}>{label}</button>
  );
  const selectStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, background: COLORS.bg2, border: `1px solid ${COLORS.border}`, color: COLORS.text, fontSize: 13, outline: "none", cursor: "pointer" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, background: COLORS.bg2, border: `1px solid ${COLORS.border}`, color: COLORS.text, fontSize: 13, outline: "none", resize: "vertical" };

  return (
    <div style={{ width: 380, height: "100%", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", borderLeft: `1px solid ${COLORS.border}`, background: COLORS.bg2, animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Voice Studio</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 20 }}>&times;</button>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "12px 16px 0" }}>{tabBtn("tts", "Text to Speech")}{tabBtn("script", "AI Script")}</div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {tab === "tts" && (
          <>
            <div><label style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, display: "block" }}>Voice</label>
              <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} style={selectStyle}>
                {voices.map((v) => <option key={v.short_name} value={v.short_name}>{v.friendly_name}</option>)}
                {voices.length === 0 && <option value="">Default Voice</option>}
              </select></div>
            <div><label style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, display: "block" }}>Text to speak</label>
              <textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} placeholder="Enter text..." rows={4} style={{ ...inputStyle, minHeight: 80 }} /></div>
            <div><label style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, display: "block" }}>Emotion</label>
              <select value={emotion} onChange={(e) => setEmotion(e.target.value)} style={selectStyle}>
                {EMOTIONS.map((em) => <option key={em} value={em}>{em.charAt(0).toUpperCase() + em.slice(1)}</option>)}
              </select>
              {emotion !== "neutral" && <div style={{ marginTop: 8, fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "rgba(6,182,212,0.12)", color: COLORS.accent, display: "inline-block" }}>{emotion}</div>}</div>
            <div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><label style={{ fontSize: 12, color: COLORS.muted }}>Speed</label><span style={{ fontSize: 12, color: COLORS.text }}>{rate.toFixed(1)}x</span></div>
              <input type="range" min={0.5} max={2} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: "100%", accentColor: COLORS.accent }} /></div>
            <button disabled={ttsLoading || !ttsText.trim()} onClick={handleTTS} style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: COLORS.gradient, color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, opacity: ttsLoading || !ttsText.trim() ? 0.5 : 1 }}>
              {ttsLoading ? "Generating..." : "Generate Speech"}</button>
            {audioSrc && (
              <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <audio ref={audioRef} src={audioSrc} onEnded={() => setIsPlaying(false)} style={{ display: "none" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => { if (!audioRef.current) return; isPlaying ? audioRef.current.pause() : audioRef.current.play(); setIsPlaying(!isPlaying); }}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.gradient, border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isPlaying ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>}
                  </button>
                  <div style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ttsText.slice(0, 60)}{ttsText.length > 60 ? "..." : ""}</div>
                </div>
                <audio controls src={audioSrc} style={{ width: "100%", height: 32 }} />
              </div>)}
          </>
        )}
        {tab === "script" && (
          <>
            <div><label style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, display: "block" }}>Topic</label>
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The future of space exploration" style={inputStyle} /></div>
            <div><label style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, display: "block" }}>Style</label>
              <select value={scriptStyle} onChange={(e) => setScriptStyle(e.target.value)} style={selectStyle}>
                <option value="narrative">Narrative</option><option value="dramatic">Dramatic</option><option value="educational">Educational</option><option value="comedy">Comedy</option><option value="horror">Horror</option>
              </select></div>
            <button disabled={scriptLoading || !topic.trim()} onClick={handleGenerateScript} style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: COLORS.gradient, color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, opacity: scriptLoading || !topic.trim() ? 0.5 : 1 }}>
              {scriptLoading ? "Generating..." : "Generate Script"}</button>
            {scriptResult && (
              <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{scriptResult}</div>
                {expressions.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 12, color: COLORS.muted }}>Expressions</div>
                    {expressions.map((expr, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(6,182,212,0.12)", color: COLORS.accent }}>{expr}</span>
                      </div>))}
                  </div>)}
                <button onClick={() => { setTtsText(scriptResult); setTab("tts"); }} style={{ width: "100%", marginTop: 4, padding: "10px 0", borderRadius: 10, background: COLORS.gradient, color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Send to Voice</button>
              </div>)}
          </>
        )}
      </div>
    </div>
  );
}

function ChatBox({ onSend, isImageMode, isVoiceMode }: { onSend: (text: string) => void; isImageMode: boolean; isVoiceMode: boolean }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submit = () => { const t = value.trim(); if (!t) return; onSend(t); setValue(""); if (textareaRef.current) textareaRef.current.style.height = "auto"; };
  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ borderRadius: 16, padding: 4, display: "flex", alignItems: "flex-end", gap: 4, background: COLORS.surface, border: isImageMode ? `1px solid ${COLORS.accent}` : isVoiceMode ? "1px solid #10b981" : `1px solid ${COLORS.border}`, position: "relative" }}>
        {isImageMode && <div style={{ position: "absolute", top: -24, left: 12, fontSize: 11, padding: "3px 10px", borderRadius: 8, background: COLORS.gradient, color: "white", fontWeight: 500, pointerEvents: "none" }}>Image Generation Mode</div>}
        {isVoiceMode && <div style={{ position: "absolute", top: -24, left: 12, fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontWeight: 500, pointerEvents: "none" }}>Voice Studio</div>}
        <textarea ref={textareaRef} value={value} onChange={(e) => { setValue(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={isImageMode ? "Describe the image..." : isVoiceMode ? "Open Voice Studio..." : "Message VoxAI..."}
          rows={1} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: COLORS.text, fontSize: 14, padding: "12px 14px", resize: "none", lineHeight: 1.5, minHeight: 44, maxHeight: 160 }} />
        <button onClick={submit} disabled={!value.trim()}
          style={{ width: 40, height: 40, borderRadius: 12, background: value.trim() ? COLORS.gradient : COLORS.surface2, border: "none", color: value.trim() ? "white" : COLORS.muted, cursor: value.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: COLORS.muted, marginTop: 8 }}>/image for image generation · /voice for voice studio</div>
    </div>
  );
}

/* ── Main ── */

export default function Home() {
  const [view, setView] = useState<"landing" | "chat">("landing");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [voiceStudioOpen, setVoiceStudioOpen] = useState(false);
  const [imageEnhancerPrompt, setImageEnhancerPrompt] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConvo = conversations.find((c) => c.id === activeId);
  const messages = activeConvo?.messages ?? [];

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const updateMessages = (id: string, msgs: Message[]) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, messages: msgs } : c)));
  };

  const ensureConversation = (title: string): string => {
    if (activeId && conversations.find((c) => c.id === activeId)) return activeId;
    const convo = createConversation(title);
    setConversations((prev) => [convo, ...prev]);
    setActiveId(convo.id);
    return convo.id;
  };

  const handleSend = async (text: string) => {
    if (view === "landing") setView("chat");
    if (text.startsWith("/image")) {
      setIsImageMode(true);
      setImageEnhancerPrompt(text.replace(/^\/image\s*/, "").trim() || "");
      return;
    }
    if (text.startsWith("/voice")) {
      const convoId = ensureConversation("Voice Studio");
      const userMsg = createMessage("user", "text", "/voice");
      const convo = conversations.find((c) => c.id === convoId);
      updateMessages(convoId, [...(convo?.messages ?? []), userMsg]);
      setVoiceStudioOpen(true);
      return;
    }

    const convoId = ensureConversation(text.slice(0, 30) || "New chat");
    const userMsg = createMessage("user", "text", text);
    const convo = conversations.find((c) => c.id === convoId);
    const newMsgs = [...(convo?.messages ?? []), userMsg];
    updateMessages(convoId, newMsgs);
    setChatLoading(true);

    try {
      const apiMessages = newMsgs.map((m) => ({ role: m.role, content: m.content }));
      const reply = await chat(apiMessages, "You are VoxAI, a helpful AI assistant. Be concise and helpful. You can help with image generation prompts, voice scripts, and creative tasks. Keep responses under 300 words.");
      updateMessages(convoId, [...newMsgs, createMessage("assistant", "text", reply)]);
    } catch {
      updateMessages(convoId, [...newMsgs, createMessage("assistant", "error", "Failed to get AI response. Please try again.")]);
    } finally { setChatLoading(false); }
  };

  const handleImageEnhance = async (prompt: string) => {
    setImageEnhancerPrompt(null);
    setIsImageMode(false);
    const convoId = ensureConversation("Image generation");
    const userMsg = createMessage("user", "text", `/image ${prompt}`);
    const convo = conversations.find((c) => c.id === convoId);
    const currentMsgs = convo?.messages ?? [];
    updateMessages(convoId, [...currentMsgs, userMsg]);
    setImageGenerating(true);
    try {
      const data = await generateImage({ prompt, model: "flux", width: 1024, height: 1024 });
      updateMessages(convoId, [...currentMsgs, userMsg, createMessage("assistant", "image", prompt, data.url)]);
    } catch {
      updateMessages(convoId, [...currentMsgs, userMsg, createMessage("assistant", "error", "Failed to generate image. Please try again.")]);
    } finally { setImageGenerating(false); }
  };

  const handleNew = () => { const c = createConversation("New chat"); setConversations((prev) => [c, ...prev]); setActiveId(c.id); };

  if (view === "landing") return <LandingPage onEnterChat={() => setView("chat")} />;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar conversations={conversations} activeId={activeId} onSelect={setActiveId} onNew={handleNew} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((p) => !p)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        {messages.length === 0 ? (
          <WelcomeChat onQuickStart={handleSend} />
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            {messages.map((msg) => <Bubble key={msg.id} message={msg} />)}
            {chatLoading && (
              <div style={{ display: "flex", gap: 10, padding: "4px 0", animation: "slideUp 0.3s ease-out" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a5 5 0 015 5v3a5 5 0 01-10 0V7a5 5 0 015-5z" /><path d="M9 14h6" /><path d="M12 14v6" /></svg>
                </div>
                <div style={{ borderRadius: 16, padding: "14px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}` }}><LoadingDots /></div>
              </div>)}
            {imageGenerating && (
              <div style={{ display: "flex", gap: 10, padding: "4px 0", animation: "slideUp 0.3s ease-out" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                </div>
                <div style={{ borderRadius: 16, padding: "14px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <LoadingDots />
                  <span style={{ fontSize: 13, color: COLORS.muted }}>Generating image...</span>
                </div>
              </div>)}
            <div ref={messagesEndRef} />
          </div>)}
        <div style={{ position: "relative" }}><ChatBox onSend={handleSend} isImageMode={isImageMode} isVoiceMode={voiceStudioOpen} /></div>
      </div>
      <VoiceStudio isOpen={voiceStudioOpen} onClose={() => setVoiceStudioOpen(false)} />
      {imageEnhancerPrompt !== null && <ImageEnhancer initialPrompt={imageEnhancerPrompt} onEnhance={handleImageEnhance} onClose={() => setImageEnhancerPrompt(null)} />}
    </div>
  );
}
