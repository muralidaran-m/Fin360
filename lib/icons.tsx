import {
  Baby,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Clapperboard,
  Coffee,
  CreditCard,
  Droplet,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Lightbulb,
  Luggage,
  MapPin,
  MonitorPlay,
  MoreHorizontal,
  Music,
  Package,
  PartyPopper,
  PawPrint,
  Phone,
  Pill,
  PiggyBank,
  Pizza,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Soup,
  Sparkles,
  Stethoscope,
  Tag,
  Ticket,
  Train,
  TrendingUp,
  Tv,
  Utensils,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Food & dining
  ShoppingCart,
  Utensils,
  UtensilsCrossed,
  Pizza,
  Soup,
  Coffee,
  Wine,

  // Movies & entertainment
  Film,
  Clapperboard,
  Tv,
  MonitorPlay,
  Gamepad2,
  Music,
  Ticket,
  PartyPopper,

  // Travel
  Plane,
  Train,
  Bus,
  Car,
  Fuel,
  Luggage,
  MapPin,

  // Shopping
  ShoppingBag,
  Shirt,
  Package,

  // Home & utilities
  Home,
  Wifi,
  Zap,
  Lightbulb,
  Droplet,
  Wrench,
  Phone,

  // Health & wellness
  HeartPulse,
  Pill,
  Stethoscope,
  Dumbbell,
  Sparkles,
  Scissors,

  // Family & education
  Baby,
  PawPrint,
  GraduationCap,
  BookOpen,

  // Finance
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Landmark,
  Receipt,
  HandHeart,

  // Work & tech
  Briefcase,
  Smartphone,
  Laptop,

  // Other
  Gift,
  MoreHorizontal,
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
