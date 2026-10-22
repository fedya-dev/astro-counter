"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Lock,
  LogOut,
  Sparkles,
  Star,
  Eye,
  EyeOff,
  Globe,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  ChevronDown,
  Github,
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type PublicCount = { today: number; total: number };

type Stats = {
  site: string | null;
  siteSlug: string | null;
  siteColor: string | null;
  today: number;
  yesterday: number;
  total: number;
  weekTotal: number;
  trendPct: number | null;
  series: { date: string; label: string; count: number }[];
  topCountries: { country: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
};

type Site = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  apiKey: string;
  color: string | null;
  createdAt: string;
  totalVisits: number;
  today: number;
  yesterday: number;
};

const FALLBACK_PALETTE = [
  "#a855f7",
  "#f59e0b",
  "#22d3ee",
  "#10b981",
  "#ec4899",
  "#ef4444",
  "#8b5cf6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#eab308",
  "#14b8a6",
];

/* ----- convert hex to rgba with alpha ----- */
function hexA(hex: string, alpha: number): string {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(168, 85, 247, ${alpha})`;
  }
}

/* ------------------------------------------------------------------ */
/* Starfield                                                          */
/* ------------------------------------------------------------------ */
function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        top: (i * 47) % 100,
        left: (i * 71) % 100,
        size: 1 + ((i * 13) % 3),
        delay: (i % 7) * 0.4,
        dur: 2.5 + ((i * 17) % 30) / 10,
      })),
    []
  );
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1f] via-[#0d0820] to-[#000]" />
      <div
        className="absolute left-1/2 top-[-10%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full opacity-50 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(168,85,247,0.35), transparent 60%)",
        }}
      />
      <div
        className="absolute right-[10%] bottom-[-10%] h-[40vh] w-[40vh] rounded-full opacity-40 blur-[80px]"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.25), transparent 60%)",
        }}
      />
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: 0.6,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite alternate`,
          }}
        />
      ))}
      <style jsx global>{`
        @keyframes twinkle {
          from {
            opacity: 0.2;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Locked screen                                                      */
/* ------------------------------------------------------------------ */
function LockedScreen({
  publicCount,
  loading,
  onUnlockClick,
}: {
  publicCount: PublicCount | null;
  loading: boolean;
  onUnlockClick: () => void;
}) {
  return (
    <motion.div
      key="locked"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.9), rgba(124,58,237,0.4) 60%, transparent 100%)",
            boxShadow: "0 0 60px rgba(168,85,247,0.4)",
          }}
        >
          <Star className="h-10 w-10 text-white" strokeWidth={2} />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Астро
          </h1>
          <p className="text-base text-violet-200/70">
            Личен брояч за посещения — множество сайтове
          </p>
        </div>
        <div className="flex items-center gap-2 text-violet-300/60">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">
            Следи посещенията на всичките си сайтове от едно място
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-full border border-violet-400/20 bg-white/5 px-4 py-2 backdrop-blur-md">
          <EyeOff className="h-3.5 w-3.5 text-violet-300/60" />
          {loading || !publicCount ? (
            <span className="text-sm text-violet-200/50">Зареждане…</span>
          ) : (
            <span className="text-sm text-violet-100/80">
              Днес (панел):{" "}
              <span className="font-semibold text-white">
                {publicCount.today}
              </span>{" "}
              · Общо:{" "}
              <span className="font-semibold text-white">
                {publicCount.total}
              </span>
            </span>
          )}
        </div>
        <Button
          onClick={onUnlockClick}
          size="lg"
          className="mt-6 gap-2 rounded-full border border-violet-300/30 bg-violet-500/20 px-8 text-white backdrop-blur-md transition-all hover:bg-violet-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
        >
          <Lock className="h-4 w-4" />
          Отключи детайлите
        </Button>
        <p className="text-xs text-violet-200/40">
          Достъп само за собственика — с личен PIN код
        </p>
        <p className="mt-4 text-[10px] text-violet-200/30">
          Astro Counter {APP_VERSION} · ако не виждаш тази версия, ребилдни:
          <code className="mx-1 rounded bg-white/5 px-1">
            docker compose up -d --build
          </code>
        </p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* PIN entry modal                                                    */
/* ------------------------------------------------------------------ */
function PinEntry({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError("Грешен PIN. Опитайте отново.");
          setPin("");
          return;
        }
        toast({
          title: "Достъп разрешен",
          description: "Детайлите са отключени.",
        });
        onSuccess();
      } catch {
        setError("Връзката прекъсна. Опитайте отново.");
      } finally {
        setSubmitting(false);
      }
    },
    [pin, onSuccess, toast]
  );

  useEffect(() => {
    if (!open) {
      setPin("");
      setError(null);
      setShow(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl border border-violet-400/30 bg-[#0d0820]/95 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
            <Lock className="h-5 w-5 text-violet-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Личен достъп</h3>
            <p className="text-xs text-violet-200/60">
              Въведете своя PIN, за да видите статистиките
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              inputMode="numeric"
              autoFocus
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={submitting}
              className="h-12 border-violet-400/30 bg-white/5 text-center text-2xl tracking-[0.5em] text-white placeholder:text-violet-200/30"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-200/60 hover:text-violet-100"
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-violet-100 hover:bg-white/5 hover:text-white"
            >
              Отказ
            </Button>
            <Button
              type="submit"
              disabled={submitting || pin.length === 0}
              className="flex-1 bg-violet-500/30 text-white hover:bg-violet-500/50"
            >
              {submitting ? "Проверка…" : "Отключи"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  sub,
  accent,
  loading,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  sub?: React.ReactNode;
  accent: string;
  loading?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card
      className="relative overflow-hidden border-white/10 bg-white/[0.03] p-5 backdrop-blur-md"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}10` }}
    >
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-violet-200/70">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-10 w-20 bg-white/10" />
          ) : (
            <p
              className="mt-1 text-4xl font-bold tabular-nums text-white"
              style={{ textShadow: `0 0 30px ${accent}40` }}
            >
              {value ?? 0}
            </p>
          )}
          {sub && <div className="mt-2 text-xs text-violet-200/60">{sub}</div>}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: `${accent}25` }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Copy button                                                        */
