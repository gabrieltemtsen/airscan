import { auth } from "@clerk/nextjs/server";


export type ApiCaseStatus = "uploading" | "processing" | "complete" | "failed";

export type CaseListItem = {
  id: string;
  station_name: string | null;
  program_name: string | null;
  broadcast_date: string | null;
  status: ApiCaseStatus;
  findings_count: number;
  created_at: string;
};

export type CaseDetail = {
  id: string;
  station_name: string | null;
  program_name: string | null;
  broadcast_date: string | null;
  status: ApiCaseStatus;
  error_message: string | null;
  file_url: string;
  file_name: string;
  file_duration_seconds: number | null;
  audio_url: string | null;
  policy_pack_ids: string[];
  created_at: string;
  completed_at: string | null;
};

export type Transcript = {
  full_text: string;
  segments: Array<{ start: number; end: number; text: string; speaker?: string | null }>;
};

export type Finding = {
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
  reviewed_at: string | null;
};

export type PolicyPack = {
  id: string;
  name: string;
  version: string;
  description: string | null;
  is_default: boolean;
  clause_count: number;
  created_at: string;
};

export type PolicyClause = {
  id: string;
  section_number: string;
  title: string;
  text: string;
  prohibited_behaviors: string[];
  severity_level: "critical" | "high" | "medium" | "low";
};

export type UserMe = {
  email: string;
  plan: "free" | "express" | "starter" | "pro" | "enterprise";
  credits_seconds: number;
  free_analyses_used: number;
};

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch(path: string, init?: RequestInit) {
  let token: string | null = null;
  try {
    const session = await auth();
    token = await session.getToken();
  } catch {
    // auth() may throw if Clerk is not fully configured — proceed without token
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API error ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res;
}

export const api = {
  me: () => apiFetch("/api/user/me") as Promise<UserMe>,
  usage: () => apiFetch("/api/user/usage") as Promise<any>,
  cases: (params?: { page?: number; page_size?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    if (params?.status) qs.set("status", params.status);
    return apiFetch(`/api/cases?${qs.toString()}`) as Promise<{ items: CaseListItem[]; total: number }>;
  },
  caseDetail: (id: string) => apiFetch(`/api/cases/${id}`) as Promise<CaseDetail>,
  transcript: (id: string) => apiFetch(`/api/cases/${id}/transcript`) as Promise<Transcript>,
  findings: (id: string, severity?: string) => {
    const qs = new URLSearchParams();
    if (severity) qs.set("severity", severity);
    return apiFetch(`/api/cases/${id}/findings?${qs.toString()}`) as Promise<Finding[]>;
  },
  policyPacks: () => apiFetch(`/api/policy-packs`) as Promise<PolicyPack[]>,
  policyClauses: (id: string) => apiFetch(`/api/policy-packs/${id}/clauses`) as Promise<PolicyClause[]>,
};
