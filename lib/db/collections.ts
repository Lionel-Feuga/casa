import type { Collection, ObjectId } from "mongodb";
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
