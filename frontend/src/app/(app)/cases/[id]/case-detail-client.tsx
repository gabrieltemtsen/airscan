"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Check,
  Download,
  FileWarning,
  Pencil,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton-loaders";
import { formatSeconds, formatTimestamp } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type CaseDetail = {
  id: string;
  station_name: string | null;
  program_name: string | null;
  broadcast_date: string | null;
  status: "uploading" | "processing" | "complete" | "failed";
  error_message: string | null;
  file_url: string;
  file_name: string;
  file_duration_seconds: number | null;
  audio_url: string | null;
  created_at: string;
  completed_at: string | null;
};

type Transcript = {
  full_text: string;
  segments: Array<{ start: number; end: number; text: string; speaker?: string | null }>;
};

type Finding = {
  id: string;
  clause_id: string;
  clause_section_number: string;
  clause_title: string;
  timestamp_start: number;
  timestamp_end: number;
  quote: string;
  explanation: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  recommended_action: string;
  reviewer_status: "pending" | "approved" | "rejected" | "edited";
  reviewer_note: string | null;
};

function severityVariant(s: Finding["severity"]) {
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

function ProcessingStepper({ status }: { status: CaseDetail["status"] }) {
  const steps = [
    { key: "upload", label: "Uploading" },
    { key: "extract", label: "Extracting audio" },
    { key: "transcribe", label: "Transcribing" },
    { key: "analyze", label: "Analyzing (Gemini/AI)" },
    { key: "complete", label: "Complete" },
  ] as const;

  // We don’t have server-side stage granularity; map to a sensible UI.
  const currentIndex = status === "uploading" ? 0 : status === "processing" ? 2 : status === "complete" ? 4 : 4;

  return (
    <div className="rounded-xl border border-border/70 bg-white/50 p-4">
      <div className="text-sm font-semibold text-navy">Progress</div>
      <div className="mt-3 space-y-2">
        {steps.map((s, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex && status !== "complete";
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div
                className={
                  "relative flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-200 " +
                  (done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-gold bg-gold/15 text-navy"
                      : "border-border/70 bg-white text-muted-foreground")
                }
              >
                {done ? "✓" : idx + 1}
                {active ? (
                  <span className="absolute -inset-1 rounded-full border border-gold/40 animate-pulse" />
                ) : null}
              </div>
              <div className={done ? "text-sm font-medium text-navy" : active ? "text-sm font-medium text-navy" : "text-sm text-muted-foreground"}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Auto-updating every 5 seconds while processing.</div>
    </div>
  );
}

export function CaseDetailClient({ caseId }: { caseId: string }) {
  const { getToken } = useAuth();

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [severity, setSeverity] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [noteEdit, setNoteEdit] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    const dRes = await fetch(`${API_URL}/api/cases/${caseId}`, { headers, cache: "no-store" });
    if (!dRes.ok) throw new Error(await dRes.text());
    const d = (await dRes.json()) as CaseDetail;
    setDetail(d);

    // Get signed media URL for streaming
    try {
      const mRes = await fetch(`${API_URL}/api/cases/${caseId}/media-url`, { headers, cache: "no-store" });
      if (mRes.ok) {
        const m = await mRes.json();
        setMediaUrl(m.url);
      }
    } catch {
      // ignore
    }

    if (d.status === "complete") {
      const [tRes, fRes] = await Promise.all([
        fetch(`${API_URL}/api/cases/${caseId}/transcript`, { headers, cache: "no-store" }),
        fetch(`${API_URL}/api/cases/${caseId}/findings${severity !== "all" ? `?severity=${severity}` : ""}`,
          { headers, cache: "no-store" }
        ),
      ]);
      if (tRes.ok) setTranscript((await tRes.json()) as Transcript);
      if (fRes.ok) setFindings((await fRes.json()) as Finding[]);
    }

    setLoading(false);
  }, [caseId, getToken, severity]);

  useEffect(() => {
    fetchAll().catch((e) => {
      setLoading(false);
      toast.error(e.message || "Failed to load case");
    });
  }, [fetchAll]);

  useEffect(() => {
    if (!detail) return;
    if (detail.status === "processing" || detail.status === "uploading") {
      const t = setInterval(() => {
        fetchAll().catch(() => null);
      }, 5000);
      return () => clearInterval(t);
    }
  }, [detail, fetchAll]);

  const findingsBySegment = useMemo(() => {
    const arr = findings;
    return (start: number, end: number) =>
      arr.filter((f) => Math.max(f.timestamp_start, start) < Math.min(f.timestamp_end, end));
  }, [findings]);

  const jump = useCallback((t: number) => {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, t);
    el.play().catch(() => null);
  }, []);

  const patchFinding = useCallback(
    async (id: string, body: any) => {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/findings/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Saved");
      await fetchAll();
    },
    [fetchAll, getToken]
  );

  const download = useCallback(
    async (kind: "pdf" | "csv") => {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/cases/${caseId}/export/${kind}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error(await res.text());
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `airscan-${caseId}.${kind}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    [caseId, getToken]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-navy">Case</h1>
            {detail ? (
              <Badge
                variant={
                  detail.status === "complete" ? "low" : detail.status === "failed" ? "critical" : "medium"
                }
              >
                {detail.status}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail?.station_name || "—"} · {detail?.program_name || "—"} · {detail?.broadcast_date || "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {detail?.file_name} · Duration {formatSeconds(detail?.file_duration_seconds ?? null)}
          </p>
          {detail?.status === "failed" ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <FileWarning className="h-4 w-4" />
              {detail.error_message || "Processing failed"}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => fetchAll().catch(() => null)}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => download("csv")} disabled={!detail || detail.status !== "complete"}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="gold" onClick={() => download("pdf")} disabled={!detail || detail.status !== "complete"}>
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {loading && !detail ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-56" />
          </CardContent>
        </Card>
      ) : null}

      {detail?.status === "uploading" || detail?.status === "processing" ? (
        <ProcessingStepper status={detail.status} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mediaUrl ? (
              <video
                ref={(el) => {
                  mediaRef.current = el;
                }}
                className="w-full rounded-xl border border-border/70 bg-black"
                controls
                src={mediaUrl}
              />
            ) : detail?.audio_url || detail?.file_url ? (
              <div className="rounded-xl border border-border/70 bg-white/50 p-4 text-sm text-muted-foreground">
                Preparing a secure streaming URL…
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-white/50 p-4 text-sm text-muted-foreground">
                Media will appear once processing starts.
              </div>
            )}
            <Separator />
            <div className="text-sm text-muted-foreground">
              Click any highlighted transcript segment or finding to jump to its timestamp.
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/cases">Back to cases</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            {!detail || detail.status !== "complete" ? (
              <div className="text-sm text-muted-foreground">Transcript will be available when processing completes.</div>
            ) : loading && !transcript ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <SkeletonRows count={8} cols={1} className="mt-4" />
              </div>
            ) : transcript ? (
              <div className="max-h-[70vh] space-y-2 overflow-auto pr-2">
                {transcript.segments.map((seg, idx) => {
                  const hits = findingsBySegment(seg.start, seg.end);
                  const has = hits.length > 0;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => jump(seg.start)}
                      className={
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                        (has ? "border-gold bg-gold/10" : "border-border/70 hover:bg-navy/5")
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-navy">
                          {formatTimestamp(seg.start)}–{formatTimestamp(seg.end)}
                        </div>
                        {has ? (
                          <Badge variant="gold">{hits.length} flagged</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">OK</span>
                        )}
                      </div>
                      <div className={has ? "mt-1 text-navy" : "mt-1 text-muted-foreground"}>{seg.text}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No transcript found.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-navy">Findings</CardTitle>
              <select
                className="h-9 rounded-md border border-border/70 bg-white/70 px-3 text-sm text-navy shadow-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {!detail || detail.status !== "complete" ? (
              <div className="text-sm text-muted-foreground">Findings will be available when processing completes.</div>
            ) : loading && findings.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/70 bg-white/50 p-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-56" />
                    <Skeleton className="mt-3 h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : findings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No findings flagged for the selected filter.</div>
            ) : (
              <div className="max-h-[70vh] space-y-3 overflow-auto pr-2">
                {findings.map((f) => (
                  <div key={f.id} className="rounded-xl border border-border/70 bg-white/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button type="button" onClick={() => jump(f.timestamp_start)} className="text-left">
                        <div className="font-semibold text-navy">
                          {formatTimestamp(f.timestamp_start)}–{formatTimestamp(f.timestamp_end)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {f.clause_section_number} · {f.clause_title}
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <Badge variant={severityVariant(f.severity) as any}>{f.severity}</Badge>
                        <Badge variant="outline">{Math.round(f.confidence * 100)}%</Badge>
                      </div>
                    </div>

                    <div className="mt-2 rounded-lg border border-border/70 bg-white/60 p-2 text-sm text-navy">
                      “{f.quote}”
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{f.explanation}</div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-navy">Recommended:</span> {f.recommended_action}
                    </div>

                    <Separator className="my-3" />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        Status: <span className="font-medium text-navy">{f.reviewer_status}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => patchFinding(f.id, { reviewer_status: "approved" })}>
                          <ThumbsUp className="h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => patchFinding(f.id, { reviewer_status: "rejected" })}>
                          <ThumbsDown className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-navy">
                        <Pencil className="h-4 w-4" /> Reviewer note
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={noteEdit[f.id] ?? f.reviewer_note ?? ""}
                          onChange={(e) => setNoteEdit((prev) => ({ ...prev, [f.id]: e.target.value }))}
                          placeholder="Optional note..."
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            patchFinding(f.id, {
                              reviewer_status: "edited",
                              reviewer_note: noteEdit[f.id] ?? f.reviewer_note ?? "",
                            })
                          }
                        >
                          <Check className="h-4 w-4" /> Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
