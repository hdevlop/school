/** The bundled default pictures (`/images/student_male.png`, ...). */
const BUNDLED_IMAGE = /^\/images\//;

/**
 * The `version` to give `NAvatar`, which stamps it on the image URL as `?v=`.
 * An uploaded picture is stamped with its owner's update time, so a replaced
 * photo shows at once. A bundled default never changes with its owner, and
 * stamping it per person makes every card download the same file again.
 */
export function avatarVersion(src: string | null | undefined, updatedAt: string | number | null | undefined) {
  const image = src?.trim();
  if (!image || BUNDLED_IMAGE.test(image)) return undefined;
  return updatedAt ?? undefined;
}
