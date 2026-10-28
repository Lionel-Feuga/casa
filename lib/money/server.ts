import { ObjectId, type Filter } from "mongodb";
import { bills, categories, expenses, settlements, type CategoryDoc, type ExpenseDoc, type SettlementDoc } from "@/lib/db/collections";
import { getDb } from "@/lib/db/mongo";
import { cleanName } from "@/lib/domain/shopping";
import { FALLBACK_CATEGORY_KEY, sortCategories, type Category } from "@/lib/domain/categories";
import { dateToDay, dayInParis, dayToDate, monthRange, type Day, type Month } from "@/lib/domain/dates";
import { computeBalance, settlementFor, type Payer, type Scope } from "@/lib/domain/money";
import { normalizeName } from "@/lib/domain/normalize";
import type { Profile } from "@/lib/domain/profile";
import { publishChange } from "@/lib/realtime/server";

// ---------- Catégories (section 4) ----------

const toCategory = (d: CategoryDoc): Category => ({ id: d._id!.toHexString(), name: d.name, key: d.key, isDefault: d.isDefault });

export async function listCategories(): Promise<Category[]> {
  return sortCategories((await (await categories()).find().sort({ createdAt: 1 }).toArray()).map(toCategory));
}

/** « + Autre » : crée une catégorie réutilisable, ou réutilise celle qui a déjà ce nom normalisé. */
export async function createCategory(rawName: string, by: Profile): Promise<Category | null> {
  const name = cleanName(rawName).slice(0, 30);
  const key = normalizeName(name);
  if (!key) return null;
  const col = await categories();
  await col.updateOne({ key }, { $setOnInsert: { name, key, isDefault: false, createdAt: new Date() } }, { upsert: true });
  const doc = await col.findOne({ key });
  await publishChange("categories", by);
  return doc ? toCategory(doc) : null;
}

export type DeleteCategoryResult = "deleted" | "not_found" | "protected";

/** Supprime une catégorie créée : ses dépenses (et factures) passent dans Divers, ses plafonds disparaissent. */
export async function deleteCategory(id: string, by: Profile): Promise<DeleteCategoryResult> {
  const col = await categories();
  const _id = new ObjectId(id);
  const doc = await col.findOne({ _id });
  if (!doc) return "not_found";
  if (doc.isDefault || doc.key === FALLBACK_CATEGORY_KEY) return "protected";
  const divers = await col.findOne({ key: FALLBACK_CATEGORY_KEY });
  if (!divers) throw new Error("Catégorie Divers introuvable : lancer npm run seed");
  const db = await getDb();
  await db.collection("expenses").updateMany({ categoryId: _id }, { $set: { categoryId: divers._id } });
  await db.collection("bills").updateMany({ categoryId: _id }, { $set: { categoryId: divers._id } });
  await db.collection("budgets").deleteMany({ categoryId: _id });
  await col.deleteOne({ _id });
  await Promise.all([publishChange("categories", by), publishChange("expenses", by), publishChange("budgets", by)]);
  return "deleted";
}

export async function categoryExists(id: string): Promise<boolean> {
  return !!(await (await categories()).findOne({ _id: new ObjectId(id) }, { projection: { _id: 1 } }));
}

// ---------- Dépenses (section 5.1) ----------

export interface Expense {
  id: string;
  label: string;
  amountCents: number;
  categoryId: string;
  scope: Scope;
  paidBy: Payer;
  owner?: Profile;
  date: Day;
  source: ExpenseDoc["source"];
  billId?: string;
  createdBy: Profile;
  createdAt: string;
}

export const toExpense = (d: ExpenseDoc): Expense => ({
  id: d._id.toHexString(),
  label: d.label,
  amountCents: d.amountCents,
  categoryId: d.categoryId.toHexString(),
  scope: d.scope,
  paidBy: d.paidBy,
  owner: d.owner,
  date: dateToDay(d.date),
  source: d.source,
  billId: d.billId?.toHexString(),
  createdBy: d.createdBy,
  createdAt: d.createdAt.toISOString(),
});

/** Une dépense perso n'est visible que par son propriétaire. */
export const visibleTo = (viewer: Profile): Filter<ExpenseDoc> => ({ $or: [{ scope: "shared" }, { scope: "personal", owner: viewer }] });

export interface ExpenseInput {
  label: string;
  amountCents: number;
  categoryId: string;
  scope: Scope;
  /** « both » seulement pour une dépense créée par une facture commune. */
  paidBy: Payer;
  date: Day;
  source?: "manual" | "ticket";
}

/** Avec « Juste moi », la dépense appartient au profil actuel, qui l'a payée. */
function fieldsFrom(input: ExpenseInput, by: Profile) {
  const personal = input.scope === "personal";
  return {
    label: cleanName(input.label).slice(0, 60),
    amountCents: input.amountCents,
    categoryId: new ObjectId(input.categoryId),
    scope: input.scope,
    paidBy: personal ? by : input.paidBy,
    date: dayToDate(input.date),
    ...(personal ? { owner: by } : {}),
  };
}

