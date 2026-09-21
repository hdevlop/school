import {
  Award,
  Banknote,
  BellRing,
  BookMarked,
  BookOpen,
  Bus,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Car,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Megaphone,
  Receipt,
  School,
  ShieldAlert,
  ShieldCheck,
  Tag,
  TrendingDown,
  UserCheck,
  UserCog,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

/**
 * The one icon each feature is drawn with.
 *
 * The sidebar builds its nav items from this map, and every list view's empty
 * state reads the same entry, so a screen cannot show one mark in the
 * navigation and a different one in its own body. Picking an icon at a call
 * site is what let the generic `Inbox` stand in for twenty-seven features.
 *
 * Keys that are not in the sidebar (payments, installments, drivers) are still
 * declared here: they own a list view, and a list view needs a mark.
 */
export const FEATURE_ICONS = {
  dashboard: LayoutDashboard,
  notifications: BellRing,

  students: UserRound,
  parents: UsersRound,
  teachers: GraduationCap,
  staff: UserCog,

  financial: Banknote,
  fees: Receipt,
  feeTypes: Tag,
  expenses: TrendingDown,
  payroll: HandCoins,
  payments: CreditCard,
  installments: CalendarClock,
  reminders: BellRing,
  financialOperations: LineChart,

  attendance: CalendarCheck,
  studentAttendance: UserCheck,
  staffAttendance: UserCog,

  announcements: Megaphone,
  studentConduct: ShieldCheck,
  discipline: ShieldAlert,
  behaviorRewards: Award,

  assessments: ClipboardList,
  exams: FileText,
  grades: Award,
  calendar: CalendarDays,
  classRoutines: CalendarClock,
  documents: FileText,

  academic: BookMarked,
  classes: School,
  sections: LayoutGrid,
  cycles: CalendarRange,
  subjects: BookOpen,

  transport: Bus,
  vehicles: Bus,
  drivers: Car,

  accessControl: ShieldCheck,
  roles: ShieldCheck,
  permissions: KeyRound,
  users: UserCog,
} as const satisfies Record<string, LucideIcon>;

export type FeatureIconKey = keyof typeof FEATURE_ICONS;
