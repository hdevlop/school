/**
 * Planning's Contrôles or exam days changed: the Contrôles Massar opened gain
 * the grids of the classes and subjects that now sit them (see
 * `MassarService.followPlanning`). Collège and primaire sit the same Massar
 * Contrôle at different times, so a Contrôle opened for one level fills in for
 * the other once its own is planned.
 */
export const EXAM_CONTROLS_CHANGED = 'examPlanning.controlsChanged';
