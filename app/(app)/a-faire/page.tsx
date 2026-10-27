import { Screen } from "@/components/Screen";
import { Soon } from "@/components/Soon";

export default function AFairePage() {
  return (
    <Screen title="À faire">
      <Soon label="Tâches de l'appartement" step={7} />
    </Screen>
  );
}
