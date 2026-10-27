import { MongoClient, type Db } from "mongodb";

// Un seul MongoClient, gardé dans une variable globale entre les appels (modèle officiel MongoDB + Next.js).
const globalForMongo = globalThis as unknown as { _casaMongo?: Promise<MongoClient> };

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI manquant");
  if (!globalForMongo._casaMongo) {
    globalForMongo._casaMongo = new MongoClient(uri, { maxPoolSize: 5, appName: "casa" }).connect();
    globalForMongo._casaMongo.catch(() => {
      globalForMongo._casaMongo = undefined;
    });
  }
  return globalForMongo._casaMongo;
}

export async function getDb(): Promise<Db> {
  return (await clientPromise()).db(process.env.MONGODB_DB || "casa");
}

export async function closeDb(): Promise<void> {
  const p = globalForMongo._casaMongo;
  globalForMongo._casaMongo = undefined;
  if (p) await (await p).close();
}
