"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Dropzone from "react-dropzone";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function PolicyUploadClient() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState<string>("");
  const [version, setVersion] = useState<string>("v1");
  const [loading, setLoading] = useState<boolean>(false);

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }, [name]);

  const upload = useCallback(async () => {
    if (!file) {
      toast.error("Pick a file");
      return;
    }
    if (!name.trim()) {
      toast.error("Enter a pack name");
      return;
    }

    const token = await getToken();
    if (!token) return;

    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name);
      form.append("version", version);

      const res = await fetch(`${API_URL}/api/policy-packs/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      toast.success("Policy pack created");
      router.push(`/policy-library/${created.id}`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }, [file, getToken, name, router, version]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Upload Policy Doc</h1>
        <p className="text-sm text-muted-foreground">
          Upload a PDF/Word document. AirScan will extract and structure clauses using Gemini.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Policy document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dropzone onDrop={onDrop} accept={{ "application/pdf": [".pdf"], "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] }} maxFiles={1}>
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
                    <FileUp className="h-6 w-6" />
                  </div>
                  <div className="mt-3 text-base font-semibold text-navy">
                    {file ? file.name : "Drop a PDF/DOCX here, or click to select"}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">We extract clauses into structured policy packs.</div>
                </div>
              </div>
            )}
          </Dropzone>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-navy">Pack name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., NBC Broadcasting Code" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy">Version</label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="gold" onClick={upload} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                "Create pack"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
