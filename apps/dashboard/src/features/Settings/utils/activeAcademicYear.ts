/**
 * The active school year a screen should use: the public settings' value once
 * they have one, else the label the server rendered this page with, else the
 * calendar's guess. It counts as loading only while the settings are loading
 * and the page was rendered without a label, so a screen that knows the year
 * from the server can request its data straight away.
 */
export function activeAcademicYearState(
  settingsYear: string | null | undefined,
  isSettingsLoading: boolean,
  renderedYear: string | null,
  fallbackYear: () => string,
) {
  return {
    academicYear: settingsYear || renderedYear || fallbackYear(),
    isAcademicYearLoading: isSettingsLoading && !renderedYear,
  };
}
