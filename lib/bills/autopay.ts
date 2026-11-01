import { ObjectId } from "mongodb";
import { bills, expenses, type ExpenseDoc } from "@/lib/db/collections";
import { autoPayments } from "@/lib/domain/bills";
import { dateToDay, dayInParis, dayToDate } from "@/lib/domain/dates";
import { publishChange } from "@/lib/realtime/server";

/**
 * Prélèvements automatiques : les factures en prélèvement dont l'échéance est passée se paient
 * seules (une dépense par échéance, datée de l'échéance). Appelé avant chaque lecture des factures
 * et des dépenses, il n'y a donc pas besoin de tâche planifiée.
 */
export async function settleAutoPay(): Promise<void> {
  const today = dayInParis();
  const col = await bills();
  const due = await col.find({ autoPay: true, paid: { $ne: true }, dueDate: { $lte: dayToDate(today) } }).toArray();
  if (!due.length) return;
  let changed = false;
  for (const bill of due) {
    const plan = autoPayments({ ...bill, dueDate: dateToDay(bill.dueDate) }, today);
    if (!plan.dates.length) continue;
    // On avance d'abord la facture, à condition qu'elle n'ait pas bougé : deux appels en même temps
    // ne créent pas deux fois la dépense.
    const res = await col.updateOne(
      { _id: bill._id, dueDate: bill.dueDate, paid: { $ne: true } },
      { $set: plan.paid ? { paid: true } : { dueDate: dayToDate(plan.nextDue) } },
    );
    if (!res.modifiedCount) continue;
    const personal = bill.scope === "personal";
    const payer = personal ? bill.owner ?? bill.createdBy : bill.autoPaidBy ?? "both";
    const now = new Date();
    const docs: ExpenseDoc[] = plan.dates.map((d) => ({
      _id: new ObjectId(),
      label: bill.label,
      amountCents: bill.amountCents,
      categoryId: bill.categoryId,
      scope: bill.scope,
      paidBy: payer,
      ...(personal ? { owner: bill.owner ?? bill.createdBy } : {}),
      date: dayToDate(d),
      source: "bill",
      billId: bill._id,
      auto: true,
      createdBy: bill.createdBy,
      createdAt: now,
      updatedAt: now,
    }));
    await (await expenses()).insertMany(docs);
    changed = true;
  }
  if (changed) await Promise.all([publishChange("bills", due[0].createdBy), publishChange("expenses", due[0].createdBy)]);
}
