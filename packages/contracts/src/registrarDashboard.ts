/** Percentage bands of a grade, lowest first. A band is the mark as a share of its test's total. */
export const REGISTRAR_GRADE_BANDS = ['0-49', '50-59', '60-69', '70-79', '80-89', '90-100'] as const;
export type RegistrarGradeBand = (typeof REGISTRAR_GRADE_BANDS)[number];

export interface RegistrarGradeAverage {
  id: string;
  name: string;
  /** Percent, 0 to 100. */
  average: number;
  graded: number;
}

/** Figures for the viewed year, counted from each grade's own test. */
export interface RegistrarDashboardGrades {
  /** Percent, 0 to 100. Null before any grade is recorded. */
  average: number | null;
  passRate: number | null;
  recorded: number;
  pending: number;
  missed: number;
  /** Tests dated up to today, not cancelled, with no recorded grade. */
  testsAwaitingGrades: number;
  distribution: { band: RegistrarGradeBand; count: number }[];
  /** Every month of the reporting year; a month with no grades has a null average. */
  monthly: { month: string; average: number | null; graded: number }[];
  byClass: RegistrarGradeAverage[];
  bySubject: RegistrarGradeAverage[];
}

export interface RegistrarDashboardOverview {
  /** The signed-in account, with its staff record when it has one. */
  registrar: {
    id: string;
    name: string;
    image: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  /** Null when the registrar cannot read grades. Totals only, no individual grade. */
  grades: RegistrarDashboardGrades | null;
}
