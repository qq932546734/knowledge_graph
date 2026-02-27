import { randomBytes } from "crypto";

import { prisma } from "@/server/db";

const TEN_MINUTES_MS = 10 * 60 * 1000;

export async function issueValidationToken(userId: string, payloadHash: string): Promise<string> {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + TEN_MINUTES_MS);

  await prisma.backupValidationToken.create({
    data: {
      token,
      userId,
      payloadHash,
      expiresAt,
    },
  });

  await prisma.backupValidationToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return token;
}

export async function consumeValidationToken(
  token: string,
  userId: string,
  payloadHash: string,
): Promise<boolean> {
  const now = new Date();

  const deleted = await prisma.backupValidationToken.deleteMany({
    where: {
      token,
      userId,
      payloadHash,
      expiresAt: {
        gte: now,
      },
    },
  });

  if (deleted.count !== 1) {
    await prisma.backupValidationToken.deleteMany({
      where: {
        token,
      },
    });
    return false;
  }

  await prisma.backupValidationToken.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  return true;
}