export async function listExpenses(viewer: Profile, opts: { month?: Month; scope?: Scope }): Promise<Expense[]> {
  const byScope: Filter<ExpenseDoc> =
    opts.scope === "shared" ? { scope: "shared" } : opts.scope === "personal" ? { scope: "personal", owner: viewer } : visibleTo(viewer);
  const range = opts.month ? monthRange(opts.month) : null;
  const filter: Filter<ExpenseDoc> = range ? { ...byScope, date: { $gte: range.start, $lt: range.end } } : byScope;
  const docs = await (await expenses()).find(filter).sort({ date: -1, createdAt: -1 }).limit(1000).toArray();
  return docs.map(toExpense);
}

export async function getExpense(id: string, viewer: Profile): Promise<Expense | null> {
  const doc = await (await expenses()).findOne({ _id: new ObjectId(id), ...visibleTo(viewer) });
  return doc ? toExpense(doc) : null;
}

export async function createExpense(input: ExpenseInput, by: Profile): Promise<Expense> {
  const now = new Date();
  const doc: ExpenseDoc = { _id: new ObjectId(), ...fieldsFrom(input, by), source: input.source ?? "manual", createdBy: by, createdAt: now, updatedAt: now };
  await (await expenses()).insertOne(doc);
  await publishChange("expenses", by);
  return toExpense(doc);
}

export async function updateExpense(id: string, input: ExpenseInput, by: Profile): Promise<Expense | null> {
  const fields = fieldsFrom(input, by);
  // « Payé par les deux » n'existe que pour les factures communes.
  const extra: Filter<ExpenseDoc> = input.paidBy === "both" ? { source: "bill", scope: "shared" } : {};
  const doc = await (await expenses()).findOneAndUpdate(
    { _id: new ObjectId(id), ...visibleTo(by), ...extra },
    { $set: { ...fields, updatedAt: new Date() }, ...(input.scope === "shared" ? { $unset: { owner: "" } } : {}) },
    { returnDocument: "after" },
  );
  if (!doc) return null;
  await publishChange("expenses", by);
  return toExpense(doc);
}

export async function deleteExpense(id: string, by: Profile): Promise<boolean> {
  const doc = await (await expenses()).findOneAndDelete({ _id: new ObjectId(id), ...visibleTo(by) });
  if (!doc) return false;
  await restoreBill(doc, by);
  await publishChange("expenses", by);
  return true;
}

/**
 * Supprimer la dépense créée par « Marquer payé » remet la facture dans son état précédent
 * (section 8.2), seulement si elle n'a pas été payée de nouveau depuis.
 */
async function restoreBill(e: ExpenseDoc, by: Profile): Promise<void> {
  if (e.source !== "bill" || !e.billId || !e.billPrevDueDate) return;
  const col = await bills();
  const bill = await col.findOne({ _id: e.billId });
  if (!bill) return;
  const latest = bill.kind === "recurring" ? bill.dueDate.getTime() === e.billNextDueDate?.getTime() : bill.paid;
  if (!latest) return;
  await col.updateOne({ _id: bill._id }, { $set: { dueDate: e.billPrevDueDate, paid: false } });
  await publishChange("bills", by);
}

// ---------- Solde et règlements (sections 5.3 et 5.4) ----------

export interface Settlement {
  id: string;
  from: Profile;
  to: Profile;
  amountCents: number;
  date: Day;
  createdAt: string;
}

const toSettlement = (d: SettlementDoc): Settlement => ({
  id: d._id.toHexString(),
  from: d.from,
  to: d.to,
  amountCents: d.amountCents,
  date: dateToDay(d.date),
  createdAt: d.createdAt.toISOString(),
});

export interface BalanceView {
  balanceCents: number;
  /** Détail depuis le dernier règlement. */
  dueByJaz: number;
  dueByLionel: number;
}

export async function getBalance(): Promise<BalanceView> {
  const shared = await (await expenses())
    .find({ scope: "shared" }, { projection: { amountCents: 1, scope: 1, paidBy: 1, createdAt: 1 } })
    .toArray();
  const all = await (await settlements()).find().sort({ createdAt: -1 }).toArray();
  const { balanceCents } = computeBalance(shared, all);
  const last = all[0]?.createdAt;
  const since = computeBalance(last ? shared.filter((e) => e.createdAt > last) : shared, []);
  return { balanceCents, dueByJaz: since.dueByJaz, dueByLionel: since.dueByLionel };
}

export async function listSettlements(month: Month): Promise<Settlement[]> {
  const { start, end } = monthRange(month);
  const docs = await (await settlements()).find({ date: { $gte: start, $lt: end } }).sort({ date: -1, createdAt: -1 }).toArray();
  return docs.map(toSettlement);
}

/** « Régler » : enregistre le solde entier, de la personne qui doit vers l'autre, à la date du jour. */
export async function settle(by: Profile): Promise<Settlement | null> {
  const s = settlementFor((await getBalance()).balanceCents);
  if (!s) return null;
  const now = new Date();
  const doc: SettlementDoc = { _id: new ObjectId(), ...s, date: dayToDate(dayInParis(now)), createdBy: by, createdAt: now };
  await (await settlements()).insertOne(doc);
  await publishChange("settlements", by);
  return toSettlement(doc);
}

export async function deleteSettlement(id: string, by: Profile): Promise<boolean> {
  const res = await (await settlements()).deleteOne({ _id: new ObjectId(id) });
  if (res.deletedCount) await publishChange("settlements", by);
  return res.deletedCount > 0;
}
