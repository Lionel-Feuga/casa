import type { Db } from "mongodb";

// Index de toutes les collections (section 11). Appelé par scripts/seed.ts, sans effet s'ils existent déjà.
export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("devices").createIndex({ tokenHash: 1 }, { unique: true });
  await db.collection("login_attempts").createIndex({ ip: 1 }, { unique: true });
  await db.collection("login_attempts").createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection("shopping_items").createIndex({ position: 1 });
  await db.collection("item_history").createIndex({ key: 1 }, { unique: true });
  await db.collection("categories").createIndex({ key: 1 }, { unique: true });
  const expenses = db.collection("expenses");
  await expenses.createIndex({ date: -1 });
  await expenses.createIndex({ categoryId: 1, date: -1 });
  await expenses.createIndex({ scope: 1, date: -1 });
  await db.collection("budgets").createIndex({ categoryId: 1, view: 1 }, { unique: true });
  await db.collection("tasks").createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection("bills").createIndex({ dueDate: 1 });
}
