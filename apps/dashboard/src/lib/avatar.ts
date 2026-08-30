export function getAvatarFallback(value?: string | null): string {
  if (!value) return "?";

  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return initials || "?";
}

// A light primary backdrop for person avatars; images remain unfiltered.
export const personAvatarBackgroundClass =
  'bg-primary/10';

export const personAvatarClassNames = {
  avatar: personAvatarBackgroundClass,
  image: 'mix-blend-normal opacity-100',
};

export const studentAvatarBackgroundClass = personAvatarBackgroundClass;
export const studentAvatarClassNames = personAvatarClassNames;

// Placeholder portrait behind a person's own photo, chosen by gender.
export const getStudentAvatar = (gender?: string | null) =>
  gender === 'F' ? '/images/student_female.png' : '/images/student_male.png';
