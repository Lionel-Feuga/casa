"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { findDuplicate, positionAtEnd, sortItems, cleanName, type ShoppingItem, type Suggestion } from "@/lib/domain/shopping";
import { api, getStoredProfile } from "./api";
import { readLocal, writeLocal } from "./storage";

const ITEMS_KEY = ["shopping"] as const;
const HISTORY_KEY = ["history"] as const;
const CACHE_KEY = "casa.cache.shopping";

/** Identifiant MongoDB créé sur le téléphone, pour afficher l'article avant la réponse du serveur. */
export function newObjectId(): string {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
  return ts + rnd;
}

function readCache(): ShoppingItem[] | undefined {
  try {
    const raw = readLocal(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ShoppingItem[]) : undefined;
  } catch {
    return undefined;
  }
}

/** Liste de courses : affichée tout de suite depuis le cache du téléphone, puis rafraîchie (section 10.4). */
export function useShoppingItems() {
  const query = useQuery({
    queryKey: ITEMS_KEY,
    queryFn: async () => sortItems((await api<{ items: ShoppingItem[] }>("/shopping")).items),
    initialData: readCache,
    initialDataUpdatedAt: 0,
  });
  useEffect(() => {
    if (query.data) writeLocal(CACHE_KEY, JSON.stringify(query.data));
  }, [query.data]);
  return query;
}

export function useSuggestions() {
  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: async () => (await api<{ suggestions: Suggestion[] }>("/shopping/suggestions")).suggestions,
    staleTime: 60_000,
  });
}

/** Mutations optimistes : l'écran change tout de suite, puis la réponse du serveur confirme (section 10.6). */
export function useShoppingActions() {
  const qc = useQueryClient();

  const current = () => qc.getQueryData<ShoppingItem[]>(ITEMS_KEY) ?? [];
  const setItems = (fn: (items: ShoppingItem[]) => ShoppingItem[]) =>
    qc.setQueryData<ShoppingItem[]>(ITEMS_KEY, (old) => sortItems(fn(old ?? [])));

  const optimistic = async () => {
    await qc.cancelQueries({ queryKey: ITEMS_KEY });
    return current();
  };
  const rollback = (_e: unknown, _v: unknown, prev: ShoppingItem[] | undefined) => {
    if (prev) qc.setQueryData(ITEMS_KEY, prev);
  };
  // Une seule relecture quand plusieurs actions s'enchaînent, pour éviter que la liste saute.
  const settle = () => {
    if (qc.isMutating() <= 1) return qc.invalidateQueries({ queryKey: ITEMS_KEY });
  };

  const add = useMutation({
    mutationFn: (v: { id: string; name: string }) => api("/shopping", { method: "POST", body: JSON.stringify(v) }),
    onMutate: async ({ id, name }) => {
      const prev = await optimistic();
      const dup = findDuplicate(prev, name);
      if (dup) setItems((items) => items.map((i) => (i.id === dup.id ? { ...i, checked: false, checkedAt: undefined, checkedBy: undefined } : i)));
      else
        setItems((items) => [
          ...items,
          {
            id,
            name,
            position: positionAtEnd(items),
            checked: false,
            addedBy: getStoredProfile() ?? "lionel",
            createdAt: new Date().toISOString(),
          },
        ]);
      return prev;
    },
    onError: rollback,
    onSettled: () => {
      settle();
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; checked: boolean }) =>
      api(`/shopping/${v.id}`, { method: "PATCH", body: JSON.stringify({ checked: v.checked }) }),
    onMutate: async ({ id, checked }) => {
      const prev = await optimistic();
      setItems((items) => items.map((i) => (i.id === id ? { ...i, checked } : i)));
      return prev;
    },
    onError: rollback,
    onSettled: settle,
  });

  const move = useMutation({
    mutationFn: (v: { id: string; position: string }) =>
      api(`/shopping/${v.id}`, { method: "PATCH", body: JSON.stringify({ position: v.position }) }),
    onMutate: async ({ id, position }) => {
      const prev = await optimistic();
      setItems((items) => items.map((i) => (i.id === id ? { ...i, position } : i)));
      return prev;
    },
    onError: rollback,
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (item: ShoppingItem) => api(`/shopping/${item.id}`, { method: "DELETE" }),
    onMutate: async (item) => {
      const prev = await optimistic();
      setItems((items) => items.filter((i) => i.id !== item.id));
      return prev;
    },
    onError: rollback,
    onSettled: settle,
  });

  const restore = useMutation({
    mutationFn: (item: ShoppingItem) => api("/shopping", { method: "POST", body: JSON.stringify({ restore: item }) }),
    onMutate: async (item) => {
      const prev = await optimistic();
      setItems((items) => [...items.filter((i) => i.id !== item.id), item]);
      return prev;
    },
    onError: rollback,
    onSettled: settle,
  });

  const clearChecked = useMutation({
    mutationFn: () => api("/shopping/checked", { method: "DELETE" }),
    onMutate: async () => {
      const prev = await optimistic();
      setItems((items) => items.filter((i) => !i.checked));
      return prev;
    },
    onError: rollback,
    onSettled: settle,
  });

  const hideSuggestion = useMutation({
    mutationFn: (key: string) =>
      api(`/shopping/suggestions/${encodeURIComponent(key)}`, { method: "PATCH", body: JSON.stringify({ hidden: true }) }),
    onMutate: async (key) => {
      await qc.cancelQueries({ queryKey: HISTORY_KEY });
      const prev = qc.getQueryData<Suggestion[]>(HISTORY_KEY);
      qc.setQueryData<Suggestion[]>(HISTORY_KEY, (old) => old?.filter((s) => s.key !== key));
      return prev;
    },
    onError: (_e, _k, prev) => prev && qc.setQueryData(HISTORY_KEY, prev),
    onSettled: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
  });

  /**
   * Ajout depuis le champ ou une suggestion (section 3.2). Renvoie l'id de l'article existant
   * à faire clignoter quand c'est un doublon non coché, sans rien envoyer au serveur.
   */
  const addByName = (raw: string): { flashId?: string } => {
    const name = cleanName(raw);
    if (!name) return {};
    const dup = findDuplicate(current(), name);
    if (dup && !dup.checked) return { flashId: dup.id };
    add.mutate({ id: newObjectId(), name });
    return dup ? { flashId: dup.id } : {};
  };

  return { addByName, toggle, move, remove, restore, clearChecked, hideSuggestion };
}

