export interface NodeDraftFields {
  title: string;
  contentMd: string;
  tagsInput: string;
  difficulty: string;
  sourceUrl: string;
}

export interface NodeDraftPayload extends NodeDraftFields {
  updatedAt: number;
}

const DRAFT_PREFIX = "kg.relations.draft";

export function createEmptyDraftFields(): NodeDraftFields {
  return {
    title: "",
    contentMd: "",
    tagsInput: "",
    difficulty: "3",
    sourceUrl: "",
  };
}

export function draftStorageKey(parentNodeId: string | null): string {
  return `${DRAFT_PREFIX}:${parentNodeId ?? "root"}`;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeDifficulty(value: unknown): string {
  const asString = safeString(value);
  return ["1", "2", "3", "4", "5"].includes(asString) ? asString : "3";
}

export function normalizeDraftFields(
  fields?: Partial<NodeDraftFields> | NodeDraftFields | null,
): NodeDraftFields {
  return {
    title: safeString(fields?.title),
    contentMd: safeString(fields?.contentMd),
    tagsInput: safeString(fields?.tagsInput),
    difficulty: normalizeDifficulty(fields?.difficulty),
    sourceUrl: safeString(fields?.sourceUrl),
  };
}

export function areDraftFieldsEqual(a: NodeDraftFields, b: NodeDraftFields): boolean {
  return (
    a.title === b.title &&
    a.contentMd === b.contentMd &&
    a.tagsInput === b.tagsInput &&
    a.difficulty === b.difficulty &&
    a.sourceUrl === b.sourceUrl
  );
}

export function hasDraftContent(fields: NodeDraftFields): boolean {
  return Boolean(
    fields.title.trim() ||
    fields.contentMd.trim() ||
    fields.tagsInput.trim() ||
    fields.sourceUrl.trim(),
  );
}

export function serializeDraft(fields: NodeDraftFields, updatedAt = Date.now()): string {
  return JSON.stringify({
    ...normalizeDraftFields(fields),
    updatedAt,
  });
}

export function parseDraft(raw: string): NodeDraftPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<NodeDraftPayload>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (typeof parsed.updatedAt !== "number" || !Number.isFinite(parsed.updatedAt)) {
      return null;
    }

    return {
      ...normalizeDraftFields(parsed),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}
