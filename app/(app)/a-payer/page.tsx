"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaySheet } from "@/components/bills/PaySheet";
import { Screen } from "@/components/Screen";
import { useMonthExpenses } from "@/lib/client/budgets";
import { useBills, type Bill } from "@/lib/client/bills";
import { billSections, isOverdue, kindLabel } from "@/lib/domain/bills";
import { addMonths, currentMonth, dayInParis, monthLabel, type Day } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";

const MONTHS_SHORT = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];

function DateBadge({ day }: { day: Day }) {
  return (
    <span className="date" aria-hidden="true">
      <i>{MONTHS_SHORT[Number(day.slice(5, 7)) - 1]}</i>
      <b>{Number(day.slice(8))}</b>
    </span>
  );
}

function BillRow({ bill, today, onPay }: { bill: Bill; today: Day; onPay: (b: Bill) => void }) {
  const router = useRouter();
  const late = isOverdue(bill, today);
  return (
    <li className="due">
      <button type="button" className="open" onClick={() => router.push(`/a-payer/facture?id=${bill.id}`)}>
        <DateBadge day={bill.dueDate} />
        <span className="et">
          <b>{bill.label}</b>
          <small>
            <span className={`tag${bill.kind === "once" ? " once" : ""}`}>{kindLabel(bill)}</span>
            {bill.scope === "personal" && <span className="tag perso">Perso</span>}
            {late && <span className="tag late">En retard</span>}
          </small>
        </span>
      </button>
      <span className="side">
        <b>{formatEuros(bill.amountCents)}</b>
        <button type="button" className="pay" data-online-only onClick={() => onPay(bill)}>
          Marquer payé
        </button>
      </span>
    </li>
  );
}

export default function APayerPage() {
  const router = useRouter();
  const today = dayInParis();
  const month = currentMonth();
  const { data: bills, isPending } = useBills();
  const { data: expenses = [] } = useMonthExpenses(month);
  const [paying, setPaying] = useState<Bill | null>(null);
  const s = billSections(bills ?? [], today);
  const paid = expenses.filter((e) => e.source === "bill");
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();

  const section = (title: string, tone: string, list: Bill[]) =>
    list.length > 0 && (
      <>
        <span className={`tape c-${tone}`}>{title}</span>
        <ul className="dlist">
          {list.map((b) => (
            <BillRow key={b.id} bill={b} today={today} onPay={setPaying} />
          ))}
        </ul>
      </>
    );

  return (
    <Screen title="À payer" left={<span className="meta">{monthLabel(month)}</span>}>
      <section className="sum" aria-label="Reste à payer">
        <span>
          Reste à payer
          <br />
          d’ici le {lastDay} {monthLabel(month).toLowerCase().split(" ")[0]}
        </span>
        <b>{formatEuros(s.remainingCents)}</b>
      </section>

      {!isPending && !bills?.length && !paid.length && (
        <div className="card empty">
          <p>Aucune facture pour l’instant. Ajoute le loyer, l’électricité, internet…</p>
        </div>
      )}

      {section(`À venir en ${monthLabel(month).toLowerCase().split(" ")[0]}`, "pk", s.thisMonth)}
      {section(monthLabel(addMonths(month, 1)), "bl", s.nextMonth)}
      {section("Plus tard", "tl", s.later)}

      {paid.length > 0 && (
        <>
          <span className="tape c-ink">Payé ce mois</span>
          <ul className="dlist">
            {paid.map((e) => (
              <li key={e.id} className="due paid">
                <button type="button" className="open" onClick={() => router.push(`/comptes/nouvelle?id=${e.id}`)}>
                  <DateBadge day={e.date} />
                  <span className="et">
                    <b>{e.label}</b>
                    <small>
                      {e.scope === "personal" && <span className="tag perso">Perso</span>}
                      <span className="tag">
                        {e.paidBy === "both" ? "payé par les deux" : `payé par ${e.paidBy === "lionel" ? "Lionel" : "Jaz"}`}
                      </span>
                    </small>
                  </span>
                </button>
                <span className="side">
                  <b>{formatEuros(e.amountCents)}</b>
                  <span className="pay done">Payé</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link href="/a-payer/facture" className="fab" data-online-only>
        <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
        Ajouter
      </Link>

      {paying && <PaySheet bill={paying} onClose={() => setPaying(null)} />}
    </Screen>
  );
}

