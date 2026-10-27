import { Box, Gamepad2, House, ShoppingBasket, Tag, Ticket, Utensils, Zap, type LucideIcon } from "lucide-react";
import { categoryIcon, type Category, type CategoryIcon as IconId } from "@/lib/domain/categories";

// Icônes des catégories (section 4), trait épais 2,6 comme le reste de l'appli.
const ICONS: Record<IconId, LucideIcon> = {
  basket: ShoppingBasket,
  fork: Utensils,
  ticket: Ticket,
  gamepad: Gamepad2,
  home: House,
  bolt: Zap,
  box: Box,
  tag: Tag,
};

export function CategoryIcon({ category, size = 20 }: { category?: Pick<Category, "key" | "isDefault">; size?: number }) {
  const Glyph = ICONS[category ? categoryIcon(category) : "box"];
  return <Glyph size={size} strokeWidth={2.6} aria-hidden="true" />;
}
