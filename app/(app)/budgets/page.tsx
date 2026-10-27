import { Screen } from "@/components/Screen";
import { Soon } from "@/components/Soon";

export default function BudgetsPage() {
  return (
    <Screen title="Budgets">
      <Soon label="Budgets Commun et Mon perso" step={5} />
    </Screen>
  );
}