/* ------------------------------------------------------------------ */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Копирано",
        description: label || "Кодът е в клипборда.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({
          title: "Грешка",
          description: "Копирането не беше успешно.",
          variant: "destructive",
        });
      }
      document.body.removeChild(ta);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2 border-violet-400/30 bg-white/5 text-violet-100 hover:bg-white/10 hover:text-white"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Копирано" : "Копирай"}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Color picker                                                       */
/* ------------------------------------------------------------------ */
function ColorPicker({
  value,
  onChange,
  palette,
}: {
  value: string | null;
  onChange: (color: string) => void;
  palette: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {palette.map((c) => {
        const selected = (value || "").toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className={`relative h-7 w-7 rounded-full transition-transform ${
              selected
                ? "ring-2 ring-white ring-offset-2 ring-offset-[#0d0820] scale-110"
                : "hover:scale-110"
            }`}
            style={{ background: c }}
          >
            {selected && (
              <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
            )}
          </button>
        );
      })}
      <label
        className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-violet-400/40 text-violet-200/60 hover:border-violet-400/70 hover:text-white"
        title="Custom цвят"
      >
        <Plus className="h-3.5 w-3.5" />
        <input
          type="color"
          value={value || "#a855f7"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Site manager modal                                                 */
/* ------------------------------------------------------------------ */
function SiteManagerModal({
  open,
  onClose,
  sites,
  palette,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onRegenerateKey,
}: {
  open: boolean;
  onClose: () => void;
  sites: Site[];
  palette: string[];
  loading: boolean;
  onAdd: (name: string, domain: string, color: string | null) => Promise<void>;
  onUpdate: (site: Site, patch: { name?: string; domain?: string | null; color?: string | null }) => Promise<void>;
  onDelete: (site: Site) => Promise<void>;
  onRegenerateKey: (site: Site) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newColor, setNewColor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const [snippetLoading, setSnippetLoading] = useState<string | null>(null);
  const [editingColorFor, setEditingColorFor] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSnippet = useCallback(async (site: Site) => {
    if (snippets[site.id]) return;
    setSnippetLoading(site.id);
    try {
      const res = await fetch(`/api/sites/${site.id}`);
      const data = await res.json();
      if (data?.ok && data.snippet) {
        setSnippets((prev) => ({ ...prev, [site.id]: data.snippet }));
      }
    } catch {
      // ignore
    } finally {
      setSnippetLoading(null);
    }
  }, [snippets]);

  useEffect(() => {
    if (open && expandedSiteId) {
      const site = sites.find((s) => s.id === expandedSiteId);
      if (site) loadSnippet(site);
    }
  }, [open, expandedSiteId, sites, loadSnippet]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAdd(newName.trim(), newDomain.trim(), newColor);
      setNewName("");
      setNewDomain("");
      setNewColor(null);
    } finally {
      setAdding(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-violet-400/30 bg-[#0d0820]/95 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
              <Globe className="h-5 w-5 text-violet-200" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Сайтове</h3>
              <p className="text-xs text-violet-200/60">
                Регистрирай сайтове, избери цвят и вгради кода им
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-violet-200/70 hover:text-white"
          >
            Затвори
          </Button>
        </div>

        <form
          onSubmit={handleAdd}
          className="mb-5 rounded-lg border border-violet-400/20 bg-white/[0.02] p-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Име на сайта (напр. Train Brakes)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={adding}
              className="border-violet-400/30 bg-white/5 text-white placeholder:text-violet-200/30"
            />
            <Input
              placeholder="Домейн (напр. trainbrakes.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              disabled={adding}
              className="border-violet-400/30 bg-white/5 text-white placeholder:text-violet-200/30"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-violet-200/60">Цвят:</span>
              <ColorPicker
                value={newColor}
                onChange={setNewColor}
                palette={palette}
              />
            </div>
            <Button
              type="submit"
              disabled={adding || !newName.trim()}
              className="ml-auto gap-2 bg-violet-500/30 text-white hover:bg-violet-500/50"
            >
              <Plus className="h-4 w-4" />
              {adding ? "Добавяне…" : "Добави сайт"}
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 w-full bg-white/5" />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="rounded-lg border border-dashed border-violet-400/30 p-8 text-center">
            <Globe className="mx-auto mb-2 h-8 w-8 text-violet-300/40" />
            <p className="text-sm text-violet-200/50">
              Все още няма регистрирани сайтове.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sites.map((s) => {
              const color = s.color || palette[0] || "#a855f7";
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                  style={{ boxShadow: `inset 3px 0 0 ${color}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                        <p className="truncate font-medium text-white">{s.name}</p>
                        <Badge
                          variant="outline"
                          className="border-violet-400/30 bg-violet-500/10 text-[10px] text-violet-200"
                        >
                          {s.slug}
                        </Badge>
                      </div>
                      {s.domain && (
                        <a
                          href={`https://${s.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-violet-200/50 hover:text-violet-100"
                        >
                          {s.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditingColorFor((cur) =>
                            cur === s.id ? null : s.id
                          )
                        }
                        title="Смяна на цвят"
                        className="text-violet-200/70 hover:bg-white/5 hover:text-white"
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full"
                          style={{ background: color }}
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedSiteId((cur) =>
                            cur === s.id ? null : s.id
                          )
                        }
                        className="gap-1 text-violet-200/70 hover:bg-white/5 hover:text-white"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            expandedSiteId === s.id ? "rotate-180" : ""
                          }`}
                        />
                        Код
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRegenerateKey(s)}
                        title="Генерирай нов API ключ"
                        className="text-violet-200/70 hover:bg-white/5 hover:text-white"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(s)}
                        title="Изтрий"
                        className="text-rose-300/70 hover:bg-rose-500/10 hover:text-rose-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-violet-200/70">
                    <span className="rounded-full bg-white/5 px-2 py-0.5">
                      Днес:{" "}
                      <span className="font-semibold text-white">{s.today}</span>
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5">
                      Вчера:{" "}
                      <span className="font-semibold text-white">
                        {s.yesterday}
                      </span>
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5">
                      Общо:{" "}
                      <span className="font-semibold text-white">
                        {s.totalVisits}
                      </span>
                    </span>
                  </div>

                  {editingColorFor === s.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-3 overflow-hidden border-t border-white/10 pt-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-violet-200/60">
                          Цвят на таб:
                        </span>
                        <ColorPicker
                          value={s.color}
                          onChange={(c) => onUpdate(s, { color: c })}
                          palette={palette}
                        />
                      </div>
                    </motion.div>
                  )}

                  {expandedSiteId === s.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs text-violet-200/60">
                          Постави този код в HTML-а на сайта си преди{" "}
                          <code className="rounded bg-white/10 px-1 text-[10px]">
                            {"</body>"}
                          </code>
                          :
                        </p>
                        {snippets[s.id] && <CopyButton text={snippets[s.id]} />}
                      </div>
                      {snippetLoading === s.id && !snippets[s.id] ? (
                        <Skeleton className="h-32 w-full bg-white/5" />
                      ) : snippets[s.id] ? (
                        <pre className="max-h-44 overflow-auto rounded-md border border-violet-400/20 bg-black/40 p-3 text-xs leading-relaxed text-violet-100/90">
                          {snippets[s.id]}
                        </pre>
                      ) : (
                        <p className="text-xs text-violet-200/40">
                          Кодът не беше зареден.
                        </p>
                      )}
                    </motion.div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-center text-xs text-violet-200/40">
          Ключът ({`k=...`}) е видимо в кода на сайта — това е нормално. Само
          записва посещения, не чете статистики. Само ти вижш детайлите с PIN.
        </p>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */
function Dashboard({
  stats,
  loading,
  error,
  onLogout,
  sites,
  sitesLoading,
  selectedSlug,
  onSelectSlug,
  onOpenSiteManager,
  onRefresh,
}: {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  onLogout: () => void;
  sites: Site[];
  sitesLoading: boolean;
  selectedSlug: string | null;
  onSelectSlug: (slug: string | null) => void;
  onOpenSiteManager: () => void;
  onRefresh: () => void;
}) {
  const today = stats?.today ?? null;
  const yesterday = stats?.yesterday ?? null;
  const total = stats?.total ?? null;
  const weekTotal = stats?.weekTotal ?? null;
  const trend = stats?.trendPct;
  const selectedSiteColor =
    stats?.siteColor ||
    sites.find((s) => s.slug === selectedSlug)?.color ||
    "#a855f7";
  const chartColor = selectedSiteColor;

  let trendLabel: React.ReactNode = null;
  if (today !== null && yesterday !== null) {
    if (today === 0 && yesterday === 0) {
      trendLabel = (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-violet-200/50">
          Все още няма посещения
        </span>
      );
    } else if (yesterday === 0 && today > 0) {
      trendLabel = (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
          ✨ Първи посещения днес
        </span>
      );
    } else if (today === 0 && yesterday > 0) {
      trendLabel = (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
          — Все още 0 днес
        </span>
      );
    } else if (today === yesterday) {
      trendLabel = (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-violet-100">
          ≈ Също като вчера
        </span>
      );
    } else if (trend !== null && trend !== undefined) {
      const isUp = trend >= 0;
      const pct = Math.abs(trend);
      trendLabel = (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            isUp
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-rose-500/15 text-rose-300"
          }`}
          title={`Вчера: ${yesterday} · Днес: ${today}`}
        >
          {isUp ? "▲" : "▼"} {pct}% спря вчера (беше {yesterday})
        </span>
      );
    }
  }

  return (
    <motion.div
      key="unlocked"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 sm:px-6"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.9), rgba(124,58,237,0.4) 60%, transparent 100%)",
              boxShadow: "0 0 40px rgba(168,85,247,0.4)",
            }}
          >
            <Star className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Астро</h1>
            <p className="text-xs text-violet-200/60">
              Личен брояч за посещения — множество сайтове
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/fedya-dev/astro-counter"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub repository"
            aria-label="GitHub repository"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-violet-400/20 bg-white/5 text-violet-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Github className="h-4 w-4" />
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-2 border-violet-400/20 bg-white/5 text-violet-100 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Обнови
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="gap-2 border-violet-400/20 bg-white/5 text-violet-100 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Изход
          </Button>
        </div>
      </div>

      {/* Site selector — compact + horizontal scroll for many sites */}
      <Card className="mb-5 border-white/10 bg-white/[0.03] p-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="hidden px-2 text-xs text-violet-200/60 sm:inline">
            Сайт:
          </span>
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
            <button
              onClick={() => onSelectSlug(null)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedSlug === null
                  ? "border-violet-400/60 bg-violet-500/20 text-white"
                  : "border-violet-400/20 bg-white/5 text-violet-200/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Панел
            </button>
            {sitesLoading ? (
              <Skeleton className="h-7 w-32 shrink-0 bg-white/5" />
            ) : (
              sites.map((s) => {
                const c = s.color || "#a855f7";
                const isSelected = selectedSlug === s.slug;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectSlug(s.slug)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                      isSelected ? "text-white" : "text-violet-200/70 hover:text-white"
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: c,
                            background: hexA(c, 0.2),
                          }
                        : {
                            borderColor: `${c}40`,
                            background: "rgba(255,255,255,0.03)",
                          }
                    }
                    title={s.domain || s.name}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: c }}
                    />
                    <span className="truncate max-w-[140px]">{s.name}</span>
                  </button>
                );
              })
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSiteManager}
            className="shrink-0 gap-1 border-violet-400/30 bg-white/5 px-3 py-1 text-xs text-violet-100 hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">Сайтове</span>
          </Button>
        </div>
      </Card>

      {/* Site banner */}
      {stats?.site && (
        <div className="mb-4 flex items-center gap-2 text-sm text-violet-100/80">
          <Globe
            className="h-4 w-4"
            style={{ color: selectedSiteColor }}
          />
          Преглеждаш:{" "}
          <span className="font-semibold text-white">{stats.site}</span>
        </div>
      )}

      {/* Error banner */}
      {error && !loading && (
        <Card className="mb-5 border-rose-400/40 bg-rose-500/10 p-4 backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              <div>
                <p className="font-medium text-rose-100">
                  Статистиките не се заредиха
                </p>
                <p className="mt-1 text-sm text-rose-200/70">{error}</p>
                <p className="mt-2 text-xs text-rose-200/50">
                  Ако виждаш това веднага след въвеждане на PIN — cookie-то не
                  се запазва. Най-честата причина е HTTP без HTTPS. Сложи
                  dashboard-а зад HTTPS reverse proxy (Caddy/Nginx/Cloudflare
                  Tunnel) или го отваряй през{" "}
                  <code className="mx-1 rounded bg-white/10 px-1">
                    http://localhost:3000
                  </code>{" "}
                  от самия сървър.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="shrink-0 gap-2 border-rose-400/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Опитай пак
            </Button>
          </div>
        </Card>
      )}

      {/* Main cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Днес"
          value={today}
          sub={trendLabel}
          accent={selectedSiteColor}
          loading={loading}
          icon={Sparkles}
        />
        <StatCard
          label="Вчера"
          value={yesterday}
          sub={<span className="text-violet-200/50">Предходен ден</span>}
          accent="#f59e0b"
          loading={loading}
          icon={Star}
        />
        <StatCard
          label="Тази седмица"
          value={weekTotal}
          sub={<span className="text-violet-200/50">Последните 7 дни</span>}
          accent="#22d3ee"
          loading={loading}
          icon={Eye}
        />
        <StatCard
          label="Общо"
          value={total}
          sub={<span className="text-violet-200/50">Уникални посетители</span>}
          accent="#10b981"
          loading={loading}
          icon={Star}
        />
      </div>

      {/* Chart */}
      <Card className="mt-6 border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Посещения — последните 7 дни
          </h2>
          <Badge
            variant="outline"
            className="border-violet-400/30 bg-violet-500/10 text-violet-100"
          >
            Уникални / ден
          </Badge>
        </div>
        <div className="h-[260px] w-full">
          {loading || !stats ? (
            <Skeleton className="h-full w-full bg-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.series}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="visitsG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="label"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(13,8,32,0.95)",
                    border: `1px solid ${chartColor}55`,
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#ddd" }}
                  formatter={(v: number) => [`${v} посещения`, "Ден"]}
                  labelFormatter={(l: string) => `Дата: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Посещения"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#visitsG)"
                  dot={{ fill: chartColor, r: 4, strokeWidth: 0 }}
                  activeDot={{
                    r: 6,
                    fill: "#fff",
                    stroke: chartColor,
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Countries + Referrers */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {stats && stats.topCountries.length > 0 && (
          <Card className="border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <h2 className="mb-3 text-lg font-semibold text-white">
              Топ държави (7 дни)
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.topCountries.map((c) => (
                <Badge
                  key={c.country}
                  variant="outline"
                  className="border-violet-400/30 bg-violet-500/10 text-violet-100"
                >
                  {c.country} · {c.count}
                </Badge>
              ))}
            </div>
          </Card>
        )}
        {stats && stats.topReferrers.length > 0 && (
          <Card className="border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
            <h2 className="mb-3 text-lg font-semibold text-white">
              Топ реферали (7 дни)
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.topReferrers.map((r) => (
                <Badge
                  key={r.referrer}
                  variant="outline"
                  className="border-violet-400/30 bg-violet-500/10 text-violet-100"
                >
                  {r.referrer} · {r.count}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-violet-200/40">
        Данните се обновяват при всяко отваряне на страницата.
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */
export function VisitorCounter() {
  const [unlocked, setUnlocked] = useState(false);
  const [publicCount, setPublicCount] = useState<PublicCount | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [palette, setPalette] = useState<string[]>(FALLBACK_PALETTE);
  const [publicLoading, setPublicLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [siteManagerOpen, setSiteManagerOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const trackedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          if (data?.ok) {
            setStats(data.stats);
            setUnlocked(true);
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/track", { method: "POST" });
        const data = await res.json();
        if (data?.ok) {
          setPublicCount({ today: data.today, total: data.total });
        } else {
          const g = await fetch("/api/track");
          const gd = await g.json();
          if (gd?.ok)
            setPublicCount({ today: gd.today, total: gd.total });
        }
      } catch {
        // ignore
      } finally {
        setPublicLoading(false);
      }
    })();
  }, []);

  const loadStats = useCallback(async (slug: string | null) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const url = slug
        ? `/api/stats?site=${encodeURIComponent(slug)}`
        : "/api/stats";
      const res = await fetch(url);
      if (res.status === 401) {
        setStatsError(
          "Сесията не е активна. Вероятно cookie-то не се запазва (HTTP без HTTPS)."
        );
        return;
      }
      if (!res.ok) {
        setStatsError(`Грешка от сървъра: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data?.ok) {
        setStats(data.stats);
      } else {
        setStatsError("Невалиден отговор от сървъра.");
      }
    } catch {
      setStatsError(
        "Мрежова грешка при зареждане на статистики. Провери дали сървърът работи."
      );
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadSites = useCallback(async () => {
    setSitesLoading(true);
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ok) {
        setSites(data.sites);
        if (Array.isArray(data.palette)) setPalette(data.palette);
      }
    } catch {
      // ignore
    } finally {
      setSitesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) {
      loadStats(selectedSlug);
      loadSites();
    }
  }, [unlocked, loadStats, loadSites, selectedSlug]);

  useEffect(() => {
    if (unlocked) loadStats(selectedSlug);
  }, [unlocked, selectedSlug, loadStats]);

  const handleUnlock = () => setPinOpen(true);
  const handlePinSuccess = () => {
    setUnlocked(true);
    setPinOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      setUnlocked(false);
      setStats(null);
      setStatsError(null);
      setSites([]);
      setSelectedSlug(null);
    }
  };

  const handleAddSite = async (
    name: string,
    domain: string,
    color: string | null
  ) => {
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          domain: domain || undefined,
          color: color || undefined,
        }),
      });
      const data = await res.json();
      if (!data?.ok) {
        toast({
          title: "Грешка",
          description: "Сайтът не беше добавен.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Сайт добавен",
        description: `${name} е регистриран. Виж кода за вграждане.`,
      });
      await loadSites();
    } catch {
      toast({
        title: "Грешка",
        description: "Мрежова грешка.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSite = async (
    site: Site,
    patch: { name?: string; domain?: string | null; color?: string | null }
  ) => {
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error("update failed");
      toast({ title: "Сайт обновен", description: site.name });
      await loadSites();
    } catch {
      toast({
        title: "Грешка",
        description: "Сайтът не беше обновен.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSite = async (site: Site) => {
    if (
      !window.confirm(
        `Изтрий "${site.name}" и всичките му посещения?\nТова действие е необратимо.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      toast({ title: "Сайт изтрит", description: site.name });
      if (selectedSlug === site.slug) setSelectedSlug(null);
      await loadSites();
    } catch {
      toast({
        title: "Грешка",
        description: "Сайтът не беше изтрит.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateKey = async (site: Site) => {
    if (
      !window.confirm(
        `Смени API ключа на "${site.name}"?\nСтарият код ще спре да работи.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/sites/${site.id}/regenerate-key`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data?.ok) throw new Error("regen failed");
      toast({
        title: "Ключ сменен",
        description: "Изтегли новия snippet от същия панел.",
      });
      await loadSites();
    } catch {
      toast({
        title: "Грешка",
        description: "Ключът не беше сменен.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative min-h-screen">
      <Starfield />
      <AnimatePresence mode="wait">
        {unlocked ? (
          <Dashboard
            key="dash"
            stats={stats}
            loading={statsLoading}
            error={statsError}
            onLogout={handleLogout}
            sites={sites}
            sitesLoading={sitesLoading}
            selectedSlug={selectedSlug}
            onSelectSlug={setSelectedSlug}
            onOpenSiteManager={() => setSiteManagerOpen(true)}
            onRefresh={() => {
              loadStats(selectedSlug);
              loadSites();
            }}
          />
        ) : (
          <LockedScreen
            key="locked"
            publicCount={publicCount}
            loading={publicLoading}
            onUnlockClick={handleUnlock}
          />
        )}
      </AnimatePresence>

      <PinEntry
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onSuccess={handlePinSuccess}
      />

      <SiteManagerModal
        open={siteManagerOpen}
        onClose={() => setSiteManagerOpen(false)}
        sites={sites}
        palette={palette}
        loading={sitesLoading}
        onAdd={handleAddSite}
        onUpdate={handleUpdateSite}
        onDelete={handleDeleteSite}
        onRegenerateKey={handleRegenerateKey}
      />
    </div>
  );
}
