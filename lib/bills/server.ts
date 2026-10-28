import { ObjectId, type Filter } from "mongodb";
import { bills, expenses, type BillDoc, type ExpenseDoc } from "@/lib/db/collections";
import { nextDueDate, type Bill, type BillEvery, type BillKind } from "@/lib/domain/bills";
import { dateToDay, dayToDate, type Day } from "@/lib/domain/dates";
import type { Payer } from "@/lib/domain/money";
import type { Profile } from "@/lib/domain/profile";
import { cleanName } from "@/lib/domain/shopping";
import { toExpense, type Expense } from "@/lib/money/server";
import { publishChange } from "@/lib/realtime/server";

const toBill = (d: BillDoc): Bill => ({
  id: d._id.toHexString(),
  label: d.label,
  amountCents: d.amountCents,
  categoryId: d.categoryId.toHexString(),
  scope: d.scope,
  owner: d.owner,
  kind: d.kind,
  every: d.every,
  dueDate: dateToDay(d.dueDate),
  dayOfMonth: d.dayOfMonth,
  paid: d.paid,
});

/** Une facture perso n'est visible que par son propriétaire (section 8.1). */
const visibleTo = (viewer: Profile): Filter<BillDoc> => ({ $or: [{ scope: "shared" }, { scope: "personal", owner: viewer }] });

export interface BillInput {
  label: string;
  amountCents: number;
  categoryId: string;
  scope: "shared" | "personal";
  kind: BillKind;
  every?: BillEvery;
  dueDate: Day;
}

function fieldsFrom(input: BillInput, by: Profile) {
  return {
    label: cleanName(input.label).slice(0, 60),
    amountCents: input.amountCents,
    categoryId: new ObjectId(input.categoryId),
    scope: input.scope,
    kind: input.kind,
    dueDate: dayToDate(input.dueDate),
    dayOfMonth: Number(input.dueDate.slice(8)),
    ...(input.kind === "recurring" ? { every: input.every ?? "month" } : {}),
    ...(input.scope === "personal" ? { owner: by } : {}),
  };
}

export async function listBills(viewer: Profile): Promise<Bill[]> {
  // Les factures ponctuelles déjà payées n'ont plus rien à afficher (elles restent visibles par leur dépense).
  const docs = await (await bills()).find({ ...visibleTo(viewer), paid: { $ne: true } }).sort({ dueDate: 1 }).toArray();
  return docs.map(toBill);
}

export async function getBill(id: string, viewer: Profile): Promise<Bill | null> {
  const doc = await (await bills()).findOne({ _id: new ObjectId(id), ...visibleTo(viewer) });
  return doc ? toBill(doc) : null;
}

export async function createBill(input: BillInput, by: Profile): Promise<Bill> {
  const doc: BillDoc = { _id: new ObjectId(), ...fieldsFrom(input, by), paid: false, createdBy: by, createdAt: new Date() };
  await (await bills()).insertOne(doc);
  await publishChange("bills", by);
  return toBill(doc);
}

export async function updateBill(id: string, input: BillInput, by: Profile): Promise<Bill | null> {
  const unset: Record<string, ""> = {};
  if (input.kind === "once") unset.every = "";
  if (input.scope === "shared") unset.owner = "";
  const doc = await (await bills()).findOneAndUpdate(
    { _id: new ObjectId(id), ...visibleTo(by) },
    { $set: fieldsFrom(input, by), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { returnDocument: "after" },
  );
  if (!doc) return null;
  await publishChange("bills", by);
  return toBill(doc);
}

export async function deleteBill(id: string, by: Profile): Promise<boolean> {
  const res = await (await bills()).deleteOne({ _id: new ObjectId(id), ...visibleTo(by) });
  if (res.deletedCount) await publishChange("bills", by);
  return res.deletedCount > 0;
}

/**
 * « Marquer payé » (section 8.2) : crée la dépense dans la catégorie de la facture, puis avance
 * l'échéance (récurrente) ou passe la facture en payée (ponctuelle).
 */
export async function payBill(
  id: string,
  pay: { amountCents: number; date: Day; paidBy: Payer },
  by: Profile,
): Promise<{ bill: Bill; expense: Expense } | null> {
  const col = await bills();
  const bill = await col.findOne({ _id: new ObjectId(id), ...visibleTo(by), paid: { $ne: true } });
  if (!bill) return null;
  const personal = bill.scope === "personal";
  const next = bill.kind === "recurring" ? dayToDate(nextDueDate(dateToDay(bill.dueDate), bill.every ?? "month", bill.dayOfMonth)) : bill.dueDate;
  const now = new Date();
  const expense: ExpenseDoc = {
    _id: new ObjectId(),
    label: bill.label,
    amountCents: pay.amountCents,
    categoryId: bill.categoryId,
    scope: bill.scope,
    paidBy: personal ? bill.owner ?? by : pay.paidBy,
    ...(personal ? { owner: bill.owner ?? by } : {}),
    date: dayToDate(pay.date),
    source: "bill",
    billId: bill._id,
    billPrevDueDate: bill.dueDate,
    billNextDueDate: next,
    createdBy: by,
    createdAt: now,
    updatedAt: now,
  };
  await (await expenses()).insertOne(expense);
  const updated = await col.findOneAndUpdate(
    { _id: bill._id },
    { $set: bill.kind === "recurring" ? { dueDate: next } : { paid: true } },
    { returnDocument: "after" },
  );
  await Promise.all([publishChange("bills", by), publishChange("expenses", by)]);
  return { bill: toBill(updated ?? bill), expense: toExpense(expense) };
}
