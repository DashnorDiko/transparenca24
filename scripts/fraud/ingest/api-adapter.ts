/**
 * Generic API adapter — fetches JSON from external endpoints and maps
 * each object to a NormalizedRecord using a configurable field map.
 *
 * Configure via environment variables:
 *   API_FRAUD_URL      — endpoint to GET
 *   API_FRAUD_KEY      — optional Bearer token
 *   API_FRAUD_ARRAY_PATH — dot-delimited path to the array in the
 *                          response (default: "data")
 */

import type {
  SourceAdapter,
  SourceMeta,
  NormalizedRecord,
  SourceKind,
} from "../types";

export interface ApiFieldMap {
  id?: string;
  title?: string;
  authority?: string;
  contractor?: string;
  contractType?: string;
  category?: string;
  status?: string;
  procedureType?: string;
  estimatedValue?: string;
  winnerValue?: string;
  announcementDate?: string;
  detailUrl?: string;
}

const DEFAULT_FIELD_MAP: Required<ApiFieldMap> = {
  id: "id",
  title: "title",
  authority: "authority",
  contractor: "contractor",
  contractType: "contractType",
  category: "category",
  status: "status",
  procedureType: "procedureType",
  estimatedValue: "estimatedValue",
  winnerValue: "winnerValue",
  announcementDate: "announcementDate",
  detailUrl: "detailUrl",
};

function dig(obj: Record<string, unknown>, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export class ApiAdapter implements SourceAdapter {
  readonly kind: SourceKind = "api";
  readonly label: string;
  private url: string;
  private token: string;
  private arrayPath: string;
  private fieldMap: Required<ApiFieldMap>;

  constructor(opts?: {
    url?: string;
    token?: string;
    arrayPath?: string;
    label?: string;
    fieldMap?: ApiFieldMap;
  }) {
    this.url = opts?.url ?? process.env.API_FRAUD_URL ?? "";
    this.token = opts?.token ?? process.env.API_FRAUD_KEY ?? "";
    this.arrayPath = opts?.arrayPath ?? process.env.API_FRAUD_ARRAY_PATH ?? "data";
    this.label = opts?.label ?? `API ${this.url}`;
    this.fieldMap = { ...DEFAULT_FIELD_MAP, ...opts?.fieldMap };
  }

  async ingest() {
    const warnings: string[] = [];

    if (!this.url) {
      warnings.push("API_FRAUD_URL not configured — skipping API source");
      return { records: [] as NormalizedRecord[], meta: this.buildMeta(0, warnings) };
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let body: unknown;
    try {
      const resp = await fetch(this.url, { headers });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      body = await resp.json();
    } catch (err) {
      warnings.push(`API fetch failed: ${(err as Error).message}`);
      return { records: [] as NormalizedRecord[], meta: this.buildMeta(0, warnings) };
    }

    const items = (this.arrayPath
      ? dig(body as Record<string, unknown>, this.arrayPath)
      : body) as unknown[];

    if (!Array.isArray(items)) {
      warnings.push(`Response path "${this.arrayPath}" is not an array`);
      return { records: [] as NormalizedRecord[], meta: this.buildMeta(0, warnings) };
    }

    const fm = this.fieldMap;
    const records: NormalizedRecord[] = items.map((item, idx) => {
      const obj = (item ?? {}) as Record<string, unknown>;
      return {
        sourceId: String(dig(obj, fm.id) ?? `api-${idx}`),
        source: this.kind,
        title: String(dig(obj, fm.title) ?? ""),
        authority: String(dig(obj, fm.authority) ?? ""),
        contractor: String(dig(obj, fm.contractor) ?? ""),
        contractType: String(dig(obj, fm.contractType) ?? ""),
        category: String(dig(obj, fm.category) ?? ""),
        status: String(dig(obj, fm.status) ?? ""),
        procedureType: String(dig(obj, fm.procedureType) ?? ""),
        estimatedValue: Number(dig(obj, fm.estimatedValue)) || 0,
        winnerValue:
          dig(obj, fm.winnerValue) != null
            ? Number(dig(obj, fm.winnerValue)) || 0
            : null,
        announcementDate: String(dig(obj, fm.announcementDate) ?? ""),
        detailUrl: String(dig(obj, fm.detailUrl) ?? ""),
        extra: {},
      };
    });

    return { records, meta: this.buildMeta(records.length, warnings) };
  }

  private buildMeta(count: number, warnings: string[]): SourceMeta {
    return {
      kind: this.kind,
      label: this.label,
      fetchedAt: new Date().toISOString(),
      recordCount: count,
      warnings,
    };
  }
}
