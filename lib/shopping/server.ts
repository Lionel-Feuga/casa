import { ObjectId } from "mongodb";
import { itemHistory, shoppingItems, type ShoppingItemDoc } from "@/lib/db/collections";
import { normalizeName } from "@/lib/domain/normalize";
import type { Profile } from "@/lib/domain/profile";
import { cleanName, findDuplicate, positionAtEnd, sortItems, type ShoppingItem, type Suggestion } from "@/lib/domain/shopping";
import { publishChange } from "@/lib/realtime/server";

export function toItem(d: ShoppingItemDoc): ShoppingItem {
  return {
    id: d._id.toHexString(),
    name: d.name,
    position: d.position,
    checked: d.checked,
    checkedAt: d.checkedAt?.toISOString(),
    checkedBy: d.checkedBy,
    addedBy: d.addedBy,
    createdAt: d.createdAt.toISOString(),
  };
}

export async function listItems(): Promise<ShoppingItem[]> {
  const docs = await (await shoppingItems()).find().sort({ position: 1, _id: 1 }).toArray();
  return sortItems(docs.map(toItem));
}

async function recordHistory(name: string, now: Date): Promise<void> {
  // Le nom affiché retenu est celui du dernier ajout ; un ajout volontaire fait revenir une suggestion retirée.
  await (await itemHistory()).updateOne(
    { key: normalizeName(name) },
    { $inc: { count: 1 }, $set: { label: name, lastAddedAt: now, hidden: false } },
    { upsert: true },
  );
}

export type AddStatus = "added" | "exists" | "unchecked" | "empty";

export async function addItem(rawName: string, by: Profile, id?: string): Promise<{ status: AddStatus; item?: ShoppingItem }> {
  const name = cleanName(rawName);
  if (!name) return { status: "empty" };
  const col = await shoppingItems();
  const now = new Date();

  if (id) {
    // Même requête renvoyée (réseau capricieux) : on ne l'ajoute pas deux fois.
    const same = await col.findOne({ _id: new ObjectId(id) });
    if (same) return { status: "exists", item: toItem(same) };
  }

  const items = (await col.find().toArray()).map(toItem);
  const dup = findDuplicate(items, name);
  if (dup && !dup.checked) return { status: "exists", item: dup };

  if (dup) {
    const doc = await col.findOneAndUpdate(
      { _id: new ObjectId(dup.id) },
      { $set: { checked: false }, $unset: { checkedAt: "", checkedBy: "" } },
      { returnDocument: "after" },
    );
    await recordHistory(name, now);
    await Promise.all([publishChange("shopping", by), publishChange("history", by)]);
    return { status: "unchecked", item: doc ? toItem(doc) : dup };
  }

  const doc: ShoppingItemDoc = {
    _id: id ? new ObjectId(id) : new ObjectId(),
    name,
    position: positionAtEnd(items),
    checked: false,
    addedBy: by,
    createdAt: now,
  };
  await col.insertOne(doc);
  await recordHistory(name, now);
  await Promise.all([publishChange("shopping", by), publishChange("history", by)]);
  return { status: "added", item: toItem(doc) };
}

/** Annulation d'une suppression : l'article revient tel quel, sans compter dans l'historique. */
export async function restoreItem(item: ShoppingItem, by: Profile): Promise<ShoppingItem> {
  const doc: ShoppingItemDoc = {
    _id: new ObjectId(item.id),
    name: cleanName(item.name),
    position: item.position,
    checked: item.checked,
    ...(item.checked && item.checkedAt ? { checkedAt: new Date(item.checkedAt), checkedBy: item.checkedBy } : {}),
    addedBy: item.addedBy,
    createdAt: new Date(item.createdAt),
  };
  await (await shoppingItems()).updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
  await publishChange("shopping", by);
  return toItem(doc);
}

export async function updateItem(id: string, patch: { checked?: boolean; position?: string }, by: Profile): Promise<ShoppingItem | null> {
  const $set: Partial<ShoppingItemDoc> = {};
  const $unset: Record<string, ""> = {};
  if (patch.position !== undefined) $set.position = patch.position;
  if (patch.checked === true) Object.assign($set, { checked: true, checkedAt: new Date(), checkedBy: by });
  if (patch.checked === false) {
    $set.checked = false;
    Object.assign($unset, { checkedAt: "", checkedBy: "" });
  }
  const doc = await (await shoppingItems()).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set, ...(Object.keys($unset).length ? { $unset } : {}) },
    { returnDocument: "after" },
  );
  if (!doc) return null;
  await publishChange("shopping", by);
  return toItem(doc);
}

export async function deleteItem(id: string, by: Profile): Promise<ShoppingItem | null> {
  const doc = await (await shoppingItems()).findOneAndDelete({ _id: new ObjectId(id) });
  if (!doc) return null;
  await publishChange("shopping", by);
  return toItem(doc);
}

export async function clearChecked(by: Profile): Promise<number> {
  const res = await (await shoppingItems()).deleteMany({ checked: true });
  if (res.deletedCount) await publishChange("shopping", by);
  return res.deletedCount;
}

export async function listSuggestions(): Promise<Suggestion[]> {
  const docs = await (await itemHistory())
    .find({ hidden: { $ne: true } }, { projection: { key: 1, label: 1, count: 1, lastAddedAt: 1 } })
    .sort({ count: -1, lastAddedAt: -1 })
    .limit(2000)
    .toArray();
  return docs.map((d) => ({ key: d.key, label: d.label, count: d.count, lastAddedAt: d.lastAddedAt.toISOString() }));
}

export async function hideSuggestion(key: string, by: Profile): Promise<boolean> {
  const res = await (await itemHistory()).updateOne({ key }, { $set: { hidden: true } });
  if (res.matchedCount) await publishChange("history", by);
  return res.matchedCount > 0;
}
