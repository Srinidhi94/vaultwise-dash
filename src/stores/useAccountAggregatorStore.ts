import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AAPhase =
  | "idle"
  | "creating"
  | "awaiting_approval"
  | "fetching"
  | "done"
  | "error";

export interface AAConsent {
  id: string;
  status: "pending" | "active" | "revoked" | "expired" | "failed";
  provider: string;
  provider_consent_id: string | null;
  valid_until: string | null;
}

interface CreateConsentResponse {
  consent_id: string;
  status: AAConsent["status"];
  redirect_url: string | null;
}

interface FetchDataResponse {
  inserted: number;
  account_ids: string[];
}

interface SyncResponse {
  inserted: number;
  synced_at: string;
}

interface RevokeResponse {
  status: string;
  already?: boolean;
}

interface CheckRevokeResponse {
  revoked: boolean;
  revoked_count?: number;
}

interface StatusResponse {
  id: string;
  status: AAConsent["status"];
}

interface AAState {
  consents: AAConsent[];
  phase: AAPhase;
  currentConsentId: string | null;
  redirectUrl: string | null;
  errorMessage: string | null;

  fetchConsents: () => Promise<void>;
  startConsent: (opts: { phone?: string; months?: number }) => Promise<CreateConsentResponse | null>;
  pollConsentUntilResolved: (consentId: string) => Promise<AAConsent["status"]>;
  fetchData: (consentId: string) => Promise<FetchDataResponse | null>;
  syncAccount: (accountId: string) => Promise<SyncResponse | null>;
  revokeConsent: (consentId: string) => Promise<boolean>;
  checkAndRevokeConsent: (accountId: string) => Promise<boolean>;
  reset: () => void;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("aa-proxy", { body });
  if (error) {
    // supabase-js doesn't surface the response body on non-2xx; pull it manually
    const ctx = error as { context?: Response };
    if (ctx.context && typeof ctx.context.text === "function") {
      try {
        const text = await ctx.context.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed.error ?? text);
      } catch (e) {
        if (e instanceof Error) throw e;
      }
    }
    throw new Error(error.message);
  }
  return data as T;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export const useAccountAggregatorStore = create<AAState>((set, get) => ({
  consents: [],
  phase: "idle",
  currentConsentId: null,
  redirectUrl: null,
  errorMessage: null,

  reset: () =>
    set({
      phase: "idle",
      currentConsentId: null,
      redirectUrl: null,
      errorMessage: null,
    }),

  fetchConsents: async () => {
    const { data, error } = await supabase
      .from("aa_consents")
      .select("id, status, provider, provider_consent_id, valid_until")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load consents", { description: error.message });
      return;
    }
    set({ consents: (data ?? []) as AAConsent[] });
  },

  startConsent: async ({ phone, months }) => {
    set({ phase: "creating", errorMessage: null });
    try {
      const res = await invoke<CreateConsentResponse>({
        action: "create_consent",
        phone,
        months: months ?? 12,
      });
      set({
        currentConsentId: res.consent_id,
        redirectUrl: res.redirect_url,
        phase: res.status === "active" ? "fetching" : "awaiting_approval",
      });
      get().fetchConsents();
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start consent";
      set({ phase: "error", errorMessage: msg });
      toast.error("Could not start consent", { description: msg });
      return null;
    }
  },

  pollConsentUntilResolved: async (consentId) => {
    const started = Date.now();
    while (Date.now() - started < POLL_TIMEOUT_MS) {
      try {
        const res = await invoke<StatusResponse>({
          action: "consent_status",
          consent_id: consentId,
        });
        if (res.status !== "pending") return res.status;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Status check failed";
        set({ phase: "error", errorMessage: msg });
        toast.error("Status check failed", { description: msg });
        return "failed";
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    set({ phase: "error", errorMessage: "Timed out waiting for consent approval" });
    return "failed";
  },

  fetchData: async (consentId) => {
    set({ phase: "fetching", errorMessage: null });
    try {
      const res = await invoke<FetchDataResponse>({
        action: "fetch_data",
        consent_id: consentId,
      });
      set({ phase: "done" });
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      set({ phase: "error", errorMessage: msg });
      toast.error("Sync failed", { description: msg });
      return null;
    }
  },

  syncAccount: async (accountId) => {
    try {
      const res = await invoke<SyncResponse>({
        action: "sync",
        account_id: accountId,
      });
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      toast.error("Sync failed", { description: msg });
      return null;
    }
  },

  revokeConsent: async (consentId) => {
    try {
      await invoke<RevokeResponse>({
        action: "revoke_consent",
        consent_id: consentId,
      });
      get().fetchConsents();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Revoke failed";
      toast.error("Failed to revoke consent", { description: msg });
      return false;
    }
  },

  checkAndRevokeConsent: async (accountId) => {
    try {
      const res = await invoke<CheckRevokeResponse>({
        action: "check_revoke",
        account_id: accountId,
      });
      if (res.revoked) {
        get().fetchConsents();
      }
      return res.revoked;
    } catch {
      return false;
    }
  },
}));
