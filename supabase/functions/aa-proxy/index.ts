import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Action = "create_consent" | "consent_status" | "fetch_data" | "revoke_consent" | "sync" | "check_revoke";
type ConsentStatus = "pending" | "active" | "revoked" | "expired" | "failed";

interface ReqBody {
  action: Action;
  phone?: string;
  consent_id?: string;
  account_id?: string;
  fi_types?: string[];
  months?: number;
}

interface ConsentResult {
  consent_id: string;
  status: ConsentStatus;
  redirect_url: string | null;
}

interface FetchResult {
  inserted: number;
  account_ids: string[];
}

interface Provider {
  createConsent(opts: { userId: string; phone: string; months: number; fiTypes: string[] }): Promise<{
    providerConsentId: string;
    status: ConsentStatus;
    redirectUrl: string | null;
    validFrom: string;
    validUntil: string;
  }>;
  refreshConsentStatus(providerConsentId: string): Promise<ConsentStatus>;
  revokeConsent(providerConsentId: string): Promise<void>;
  fetchData(opts: { userId: string; providerConsentId: string; months: number; validFrom?: string; validUntil?: string }): Promise<NormalizedAccount[]>;
}

interface NormalizedAccount {
  linkRefNumber: string;
  fipId: string;
  maskedAccountNumber: string;
  accountType: "savings" | "credit";
  currentBalance: number;
  transactions: Array<{
    txnId: string;
    date: string;
    amount: number;
    type: "CREDIT" | "DEBIT";
    narration: string;
  }>;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AA_PROVIDER = (Deno.env.get("AA_PROVIDER") ?? "mock").toLowerCase();
const SETU_BASE = Deno.env.get("SETU_BASE_URL") ?? "https://fiu-sandbox.setu.co";
const SETU_CLIENT_ID = Deno.env.get("SETU_CLIENT_ID");
const SETU_CLIENT_SECRET = Deno.env.get("SETU_CLIENT_SECRET");
const SETU_PRODUCT_INSTANCE_ID = Deno.env.get("SETU_PRODUCT_INSTANCE_ID");
const SETU_VUA_HANDLE = Deno.env.get("SETU_VUA_HANDLE") ?? "onemoney";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isoMonthsAgo = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
};

