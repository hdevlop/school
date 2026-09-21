/**
 * Plumbing for feature-owned select options.
 *
 * The old `useEnum('someKey')` hid every domain behind one stringly typed
 * lookup: a typo returned `[]` and a console warning, and the labels for fees
 * lived next to the labels for vehicles. Features now build their own options
 * and import only the two helpers below, so the *shape* is shared while the
 * values, the translation keys and the filtering stay with their owner.
 *
 * Builders are pure functions of a translator. A component calls
 * `useTranslation()` and passes `t` in, which keeps the builder testable
 * without a React tree.
 */

/** Just enough of `useTranslation()`'s `t` to build a label. */
export type Translate = (key: string, ...args: any[]) => string;

export type EnumOption<Value extends string = string> = {
  readonly value: Value;
  readonly label: string;
};

/**
 * Label each value of a tuple under one translation prefix.
 *
 * `optionsFromValues(GENDER_VALUES, t, 'common.gender')` is the whole of what
 * `useEnum('gender')` used to do, with the key visible at the call site.
 */
export const optionsFromValues = <Value extends string>(
  values: readonly Value[],
  t: Translate,
  translationPrefix: string,
): readonly EnumOption<Value>[] =>
  values.map((value) => ({ value, label: t(`${translationPrefix}.${value}`) }));

/**
 * Keep a stored value selectable even when it is no longer offered.
 *
 * Records outlive the lists that created them: a value can be dropped from a
 * tuple, or a form can deliberately offer a subset of what the API accepts.
 * Either way, opening such a record for editing must not silently rewrite it —
 * an unlisted value is appended so the select shows what is actually stored,
 * and the user has to choose a replacement on purpose.
 *
 * Returns the options unchanged when the value is absent, empty, or already
 * offered, so it is safe to wrap every edit form's options with it.
 */
export const withStoredValue = <Value extends string>(
  options: readonly EnumOption<Value>[],
  storedValue: string | null | undefined,
  label: (value: string) => string,
): readonly EnumOption<Value>[] => {
  if (!storedValue) return options;
  if (options.some((option) => option.value === storedValue)) return options;
  return [...options, { value: storedValue as Value, label: label(storedValue) }];
};
