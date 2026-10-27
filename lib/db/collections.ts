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
