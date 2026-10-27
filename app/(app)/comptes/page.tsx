import { Screen } from "@/components/Screen";
import { Soon } from "@/components/Soon";

export default function ComptesPage() {
  return (
    <Screen title="Comptes">
      <Soon label="Dépenses communes et solde" step={4} />
    </Screen>
  );
}
