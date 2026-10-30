import { defineNajmNextConfig } from "najm-next/configurable";

export default defineNajmNextConfig({
  // Home illustrations are versioned by file name (feature-icons-v2.webp), so a
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
      source: "/images/:avatar((?:student|parent|teacher|principal|secretary|driver)_(?:male|female)\\.png)",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
    },
  ],
});
