import { defineNajmNextConfig } from "najm-next/configurable";

export default defineNajmNextConfig({
  // Home illustrations are versioned by file name (feature-icons-v3.webp), so a
  // phone downloads each atlas once instead of revalidating it on every visit.
  headers: async () => [
    {
      source: "/images/home/:file*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    // The default avatars every card without a photo shows. Their names carry
    // no version, so they are kept a day and refreshed in the background
    // instead of revalidated on every list.
    {
      source: "/images/:avatar((?:admin|(?:student|parent|teacher|principal|secretary|driver|busAssistant|receptionist|accountant|librarian|itSupport|security|assistant|monitor|supervisor|registrar|cleaner)_(?:male|female)(?:_v2)?)\\.png)",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
    },
    // The same for the fee icons and the sign-in artwork, which do not change
    // between visits and carry no version either.
    {
      source: "/images/fee-types/:file*",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
    },
    {
      source: "/images/:background(auth-background(?:-mobile)?\\.webp)",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
    },
  ],
});
