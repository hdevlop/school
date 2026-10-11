# Landing assets

Generated on 2026-10-11 with the built-in ImageGen tool. These are illustrative
photographs, not enrolled students or parents. The landing visibly discloses
factory photography. Schools replace each photo through Najm branding slots.
No external stock photos or model-generated interface screenshots are used.

Factory WebP files live in `apps/dashboard/public/images/landing/`. Hero is
1440 px wide; other photographs are 1000 px wide. Conversion used Sharp at
quality 84. The social image is a 1200 × 630 hero crop at quality 85.

| File | Generation brief |
|---|---|
| hero.webp | Photorealistic editorial 4:3 photograph: joyful Moroccan middle-school girl, curly dark hair, navy sweater and white collar, raising her hand in a sunlit classroom. Distinct blurred classmates, plants, warm textures, natural hands and skin. Raised hand fully visible, crop-safe edges. No text, logos, watermark or UI. |
| assistant.webp | Moroccan mother in her thirties, patterned beige/navy hijab and emerald blouse, smiling at her smartphone on a cream sofa. Warm Moroccan home with plants and subtle tile details. Natural hands and fabric; waist-up portrait with room for an architectural arch crop. No text, logos, watermark or UI. |
| program-default.webp | Bright empty Moroccan classroom, wooden desks, notebooks, books and plants in morning light. Editorial photograph with cream/navy accents. No people, visible writing, badges, logos or watermarks. |
| program-1.webp | Smiling Moroccan boy aged eight with tousled straight dark hair, navy sweater and white shirt, seated at a classroom desk. Warm light, blurred children, centered head and shoulders with wide crop margins. No text, logos or watermark. |
| program-2.webp | Moroccan girl aged thirteen with straight dark hair and purple glasses, navy cardigan and white shirt, smiling at a classroom desk. Distinct from the hero. Warm classroom, blurred classmates, centered crop. No text, logos or watermark. |
| program-3.webp | Moroccan boy aged seventeen with short curly black hair, navy sweater and white collar, smiling at a classroom desk. Distinct from the other students, sunlit blurred classroom, centered crop. No text, logos or watermark. |
| news-back-to-school.webp | Moroccan students and teachers welcoming families in a sunlit school courtyard, with navy uniforms, orange backpack accents and a welcome breakfast. Matches the back-to-school news card. |
| news-football.webp | Moroccan under-14 football team and coach celebrating qualification for the inter-school final, wearing navy kits with orange piping on a school pitch. No championship trophy. |
| news-moroccan-heritage.webp | Moroccan students and teacher making blue, turquoise and orange zellige mosaics in a sunny school art workshop. Matches the heritage-week news card. |

The three news photographs were generated separately with built-in ImageGen on
2026-10-11 and converted to 1000 × 625 WebP at quality 84. Their full generation
prompts are recorded in [landing-news-prompts.json](landing-news-prompts.json).
They are the defaults for `landingNews1`, `landingNews2` and `landingNews3`,
respectively; schools can replace them through the existing branding slots.

`zellige.svg` is an authored repeating geometric pattern. Device frames and
the assistant transcript are implemented in HTML/CSS/SVG. The landing page
uses the app's own font, Lora, so it bundles no font of its own.

`product-dashboard.webp` and `product-parent.webp` are actual authenticated
Playwright captures from **school_landing_demo**, a newly created local
PostgreSQL database populated solely with synthetic seeds (2026–2027, twelve
students, four teachers). The screenshots show the actual dashboard and parent
children view. They contain no records copied from the working School database.
Capture scripts and exact verification results are indexed in
[landing evidence](../evidence/landing/README.md).
