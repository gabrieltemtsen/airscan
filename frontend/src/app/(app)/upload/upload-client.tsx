"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Dropzone from "react-dropzone";
import { toast } from "sonner";
import { Calendar, FileAudio, FileVideo, Loader2, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type PolicyPack = { id: string; name: string; is_default: boolean };

type Step = "idle" | "uploading" | "processing" | "done";

function prettyBytes(n: number) {
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

export function UploadClient() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [packs, setPacks] = useState<PolicyPack[]>([]);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);

  const [stationName, setStationName] = useState("");
  const [programName, setProgramName] = useState("");
  const [broadcastDate, setBroadcastDate] = useState<string>("");

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [estimate, setEstimate] = useState<string>("—");

  const accept = useMemo(
    () => ({
      "audio/*": [".mp3", ".wav", ".m4a"],
      "video/*": [".mp4", ".mov", ".avi"],
    }),
    []
  );

  const loadPacks = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/policy-packs`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as any[];
    const items = data.map((p) => ({ id: p.id, name: p.name, is_default: p.is_default })) as PolicyPack[];
    setPacks(items);
    const defaultPack = items.find((p) => p.is_default) || items[0];
    if (defaultPack) setSelectedPackIds([defaultPack.id]);
  }, [getToken]);

  useEffect(() => {
    loadPacks().catch((e) => toast.error(e.message || "Failed to load policy packs"));
  }, [loadPacks]);

  useEffect(() => {
    if (!file) return;
    // Rough estimate: 1 min audio ~ 8-15 sec processing depending on compute.
    setEstimate("~2–6 minutes");
  }, [file]);

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > 500 * 1024 * 1024) {
      toast.error("File too large. Max 500MB.");
      return;
    }
    setFile(f);
  }, []);

  const upload = useCallback(async () => {
    if (!file) return;
    // Allow empty pack_ids — backend will auto-use the default NBC Act pack

    setStep("uploading");
    setProgress(5);

    const token = await getToken();
    if (!token) {
      toast.error("Not authenticated.");
      setStep("idle");
      return;
    }

    // 1) presigned URL
    const presignedRes = await fetch(`${API_URL}/api/upload/presigned`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
      }),
    });

    if (!presignedRes.ok) {
      const t = await presignedRes.text();
      toast.error(t || "Failed to get upload URL");
      setStep("idle");
      return;
    }

    const presigned = await presignedRes.json();
    setProgress(15);

    // 2) PUT file directly to storage
    const putRes = await fetch(presigned.upload_url, {
      method: "PUT",
      headers: {
        "content-type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!putRes.ok) {
      toast.error("Upload failed. Please try again.");
      setStep("idle");
      return;
    }

    setProgress(55);

    // 3) Create case + trigger job
    const createRes = await fetch(`${API_URL}/api/cases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        station_name: stationName || null,
        program_name: programName || null,
        broadcast_date: broadcastDate || null,
        file_url: presigned.file_url,
        file_name: file.name,
        policy_pack_ids: selectedPackIds,
      }),
    });

    if (!createRes.ok) {
      const t = await createRes.text();
      toast.error(t || "Failed to create case");
      setStep("idle");
      return;
    }

    const created = await createRes.json();
    setProgress(80);
    setStep("processing");

    toast.success("Upload complete. Analysis started.");

    // Redirect to case detail
    router.push(`/cases/${created.id}`);
  }, [broadcastDate, file, getToken, programName, router, selectedPackIds, stationName]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">New Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Upload a broadcast file and choose the policy packs to check against.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dropzone onDrop={onDrop} accept={accept} maxFiles={1}>
              {({ getRootProps, getInputProps, isDragActive }) => (
                <div
                  {...getRootProps()}
                  className={
                    "cursor-pointer rounded-xl border-2 border-dashed p-8 transition-colors " +
                    (isDragActive ? "border-gold bg-gold/10" : "border-border/70 bg-white/50")
                  }
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white shadow-glow">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div className="mt-3 text-base font-semibold text-navy">
                      {file ? file.name : "Drag & drop a file, or click to select"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      MP3, MP4, WAV, AVI, MOV, M4A · Max 500MB · Max 60 minutes
                    </div>
                    {file ? (
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <Badge variant="outline">{prettyBytes(file.size)}</Badge>
                        <Badge variant="outline">{file.type.includes("video") ? "Video" : "Audio"}</Badge>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </Dropzone>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-navy">Station Name (optional)</label>
                <Input value={stationName} onChange={(e) => setStationName(e.target.value)} placeholder="e.g., ABC FM" />
              </div>
              <div>
                <label className="text-sm font-medium text-navy">Program Name (optional)</label>
                <Input value={programName} onChange={(e) => setProgramName(e.target.value)} placeholder="e.g., Morning Brief" />
              </div>
              <div>
                <label className="text-sm font-medium text-navy">Broadcast Date (optional)</label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="pl-9" value={broadcastDate} onChange={(e) => setBroadcastDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-navy">Policy Packs</label>
              <div className="mt-1 rounded-xl border border-border/70 bg-white/50 p-3">
                <div className="flex flex-wrap gap-2">
                  {packs.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-3 py-1 text-sm font-medium text-navy">
                      ✓ NBC Act 1992 (default — auto-selected)
                    </span>
                  ) : (
                    packs.map((p) => {
                      const selected = selectedPackIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPackIds((prev) =>
                              selected ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                            );
                          }}
                          className={
                            "rounded-full border px-3 py-1 text-sm font-medium transition-colors " +
                            (selected ? "border-gold bg-gold/20 text-navy" : "border-border/70 hover:bg-navy/5 text-navy")
                          }
                        >
                          {p.name}
                          {p.is_default ? " (default)" : ""}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Default pack includes key NBC Act clauses. Upload additional packs in the Policy Library.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Estimated time: {estimate}</div>
              <Button variant="gold" size="lg" onClick={upload} disabled={!file || step === "uploading"}>
                {step === "uploading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  "Start Analysis"
                )}
              </Button>
            </div>

            {step !== "idle" ? (
              <div className="space-y-2">
                <Progress value={progress} />
                <div className="text-xs text-muted-foreground">
                  {step === "uploading" ? "Uploading → creating case" : step === "processing" ? "Processing" : "Done"}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-navy">What happens next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white">
                <FileAudio className="h-4 w-4" />
              </span>
              <div>
                <div className="font-medium text-navy">Audio extraction</div>
                <div>Videos are converted to audio for consistent transcription.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-navy">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <div className="font-medium text-navy">Clause-linked findings</div>
                <div>Findings include timestamps, exact quotes, and recommended actions.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-border/70 text-navy">
                <FileVideo className="h-4 w-4" />
              </span>
              <div>
                <div className="font-medium text-navy">Review & export</div>
                <div>Approve/reject/edit findings, then export PDF/CSV reports.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
