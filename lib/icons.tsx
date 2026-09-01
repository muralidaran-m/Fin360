import {
  Baby,
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  PawPrint,
  PiggyBank,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react"

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  ShoppingCart,
  Utensils,
  Home,
  Car,
  Plane,
  Wifi,
  Zap,
  HeartPulse,
  GraduationCap,
  Gift,
  PiggyBank,
  Wallet,
  Briefcase,
  Film,
  Dumbbell,
  Baby,
  PawPrint,
  Coffee,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  Landmark,
}

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? Tag
}

export function CategoryIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  // CATEGORY_ICONS is a static, module-level lookup table, so this reference
  // is stable across renders despite being resolved dynamically by name.
  const Icon = getCategoryIcon(name)
  // eslint-disable-next-line react-hooks/static-components
  return <Icon className={className} />
}
