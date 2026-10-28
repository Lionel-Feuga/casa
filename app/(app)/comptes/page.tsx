"use client";

import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { Screen } from "@/components/Screen";
import { useBalance, useCategories, useLedger, useMoneyActions, type LedgerEntry, type Settlement } from "@/lib/client/money";
import { addMonths, currentMonth, monthLabel, shortDay, type Month } from "@/lib/domain/dates";
import { formatEuros, settlementFor, splitShares } from "@/lib/domain/money";
import { PROFILE_LABEL } from "@/lib/domain/profile";

function BalanceCard({ onSettle }: { onSettle: () => void }) {
  const { data } = useBalance();
  const b = data?.balanceCents ?? 0;
  const who = b > 0 ? "Jaz doit à Lionel" : b < 0 ? "Lionel doit à Jaz" : "Vous êtes quittes";
  return (
    <section className="bal" aria-label="Solde">
      <p className="bl">Solde après compensation</p>
      <p className="bamt">{data ? formatEuros(Math.abs(b)) : "…"}</p>
      <p className="bwho">{data ? who : " "}</p>
      {data && (data.dueByJaz > 0 || data.dueByLionel > 0) && (
        <p className="bcalc">
          {formatEuros(data.dueByJaz)} dus par Jaz − {formatEuros(data.dueByLionel)} dus par Lionel
        </p>
      )}
      <div className="bact">
        <button type="button" className="btn y" data-online-only onClick={onSettle} disabled={!data || b === 0}>
          Régler
        </button>
        <Link href="/comptes/nouvelle" className="btn t" data-online-only>
          + Dépense
        </Link>
      </div>
    </section>
  );
}

function MonthEntries({ month, first, onSettlement }: { month: Month; first: boolean; onSettlement: (s: Settlement) => void }) {
  const router = useRouter();
  const { data: entries, isPending } = useLedger(month);
  const { data: categories = [] } = useCategories();
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <>
      <p className="h4">{first ? "Dernières dépenses communes" : monthLabel(month)}</p>
      {isPending ? null : !entries?.length ? (
        <p className="mempty">Aucune dépense commune en {monthLabel(month).toLowerCase()}.</p>
      ) : (
        <ul className="elist">
          {entries.map((e: LedgerEntry) => {
            if (e.kind === "settlement") {
              const s = e.settlement;
              return (
                <li key={s.id}>
                  <button type="button" className="er settle" data-online-only onClick={() => onSettlement(s)}>
                    <span className="eico">
                      <ArrowLeftRight size={20} strokeWidth={2.6} aria-hidden="true" />
                    </span>
                    <span className="et">
                      <b>
                        {PROFILE_LABEL[s.from]} a remboursé {formatEuros(s.amountCents)} à {PROFILE_LABEL[s.to]}
                      </b>
                      <small>Règlement · {shortDay(s.date)}</small>
                    </span>
                  </button>
                </li>
              );
            }
            const x = e.expense;
            const shares = splitShares(x.amountCents);
            const other =
              x.paidBy === "lionel" ? `part de Jaz ${formatEuros(shares.jaz)}` : x.paidBy === "jaz" ? `part de Lionel ${formatEuros(shares.lionel)}` : "chacun sa part";
            const payer = x.paidBy === "both" ? "les deux" : PROFILE_LABEL[x.paidBy];
            return (
              <li key={x.id}>
                <button type="button" className="er" onClick={() => router.push(`/comptes/nouvelle?id=${x.id}`)}>
                  <span className="eico">
                    <CategoryIcon category={byId.get(x.categoryId)} />
                  </span>
                  <span className="et">
                    <b>{x.label}</b>
                    <small>
                      payé par {payer} · {shortDay(x.date)}
                    </small>
                  </span>
                  <span className="ea">
                    <b>{formatEuros(x.amountCents)}</b>
                    <small>{other}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function ComptesPage() {
  const month = currentMonth();
  const [shown, setShown] = useState(1);
  const [confirmSettle, setConfirmSettle] = useState(false);
  const [cancelSettlement, setCancelSettlement] = useState<Settlement | null>(null);
  const { data: balance } = useBalance();
  const { settle, deleteSettlement } = useMoneyActions();
  const due = balance ? settlementFor(balance.balanceCents) : null;

  return (
    <Screen title="Comptes" left={<span className="meta">{monthLabel(month)}</span>}>
      <BalanceCard onSettle={() => setConfirmSettle(true)} />

      <div className="split">
        <div className="sbar">
          <span>Lionel 60 %</span>
          <span>Jaz 40 %</span>
        </div>
        <span className="slab">Répartition fixe des dépenses communes</span>
      </div>

      {Array.from({ length: shown }, (_, i) => (
        <MonthEntries key={i} month={addMonths(month, -i)} first={i === 0} onSettlement={setCancelSettlement} />
      ))}
      <button type="button" className="btn more" onClick={() => setShown((n) => n + 1)}>
        Voir les mois précédents
      </button>

      {confirmSettle && due && (
        <ConfirmSheet
          title={`Régler ${formatEuros(due.amountCents)} ?`}
          text={`${PROFILE_LABEL[due.from]} rembourse ${formatEuros(due.amountCents)} à ${PROFILE_LABEL[due.to]}. Le solde revient à zéro.`}
          confirmLabel="Régler"
          onConfirm={() => settle.mutate()}
          onClose={() => setConfirmSettle(false)}
        />
      )}

      {cancelSettlement && (
        <ConfirmSheet
          title="Annuler ce règlement ?"
          text={`${PROFILE_LABEL[cancelSettlement.from]} a remboursé ${formatEuros(cancelSettlement.amountCents)} à ${PROFILE_LABEL[cancelSettlement.to]} le ${shortDay(cancelSettlement.date)}. Le solde reviendra comme avant.`}
          confirmLabel="Annuler le règlement"
          cancelLabel="Garder"
          onConfirm={() => deleteSettlement.mutate(cancelSettlement.id)}
          onClose={() => setCancelSettlement(null)}
        />
      )}
    </Screen>
  );
}
