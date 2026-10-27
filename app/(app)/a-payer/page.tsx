import { Screen } from "@/components/Screen";
import { Soon } from "@/components/Soon";

export default function APayerPage() {
  return (
    <Screen title="À payer">
      <Soon label="Factures à venir" step={6} />
    </Screen>
  );
}
