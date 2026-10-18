// An icon for each seeded category — the concept design's "Relax / Sleep"
// chips. A category the manager adds later gets the generic tag icon.

import { IconType } from "react-icons";
import { FiActivity, FiDroplet, FiFeather, FiMoon, FiShield, FiSun, FiTag, FiTrendingDown, FiZap } from "react-icons/fi";

const ICONS: Record<string, IconType> = {
  energy: FiZap,
  sleep: FiMoon,
  digestion: FiFeather,
  immunity: FiShield,
  stress: FiSun,
  joints: FiActivity,
  skin: FiDroplet,
  weight: FiTrendingDown,
};

export function categoryIcon(slug: string): IconType {
  return ICONS[slug] ?? FiTag;
}
