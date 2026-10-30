import { defineNajmNextConfig } from "najm-next/configurable";

export default defineNajmNextConfig({
  // Home illustrations are versioned by file name (feature-icons-v2.webp), so a
  // phone downloads each atlas once instead of revalidating it on every visit.
  headers: async () => [
    {
      source: "/images/home/:file*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
  ],
});