// ---------- Mock provider ---------------------------------------------------
const mockProvider: Provider = {
  async createConsent({ months }) {
    const validFrom = new Date().toISOString();
    const validUntil = new Date(Date.now() + months * 31 * 86400_000).toISOString();
    return {
      providerConsentId: `mock_consent_${crypto.randomUUID()}`,
      status: "active",
      redirectUrl: null,
      validFrom,
      validUntil,
    };
  },

  async refreshConsentStatus() {
    return "active";
  },

  async revokeConsent() {
    // no-op for mock
  },

  async fetchData({ providerConsentId }) {
    const s = Array.from(providerConsentId).reduce((a, c) => a + c.charCodeAt(0), 0);
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return d.toISOString().slice(0, 10);
    };
    const id = (n: number) => `MOCK-${s}-${String(n).padStart(3, "0")}`;

    return [
      {
        linkRefNumber: `MOCK_SAV_${providerConsentId.slice(-8)}`,
        fipId: "HDFC-FIP",
        maskedAccountNumber: "XXXXXXXX4321",
        accountType: "savings" as const,
        currentBalance: 87432.50,
        transactions: [
          { txnId: id(1),  date: day(1),  amount: 75000,  type: "CREDIT" as const, narration: "NEFT/Salary/ACME TECHNOLOGIES PVT LTD" },
          { txnId: id(2),  date: day(2),  amount: 18000,  type: "DEBIT"  as const, narration: "UPI/Rent transfer to Rahul Sharma" },
          { txnId: id(3),  date: day(3),  amount: 2450,   type: "DEBIT"  as const, narration: "UPI/BigBasket grocery order" },
          { txnId: id(4),  date: day(4),  amount: 649,    type: "DEBIT"  as const, narration: "Swiggy order #SW-98234" },
          { txnId: id(5),  date: day(5),  amount: 350,    type: "DEBIT"  as const, narration: "Uber ride to Koramangala" },
          { txnId: id(6),  date: day(7),  amount: 1999,   type: "DEBIT"  as const, narration: "Zerodha fund transfer" },
          { txnId: id(7),  date: day(8),  amount: 499,    type: "DEBIT"  as const, narration: "Spotify Premium monthly" },
          { txnId: id(8),  date: day(10), amount: 3200,   type: "DEBIT"  as const, narration: "BESCOM electricity bill" },
          { txnId: id(9),  date: day(12), amount: 799,    type: "DEBIT"  as const, narration: "Zomato order #ZMT-44521" },
          { txnId: id(10), date: day(14), amount: 15000,  type: "CREDIT" as const, narration: "IMPS/Freelance payment from Priya" },
          { txnId: id(11), date: day(15), amount: 1200,   type: "DEBIT"  as const, narration: "Ola ride to airport" },
          { txnId: id(12), date: day(18), amount: 5500,   type: "DEBIT"  as const, narration: "UPI/Medical consultation Dr. Patel" },
          { txnId: id(13), date: day(20), amount: 890,    type: "DEBIT"  as const, narration: "JioFiber broadband monthly" },
          { txnId: id(14), date: day(22), amount: 3499,   type: "DEBIT"  as const, narration: "Decathlon sports gear" },
          { txnId: id(15), date: day(25), amount: 1850,   type: "DEBIT"  as const, narration: "DMart groceries" },
          { txnId: id(16), date: day(28), amount: 449,    type: "DEBIT"  as const, narration: "Dunzo delivery — pet supplies" },
          { txnId: id(17), date: day(30), amount: 75000,  type: "CREDIT" as const, narration: "NEFT/Salary/ACME TECHNOLOGIES PVT LTD" },
          { txnId: id(18), date: day(32), amount: 2100,   type: "DEBIT"  as const, narration: "Airtel prepaid recharge" },
          { txnId: id(19), date: day(35), amount: 6000,   type: "DEBIT"  as const, narration: "SIP/Axis Bluechip mutual fund" },
          { txnId: id(20), date: day(40), amount: 950,    type: "DEBIT"  as const, narration: "BookMyShow — movie tickets x2" },
        ],
      },
      {
        linkRefNumber: `MOCK_CC_${providerConsentId.slice(-8)}`,
        fipId: "ICICI-FIP",
        maskedAccountNumber: "XXXXXXXX8765",
        accountType: "credit" as const,
        currentBalance: 24680,
        transactions: [
          { txnId: id(30), date: day(2),  amount: 4299,  type: "DEBIT" as const, narration: "Amazon.in — wireless headphones" },
          { txnId: id(31), date: day(5),  amount: 1850,  type: "DEBIT" as const, narration: "Cult.fit quarterly membership" },
          { txnId: id(32), date: day(8),  amount: 3200,  type: "DEBIT" as const, narration: "Flipkart — kitchen appliance" },
          { txnId: id(33), date: day(11), amount: 1450,  type: "DEBIT" as const, narration: "Barbeque Nation — dinner" },
          { txnId: id(34), date: day(14), amount: 2800,  type: "DEBIT" as const, narration: "HP Petrol — Indiranagar" },
          { txnId: id(35), date: day(18), amount: 5999,  type: "DEBIT" as const, narration: "Myntra — clothing order" },
          { txnId: id(36), date: day(22), amount: 649,   type: "DEBIT" as const, narration: "Netflix monthly subscription" },
          { txnId: id(37), date: day(26), amount: 1890,  type: "DEBIT" as const, narration: "Starbucks — coffee x4" },
          { txnId: id(38), date: day(30), amount: 8500,  type: "DEBIT" as const, narration: "MakeMyTrip — Goa flight booking" },
          { txnId: id(39), date: day(35), amount: 15000, type: "CREDIT" as const, narration: "Credit card bill payment — thank you" },
        ],
      },
    ];
  },
};

