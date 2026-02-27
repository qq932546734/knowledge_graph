import { describe, expect, it } from "vitest";

import {
  areDraftFieldsEqual,
  createEmptyDraftFields,
  draftStorageKey,
  hasDraftContent,
  normalizeDraftFields,
  parseDraft,
  serializeDraft,
} from "@/app/relations/draft";

describe("relations draft helpers", () => {
  it("builds storage keys for root and child drafts", () => {
    expect(draftStorageKey(null)).toBe("kg.relations.draft:root");
    expect(draftStorageKey("node_1")).toBe("kg.relations.draft:node_1");
  });

  it("normalizes draft fields and defaults difficulty to 3", () => {
    expect(
      normalizeDraftFields({
        title: "A",
        difficulty: "9",
      }),
    ).toEqual({
      title: "A",
      contentMd: "",
      tagsInput: "",
      difficulty: "3",
      sourceUrl: "",
    });
  });

  it("detects meaningful draft content", () => {
    expect(hasDraftContent(createEmptyDraftFields())).toBe(false);
    expect(
      hasDraftContent({
        ...createEmptyDraftFields(),
        contentMd: "## test",
      }),
    ).toBe(true);
  });

  it("compares draft fields accurately", () => {
    const base = {
      title: "T",
      contentMd: "C",
      tagsInput: "a,b",
      difficulty: "2",
      sourceUrl: "https://a.com",
    };

    expect(areDraftFieldsEqual(base, { ...base })).toBe(true);
    expect(areDraftFieldsEqual(base, { ...base, title: "X" })).toBe(false);
  });

  it("serializes and parses draft payloads", () => {
    const raw = serializeDraft(
      {
        title: "Title",
        contentMd: "Body",
        tagsInput: "x, y",
        difficulty: "4",
        sourceUrl: "",
      },
      123,
    );

    expect(parseDraft(raw)).toEqual({
      title: "Title",
      contentMd: "Body",
      tagsInput: "x, y",
      difficulty: "4",
      sourceUrl: "",
      updatedAt: 123,
    });
  });

  it("returns null for invalid draft payloads", () => {
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ title: "x" }))).toBeNull();
  });
});
