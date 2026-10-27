// Usage : npm run seed (lit .env.local). Crée les index et les catégories par défaut, sans rien écraser.
import { closeDb, getDb } from "../lib/db/mongo";
import { ensureIndexes } from "../lib/db/indexes";
import { DEFAULT_CATEGORIES } from "../lib/domain/categories";
import { normalizeName } from "../lib/domain/normalize";

async function main() {
  const db = await getDb();
  await ensureIndexes(db);
  console.log("Index créés.");
  const now = new Date();
  for (const name of DEFAULT_CATEGORIES) {
    const key = normalizeName(name);
    const res = await db
      .collection("categories")
      .updateOne({ key }, { $setOnInsert: { name, key, isDefault: true, createdAt: now } }, { upsert: true });
    console.log(`${res.upsertedCount ? "Ajoutée" : "Déjà là"} : ${name}`);
  }
  console.log(`Base « ${db.databaseName} » prête.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