// ---------- Setu provider ---------------------------------------------------
const SETU_TOKEN_URL = "https://orgservice-prod.setu.co/v1/users/login";
let _setuToken: string | null = null;
let _setuTokenExpiry = 0;

async function setuAccessToken(): Promise<string> {
  if (!SETU_CLIENT_ID || !SETU_CLIENT_SECRET) {
    throw new Error(
      "Setu credentials missing: set SETU_CLIENT_ID, SETU_CLIENT_SECRET, SETU_PRODUCT_INSTANCE_ID secrets on the aa-proxy Edge Function",
    );
  }
  if (_setuToken && Date.now() < _setuTokenExpiry) return _setuToken;
  const res = await fetch(SETU_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", client: "bridge" },
    body: JSON.stringify({ clientID: SETU_CLIENT_ID, grant_type: "client_credentials", secret: SETU_CLIENT_SECRET }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Setu token → HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const body = JSON.parse(text) as { access_token?: string; expiresIn?: number };
  if (!body.access_token) {
    throw new Error(`Setu token → unexpected response: ${text.slice(0, 400)}`);
  }
  _setuToken = body.access_token;
  _setuTokenExpiry = Date.now() + ((body.expiresIn ?? 1800) - 60) * 1000;
  return _setuToken;
}

async function setuHeaders(): Promise<HeadersInit> {
  if (!SETU_PRODUCT_INSTANCE_ID) {
    throw new Error("SETU_PRODUCT_INSTANCE_ID secret is not set on the aa-proxy Edge Function");
  }
  const token = await setuAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "x-product-instance-id": SETU_PRODUCT_INSTANCE_ID,
  };
}

async function setuRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await setuHeaders();
  const res = await fetch(`${SETU_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Setu ${path} → HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) as T : ({} as T);
}

function setuStatusToLocal(status: string): ConsentStatus {
  switch (status?.toUpperCase()) {
    case "ACTIVE":   return "active";
    case "PENDING":  return "pending";
    case "REJECTED": return "failed";
    case "REVOKED":  return "revoked";
    case "EXPIRED":  return "expired";
    case "PAUSED":   return "pending";
    default:         return "pending";
  }
}

const setuProvider: Provider = {
  async createConsent({ phone, months, fiTypes }) {
    const from = isoMonthsAgo(months);
    const to = new Date().toISOString();
    const body = {
      consentDuration: { unit: "MONTH", value: String(months) },
      vua: phone.includes("@") ? phone : `${phone}@${SETU_VUA_HANDLE}`,
      dataRange: { from, to },
      context: [],
      additionalParams: { fiTypes },
    };
    const resp = await setuRequest<{ id: string; url: string; status: string; detail?: { consentExpiry?: string } }>(
      "/v2/consents",
      { method: "POST", body: JSON.stringify(body) },
    );
    return {
      providerConsentId: resp.id,
      status: setuStatusToLocal(resp.status),
      redirectUrl: resp.url,
      validFrom: from,
      validUntil: to,
    };
  },

  async refreshConsentStatus(providerConsentId) {
    const resp = await setuRequest<{ status: string }>(`/v2/consents/${providerConsentId}`);
    return setuStatusToLocal(resp.status);
  },

  async revokeConsent(providerConsentId) {
    await setuRequest<{ status: string }>(`/v2/consents/${providerConsentId}/revoke`, {
      method: "POST",
    });
  },

  async fetchData({ providerConsentId, months }) {
    const consent = await setuRequest<{
      detail?: { dataRange?: { from?: string; to?: string } };
    }>(`/v2/consents/${providerConsentId}?expanded=true`);
    const from = consent.detail?.dataRange?.from ?? isoMonthsAgo(months);
    const to = consent.detail?.dataRange?.to ?? new Date().toISOString();

    const session = await setuRequest<{ id: string; status: string }>("/v2/sessions", {
      method: "POST",
      body: JSON.stringify({ consentId: providerConsentId, dataRange: { from, to }, format: "json" }),
    });

    let payload: SetuSessionPayload | null = null;
    for (let i = 0; i < 15; i++) {
      const res = await setuRequest<SetuSessionPayload>(`/v2/sessions/${session.id}`);
      const status = res.status?.toUpperCase();
      if (status === "COMPLETED" || status === "PARTIAL") {
        payload = res;
        break;
      }
      if (status === "FAILED" || status === "EXPIRED") {
        throw new Error(`Setu data session ${status}`);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!payload) throw new Error("Setu data session did not complete within 30s");

    return normalizeSetuPayload(payload);
  },
};

interface SetuSessionPayload {
  status?: string;
  fiData?: Array<{
    fipID: string;
    data: Array<{
      linkRefNumber: string;
      maskedAccNumber: string;
      decryptedFI?: { account?: SetuAccount };
      fiData?: SetuAccount;
    }>;
  }>;
  data?: Array<{
    fipID?: string;
    linkRefNumber?: string;
    maskedAccNumber?: string;
    account?: SetuAccount;
  }>;
}

interface SetuAccount {
  type?: string;
  maskedAccNumber?: string;
  linkedAccRef?: string;
  summary?: { currentBalance?: string; type?: string };
  transactions?: {
    transaction?: Array<{
      txnId?: string;
      reference?: string;
      amount?: string;
      type?: string;
      narration?: string;
      transactionTimestamp?: string;
      valueDate?: string;
    }>;
  };
}

function normalizeSetuPayload(payload: SetuSessionPayload): NormalizedAccount[] {
  const out: NormalizedAccount[] = [];

  const flat = (payload.fiData ?? []).flatMap((fi) =>
    fi.data.map((d) => ({
      fipId: fi.fipID,
      linkRefNumber: d.linkRefNumber,
      maskedAccNumber: d.maskedAccNumber,
      account: d.decryptedFI?.account ?? d.fiData,
    })),
  );

  // Fallback shape used by some sandbox responses
  if (flat.length === 0 && payload.data) {
    payload.data.forEach((d) => {
      flat.push({
        fipId: d.fipID ?? "unknown-fip",
        linkRefNumber: d.linkRefNumber ?? d.account?.linkedAccRef ?? crypto.randomUUID(),
        maskedAccNumber: d.maskedAccNumber ?? d.account?.maskedAccNumber ?? "XXXX",
        account: d.account,
      });
    });
  }

  for (const f of flat) {
    if (!f.account) continue;
    const isCredit = (f.account.summary?.type ?? f.account.type ?? "").toUpperCase().includes("CREDIT");
    const txnList = f.account.transactions?.transaction ?? [];
    out.push({
      linkRefNumber: f.linkRefNumber,
      fipId: f.fipId,
      maskedAccountNumber: f.maskedAccNumber,
      accountType: isCredit ? "credit" : "savings",
      currentBalance: parseFloat(f.account.summary?.currentBalance ?? "0") || 0,
      transactions: txnList.map((t, i) => ({
        txnId: t.txnId ?? t.reference ?? `${f.linkRefNumber}-${i}`,
        date: (t.valueDate ?? t.transactionTimestamp ?? new Date().toISOString()).slice(0, 10),
        amount: Math.abs(parseFloat(t.amount ?? "0")) || 0,
        type: (t.type ?? "DEBIT").toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT",
        narration: t.narration ?? "Bank transaction",
      })),
    });
  }
  return out;
}

function getProvider(): Provider {
  return AA_PROVIDER === "setu" ? setuProvider : mockProvider;
}

// ---------- handlers --------------------------------------------------------
async function handleCreateConsent(supabase: SupabaseClient, userId: string, body: ReqBody) {
  const provider = getProvider();
  const months = body.months ?? 12;
  const fiTypes = body.fi_types ?? ["DEPOSIT"];

  if (AA_PROVIDER === "setu" && !body.phone) {
    return json({ error: "phone is required for Setu provider" }, 400);
  }

  const result = await provider.createConsent({
    userId,
    phone: body.phone ?? "",
    months,
    fiTypes,
  });

  const { data, error } = await supabase
    .from("aa_consents")
    .insert({
      user_id: userId,
      provider: AA_PROVIDER,
      provider_consent_id: result.providerConsentId,
      status: result.status,
      fi_types: fiTypes,
      fetch_frequency: "MONTHLY",
      valid_from: result.validFrom,
      valid_until: result.validUntil,
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 500);

  return json({
    consent_id: data.id,
    status: result.status,
    redirect_url: result.redirectUrl,
  } satisfies ConsentResult);
}

async function handleConsentStatus(supabase: SupabaseClient, userId: string, body: ReqBody) {
  if (!body.consent_id) return json({ error: "consent_id required" }, 400);

  const { data: row, error } = await supabase
    .from("aa_consents")
    .select("id, status, provider, provider_consent_id, valid_until")
    .eq("id", body.consent_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!row) return json({ error: "consent not found" }, 404);

  // Refresh from provider if not yet active
  if (row.status === "pending" && row.provider_consent_id) {
    const latest = await getProvider().refreshConsentStatus(row.provider_consent_id);
    if (latest !== row.status) {
      await supabase.from("aa_consents").update({ status: latest }).eq("id", row.id);
      row.status = latest;
    }
  }

  return json(row);
}

async function handleFetchData(supabase: SupabaseClient, userId: string, body: ReqBody) {
  if (!body.consent_id) return json({ error: "consent_id required" }, 400);

  const { data: consent, error: cErr } = await supabase
    .from("aa_consents")
    .select("id, status, provider, provider_consent_id, valid_from, valid_until")
    .eq("id", body.consent_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (cErr) return json({ error: cErr.message }, 500);
  if (!consent) return json({ error: "consent not found" }, 404);
  if (consent.status !== "active") return json({ error: `consent status is ${consent.status}` }, 409);
  if (!consent.provider_consent_id) return json({ error: "consent has no provider id" }, 500);

  const accounts = await getProvider().fetchData({
    userId,
    providerConsentId: consent.provider_consent_id,
    months: body.months ?? 12,
    validFrom: consent.valid_from,
    validUntil: consent.valid_until,
  });

  let totalInserted = 0;
  const accountIds: string[] = [];

  for (const acc of accounts) {
    const localAccountId = await ensureLocalAccount(supabase, userId, consent.id, acc);
    accountIds.push(localAccountId);
    totalInserted += await upsertTransactions(supabase, userId, localAccountId, acc);
  }

  await supabase.from("aa_consents").update({ last_fetched_at: new Date().toISOString() }).eq("id", consent.id);

  return json({ inserted: totalInserted, account_ids: accountIds } satisfies FetchResult);
}

async function ensureLocalAccount(
  supabase: SupabaseClient,
  userId: string,
  consentId: string,
  acc: NormalizedAccount,
): Promise<string> {
  const table = acc.accountType === "credit" ? "credit_cards" : "savings_accounts";
  const now = new Date().toISOString();

  // 1. Exact match: same consent + same linkRefNumber
  const { data: exactLink } = await supabase
    .from("aa_link_refs")
    .select("id, local_account_id")
    .eq("consent_id", consentId)
    .eq("link_ref_number", acc.linkRefNumber)
    .maybeSingle();

  if (exactLink?.local_account_id) {
    await supabase
      .from(table)
      .update({ current_balance: acc.currentBalance, aa_last_synced_at: now, is_active: true })
      .eq("id", exactLink.local_account_id);
    return exactLink.local_account_id;
  }

  // 2. Cross-consent dedup: same FIP + same masked account number (re-link scenario)
  const { data: crossLink } = await supabase
    .from("aa_link_refs")
    .select("id, local_account_id")
    .eq("fip_id", acc.fipId)
    .eq("masked_account_number", acc.maskedAccountNumber)
    .not("local_account_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (crossLink?.local_account_id) {
    // Reuse existing local account — reactivate if it was inactive
    await supabase
      .from(table)
      .update({
        current_balance: acc.currentBalance,
        aa_last_synced_at: now,
        aa_link_ref_number: acc.linkRefNumber,
        is_active: true,
      })
      .eq("id", crossLink.local_account_id);

    // Create a new aa_link_refs entry for this consent pointing to the same account
    await supabase.from("aa_link_refs").insert({
      consent_id: consentId,
      fip_id: acc.fipId,
      account_type: acc.accountType,
      masked_account_number: acc.maskedAccountNumber,
      link_ref_number: acc.linkRefNumber,
      local_account_id: crossLink.local_account_id,
    });

    return crossLink.local_account_id;
  }

  // 3. No match — create new local account
  const payload = acc.accountType === "credit"
    ? {
        user_id: userId,
        name: `Card — ${acc.maskedAccountNumber}`,
        source: "aa",
        aa_link_ref_number: acc.linkRefNumber,
        aa_last_synced_at: now,
        credit_limit: 0,
        current_balance: acc.currentBalance,
      }
    : {
        user_id: userId,
        name: `Bank — ${acc.maskedAccountNumber}`,
        source: "aa",
        aa_link_ref_number: acc.linkRefNumber,
        aa_last_synced_at: now,
        opening_balance: 0,
        current_balance: acc.currentBalance,
      };

  const { data: created, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw new Error(`Failed to create ${table}: ${error.message}`);

  // Link ref for this consent
  if (exactLink) {
    await supabase.from("aa_link_refs").update({ local_account_id: created.id }).eq("id", exactLink.id);
  } else {
    await supabase.from("aa_link_refs").insert({
      consent_id: consentId,
      fip_id: acc.fipId,
      account_type: acc.accountType,
      masked_account_number: acc.maskedAccountNumber,
      link_ref_number: acc.linkRefNumber,
      local_account_id: created.id,
    });
  }
  return created.id;
}

async function upsertTransactions(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
  acc: NormalizedAccount,
): Promise<number> {
  if (acc.transactions.length === 0) return 0;

  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Others")
    .maybeSingle();

  const rows = acc.transactions.map((t) => ({
    user_id: userId,
    transaction_date: t.date,
    amount: t.amount,
    description: t.narration,
    transaction_type: t.type === "CREDIT" ? "income" : "expense",
    account_type: acc.accountType,
    account_id: accountId,
    category_id: cat?.id ?? null,
    source: "aa",
    source_ref: t.txnId,
  }));

  const { error, count } = await supabase
    .from("transactions")
    .upsert(rows, { onConflict: "account_id,source_ref", ignoreDuplicates: true, count: "exact" });
  if (error) throw new Error(`Transaction upsert failed: ${error.message}`);
  return count ?? 0;
}

// ---------- revoke consent --------------------------------------------------
async function handleRevokeConsent(supabase: SupabaseClient, userId: string, body: ReqBody) {
  if (!body.consent_id) return json({ error: "consent_id required" }, 400);

  const { data: consent, error } = await supabase
    .from("aa_consents")
    .select("id, status, provider_consent_id")
    .eq("id", body.consent_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!consent) return json({ error: "consent not found" }, 404);
  if (consent.status === "revoked") return json({ status: "revoked", already: true });

  if (consent.provider_consent_id) {
    try {
      await getProvider().revokeConsent(consent.provider_consent_id);
    } catch (e) {
      // Log but don't block — consent may already be revoked at provider
      console.warn("Provider revoke failed:", e);
    }
  }

  await supabase.from("aa_consents").update({ status: "revoked" }).eq("id", consent.id);
  return json({ status: "revoked" });
}

// ---------- sync (manual re-fetch) ------------------------------------------
async function handleSync(supabase: SupabaseClient, userId: string, body: ReqBody) {
  if (!body.account_id) return json({ error: "account_id required" }, 400);

  // Find the most recent active consent for this account via aa_link_refs
  const { data: linkRef } = await supabase
    .from("aa_link_refs")
    .select("consent_id")
    .eq("local_account_id", body.account_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!linkRef) return json({ error: "no link reference found for this account" }, 404);

  const { data: consent } = await supabase
    .from("aa_consents")
    .select("id, status, provider_consent_id, valid_from, valid_until")
    .eq("id", linkRef.consent_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!consent) return json({ error: "consent not found" }, 404);
  if (consent.status !== "active") return json({ error: `consent is ${consent.status} — reconnect your bank to sync` }, 409);
  if (consent.valid_until && new Date(consent.valid_until) < new Date()) {
    await supabase.from("aa_consents").update({ status: "expired" }).eq("id", consent.id);
    return json({ error: "consent has expired — reconnect your bank to sync" }, 409);
  }

  const accounts = await getProvider().fetchData({
    userId,
    providerConsentId: consent.provider_consent_id!,
    months: body.months ?? 12,
    validFrom: consent.valid_from,
    validUntil: consent.valid_until,
  });

  let totalInserted = 0;
  for (const acc of accounts) {
    const localAccountId = await ensureLocalAccount(supabase, userId, consent.id, acc);
    totalInserted += await upsertTransactions(supabase, userId, localAccountId, acc);
  }

  const syncedAt = new Date().toISOString();
  await supabase.from("aa_consents").update({ last_fetched_at: syncedAt }).eq("id", consent.id);

  return json({ inserted: totalInserted, synced_at: syncedAt });
}

// ---------- check & auto-revoke consent if all accounts inactive ------------
async function handleCheckRevoke(supabase: SupabaseClient, userId: string, body: ReqBody) {
  if (!body.account_id) return json({ error: "account_id required" }, 400);

  // Find all consent_ids linked to this account
  const { data: linkRefs } = await supabase
    .from("aa_link_refs")
    .select("consent_id")
    .eq("local_account_id", body.account_id);

  if (!linkRefs || linkRefs.length === 0) return json({ revoked: false, reason: "no consents" });

  const consentIds = [...new Set(linkRefs.map((r: { consent_id: string }) => r.consent_id))];

  let revokedCount = 0;
  for (const consentId of consentIds) {
    // Get all local_account_ids under this consent
    const { data: allLinks } = await supabase
      .from("aa_link_refs")
      .select("local_account_id")
      .eq("consent_id", consentId)
      .not("local_account_id", "is", null);

    if (!allLinks || allLinks.length === 0) continue;

    const accountIds = [...new Set(allLinks.map((l: { local_account_id: string }) => l.local_account_id))];

    // Check if ALL accounts under this consent are inactive
    const { count: activeCount } = await supabase
      .from("savings_accounts")
      .select("id", { count: "exact", head: true })
      .in("id", accountIds)
      .eq("is_active", true);

    const { count: activeCcCount } = await supabase
      .from("credit_cards")
      .select("id", { count: "exact", head: true })
      .in("id", accountIds)
      .eq("is_active", true);

    if ((activeCount ?? 0) + (activeCcCount ?? 0) === 0) {
      // All accounts inactive — revoke
      await handleRevokeConsent(supabase, userId, { action: "revoke_consent", consent_id: consentId as string });
      revokedCount++;
    }
  }

  return json({ revoked: revokedCount > 0, revoked_count: revokedCount });
}

// ---------- entrypoint ------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "missing bearer token" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.slice(7));
  if (userErr || !userData.user) return json({ error: "invalid token" }, 401);
  const userId = userData.user.id;

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  try {
    switch (body.action) {
      case "create_consent":  return await handleCreateConsent(supabase, userId, body);
      case "consent_status":  return await handleConsentStatus(supabase, userId, body);
      case "fetch_data":      return await handleFetchData(supabase, userId, body);
      case "revoke_consent":  return await handleRevokeConsent(supabase, userId, body);
      case "sync":            return await handleSync(supabase, userId, body);
      case "check_revoke":    return await handleCheckRevoke(supabase, userId, body);
      default:                return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
