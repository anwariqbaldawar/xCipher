"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { handleServerError } from "@/lib/errors";
import { user } from "@/lib/db/schema";
import { sql } from "drizzle-orm";


export async function setupOwner(email: string, password: string, name: string) {
  if (!email || !password || password.length < 8) {
    return { error: "Invalid email or password (min 8 characters)." };
  }

  try {
    const hashedPassword = await hashPassword(password);

    const createdUser = await db.transaction(async (tx) => {
      // Serialize concurrent first-run bootstrap attempts across database sessions.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(982451653)`);

      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(user);

      if (count > 0) {
        throw new Error("Setup has already been completed.");
      }

      const [inserted] = await tx.insert(user).values({
        id: crypto.randomUUID(),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        role: "OWNER",
      }).returning();

      return inserted;
    });

    return { success: true, userId: createdUser.id };
  } catch (error: any) {
    const isExpected = error.message === "Setup has already been completed.";
    return handleServerError(error, isExpected ? error.message : "Failed to create owner.");
  }
}
