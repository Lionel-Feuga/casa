import type { Collection, ObjectId } from "mongodb";
import type { Profile } from "@/lib/domain/profile";
import { getDb } from "./mongo";

export interface DeviceDoc {
  _id?: ObjectId;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface LoginAttemptDoc {
  _id?: ObjectId;
  ip: string;
  failures: number;
  lockedUntil?: Date;
  expireAt: Date;
}

export interface CategoryDoc {
  _id?: ObjectId;
  name: string;
  key: string;
  isDefault: boolean;
  createdAt: Date;
}

export async function devices(): Promise<Collection<DeviceDoc>> {
  return (await getDb()).collection<DeviceDoc>("devices");
}

export async function loginAttempts(): Promise<Collection<LoginAttemptDoc>> {
  return (await getDb()).collection<LoginAttemptDoc>("login_attempts");
}

export async function categories(): Promise<Collection<CategoryDoc>> {
  return (await getDb()).collection<CategoryDoc>("categories");
}

export interface ShoppingItemDoc {
  _id: ObjectId;
  name: string;
  position: string;
  checked: boolean;
  checkedAt?: Date;
  checkedBy?: Profile;
  addedBy: Profile;
  createdAt: Date;
}

export interface ItemHistoryDoc {
  _id?: ObjectId;
  key: string;
  label: string;
  count: number;
  lastAddedAt: Date;
  hidden: boolean;
}

export async function shoppingItems(): Promise<Collection<ShoppingItemDoc>> {
  return (await getDb()).collection<ShoppingItemDoc>("shopping_items");
}

export async function itemHistory(): Promise<Collection<ItemHistoryDoc>> {
  return (await getDb()).collection<ItemHistoryDoc>("item_history");
}

export interface ExpenseDoc {
  _id: ObjectId;
  label: string;
  amountCents: number;
  categoryId: ObjectId;
  scope: "shared" | "personal";
  paidBy: Profile | "both";
  owner?: Profile;
  date: Date;
  source: "manual" | "ticket" | "bill";
  billId?: ObjectId;
  /** Échéance de la facture avant et après ce paiement, pour la remettre si la dépense est supprimée. */
  billPrevDueDate?: Date;
  billNextDueDate?: Date;
  createdBy: Profile;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettlementDoc {
  _id: ObjectId;
  from: Profile;
  to: Profile;
  amountCents: number;
  date: Date;
  createdBy: Profile;
  createdAt: Date;
}

export async function expenses(): Promise<Collection<ExpenseDoc>> {
  return (await getDb()).collection<ExpenseDoc>("expenses");
}

export async function settlements(): Promise<Collection<SettlementDoc>> {
  return (await getDb()).collection<SettlementDoc>("settlements");
}

export interface BudgetDoc {
  _id?: ObjectId;
  categoryId: ObjectId;
  view: "shared" | Profile;
  monthlyLimitCents: number | null;
}

export async function budgets(): Promise<Collection<BudgetDoc>> {
  return (await getDb()).collection<BudgetDoc>("budgets");
}

export interface BillDoc {
  _id: ObjectId;
  label: string;
  amountCents: number;
  categoryId: ObjectId;
  scope: "shared" | "personal";
  owner?: Profile;
  kind: "recurring" | "once";
  every?: "month" | "year";
  dueDate: Date;
  dayOfMonth: number;
  paid: boolean;
  createdBy: Profile;
  createdAt: Date;
}

export async function bills(): Promise<Collection<BillDoc>> {
  return (await getDb()).collection<BillDoc>("bills");
}

export interface TaskDoc {
  _id: ObjectId;
  title: string;
  assignee: Profile | "both";
  dueDate?: Date;
  done: boolean;
  doneAt?: Date;
  doneBy?: Profile;
  /** Index TTL : la tâche faite disparaît 7 jours après. */
  expireAt?: Date;
  categoryId?: ObjectId;
  /** Ordre dans la catégorie (index fractionnaire). Absent sur les tâches créées avant les catégories. */
  position?: string;
  createdBy: Profile;
  createdAt: Date;
}

export interface TaskCategoryDoc {
  _id: ObjectId;
  name: string;
  position: string;
  createdAt: Date;
}

export async function taskCategories(): Promise<Collection<TaskCategoryDoc>> {
  return (await getDb()).collection<TaskCategoryDoc>("task_categories");
}

export async function tasks(): Promise<Collection<TaskDoc>> {
  return (await getDb()).collection<TaskDoc>("tasks");
}
