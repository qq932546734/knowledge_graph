import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/server/auth/password";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeThisPassword123!";

  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash },
    });
    console.info(`Updated seed admin: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  console.info(`Created seed admin: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
