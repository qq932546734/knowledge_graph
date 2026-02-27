import { beforeEach, describe, expect, it, vi } from "vitest";

interface TokenRow {
  token: string;
  userId: string;
  payloadHash: string;
  expiresAt: Date;
}

const rows = new Map<string, TokenRow>();

const create = vi.fn(async ({ data }: { data: TokenRow }) => {
  rows.set(data.token, data);
  return data;
});

const deleteMany = vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
  let count = 0;

  if (where.token && where.userId && where.payloadHash && where.expiresAt) {
    const row = rows.get(String(where.token));
    const gte = (where.expiresAt as { gte: Date }).gte;

    if (
      row &&
      row.userId === where.userId &&
      row.payloadHash === where.payloadHash &&
      row.expiresAt >= gte
    ) {
      rows.delete(row.token);
      count = 1;
    }

    return { count };
  }

  if (where.token) {
    if (rows.delete(String(where.token))) {
      count = 1;
    }

    return { count };
  }

  if (where.expiresAt) {
    const lt = (where.expiresAt as { lt: Date }).lt;

    for (const [token, row] of rows.entries()) {
      if (row.expiresAt < lt) {
        rows.delete(token);
        count += 1;
      }
    }

    return { count };
  }

  return { count };
});

vi.mock("@/server/db", () => ({
  prisma: {
    backupValidationToken: {
      create,
      deleteMany,
    },
  },
}));

describe("backup token store", () => {
  beforeEach(() => {
    rows.clear();
    create.mockClear();
    deleteMany.mockClear();
  });

  it("issues and consumes a token once", async () => {
    const { issueValidationToken, consumeValidationToken } =
      await import("@/server/backup/token-store");

    const token = await issueValidationToken("u1", "hash-1");

    await expect(consumeValidationToken(token, "u1", "hash-1")).resolves.toBe(true);
    await expect(consumeValidationToken(token, "u1", "hash-1")).resolves.toBe(false);
  });

  it("invalidates token on hash mismatch", async () => {
    const { issueValidationToken, consumeValidationToken } =
      await import("@/server/backup/token-store");

    const token = await issueValidationToken("u1", "hash-1");

    await expect(consumeValidationToken(token, "u1", "hash-2")).resolves.toBe(false);
    await expect(consumeValidationToken(token, "u1", "hash-1")).resolves.toBe(false);
  });

  it("cleans up expired tokens during issue", async () => {
    const { issueValidationToken } = await import("@/server/backup/token-store");

    rows.set("expired", {
      token: "expired",
      userId: "u1",
      payloadHash: "hash-expired",
      expiresAt: new Date(Date.now() - 1000),
    });

    await issueValidationToken("u1", "hash-1");

    expect(rows.has("expired")).toBe(false);
  });
});
