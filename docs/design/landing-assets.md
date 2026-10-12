# Landing assets

Generated on 2026-10-11 with the built-in ImageGen tool. These are illustrative
photographs, not enrolled students or parents. The hero and program photos disclose
factory photography; the news gallery displays only photos and dates.
Schools replace each photo through Najm branding slots.
No external stock photos are used. The device images are supplied by the user.

The six news images were redrawn from the event examples supplied by the user:
winter celebrations, a sports day, Moroccan heritage clothing, a cooking
workshop and a school outing. The people have generated fictional Moroccan faces.
These are AI
recreations of event themes, not original school photographs or verified records
of the dates shown on the cards. The original logo, social footer and decorative
borders are omitted. Source photographs are not copied into the public assets.

Factory WebP files live in `apps/dashboard/public/images/landing/`. The two
hero cutouts are 800 px wide, with transparency preserved at quality 88;
other photographs are 1000 px wide at quality 84. The existing social image
is a 1200 × 630 classroom crop at quality 85.

| File | Generation brief |
|---|---|
| hero-moroccan-boy.webp | Transparent portrait with a new fictional Moroccan face, dark wavy hair and brown eyes. Retains the approved pose, charcoal jacket, grey shirt and yellow backpack. The existing `landingHero` branding slot replaces this main portrait. |
| hero-moroccan-girl.webp | Transparent companion with a new fictional Moroccan face, dark braids and brown eyes. Retains the approved pose, yellow ribbons, white shirt, colorful skirt and yellow/turquoise backpack. Decorative illustration alongside the main school-managed portrait. |
| assistant.webp | Moroccan mother in her thirties, patterned beige/navy hijab and emerald blouse, smiling at her smartphone on a cream sofa. Warm Moroccan home with plants and subtle tile details. Natural hands and fabric; waist-up portrait with room for an architectural arch crop. No text, logos, watermark or UI. |
| program-default.webp | Bright empty Moroccan classroom, wooden desks, notebooks, books and plants in morning light. Editorial photograph with cream/navy accents. No people, visible writing, badges, logos or watermarks. |
| program-1.webp | Smiling Moroccan boy aged eight with tousled straight dark hair, navy sweater and white shirt, seated at a classroom desk. Warm light, blurred children, centered head and shoulders with wide crop margins. No text, logos or watermark. |
| program-2.webp | Moroccan girl aged thirteen with straight dark hair and purple glasses, navy cardigan and white shirt, smiling at a classroom desk. Distinct from the hero. Warm classroom, blurred classmates, centered crop. No text, logos or watermark. |
| program-3.webp | Moroccan boy aged seventeen with short curly black hair, navy sweater and white collar, smiling at a classroom desk. Distinct from the other students, sunlit blurred classroom, centered crop. No text, logos or watermark. |
| news-winter-celebration.webp | Fictional Moroccan children in white celebration clothing, with handmade snowman and penguin decorations and wrapped gifts. Redraw of the first supplied event theme. |
| news-sports-day.webp | Twelve fictional Moroccan boys in mixed sportswear on an artificial-turf football pitch, with the source event's group arrangement, goal, red/yellow fencing and red/blue spectator seats. Redraw of the later supplied sports photo. |
| news-heritage-celebration.webp | Fictional Moroccan pupils in embroidered kaftans and djellabas, with henna and a burgundy-and-gold textile backdrop. Redraw of the third supplied event theme. |
| news-cooking-workshop.webp | Two fictional Moroccan children in white chef hats and aprons holding a basket of vegetables against a yellow wall. Redraw of the fourth supplied event theme. |
| news-school-outing.webp | Fictional Moroccan pupils in yellow outing vests, grouped before a giant golden lion mascot in an indoor leisure-park entrance. Redraw of the second supplied event theme. |
| news-trampoline-game.webp | Two fictional Moroccan pupils in yellow outing vests, holding soft play batons above a foam pit in a purple-lit trampoline park. Selected for the sixth gallery card on 2026-10-12. |

The six current news photographs were generated separately with built-in ImageGen
on 2026-10-11 and converted to 1000 × 625 WebP at quality 84. Full prompts,
reference descriptions, generated source paths and slot assignments are recorded
in [landing-event-redraw-prompts.json](landing-event-redraw-prompts.json).
They are the defaults for `landingNews1` through `landingNews6`, in table order;
schools can replace them through the existing branding slots. New descriptive
filenames let optimized images refresh without reusing the previous image URLs.

The earlier fictional-campus generation briefs remain in
[landing-news-prompts.json](landing-news-prompts.json) and
[landing-news-gallery-prompts.json](landing-news-gallery-prompts.json) as history;
their images are no longer the gallery defaults.

`news-heritage-henna.webp` retains the additional generated view of pupils sharing
henna designs. It is an unused alternative: the user requested the outing image
alongside the sports event to reduce repeated heritage imagery. Its generation
prompt is retained under `previousGalleryAssets` in the current prompt manifest.

Two further outing references were transformed into separate gallery-ready assets:

| File | Generation brief |
|---|---|
| news-trampoline-game.webp | Two fictional Moroccan pupils in yellow outing vests, holding soft play batons above a foam pit in a purple-lit trampoline park. |
| news-ice-skating.webp | Four fictional Moroccan pupils in helmets and blue rental skates on an indoor rink with a mountain mural and colored lighting. |

Both are 1000 × 625 WebP at quality 84, generated with built-in ImageGen on
2026-10-11. Their full prompts and source paths are recorded in
[landing-outing-transform-prompts.json](landing-outing-transform-prompts.json).
The trampoline image was selected for `landingNews6` on 2026-10-12, replacing the
winter-craft view. The skating image remains an additional available asset.
`news-winter-crafts.webp` and its prompt are retained as history under
`previousGalleryAssets` in the main event prompt manifest.

Current hero generation prompts and source paths are recorded in
[landing-hero-moroccan-prompts.json](landing-hero-moroccan-prompts.json). The earlier
cutout prompts remain in [landing-hero-prompts.json](landing-hero-prompts.json)
as history. The hero's headline,
links, description and school-managed statistics are real HTML, with the
colored panels and pastel cards implemented in CSS.

`zellige.svg` is an authored repeating geometric pattern. Device frames and
the assistant transcript are implemented in HTML/CSS/SVG. The landing page
locally bundles [Lilita One](https://github.com/google/fonts/tree/main/ofl/lilitaone)
through its public layout and uses it throughout the navigation, headings,
body copy, cards, footer and form controls. The Open Font License is retained
alongside it in `apps/dashboard/src/features/Landing/fonts/OFL.txt`. Arabic
text uses the system Arabic fallback. No font requests are made to Google
at runtime. The dashboard retains its own typography.

Landing headings use the hero's charcoal black (`#282925`). Section titles
also highlight whole translated words in the same purple (`#af62ad`) and
coral (`#d64e57`), preserving Arabic letter connections. Hero and section
titles share one palette, including their lighter colors in dark mode.

The landing primary color is now coral (`#d64e57`): calls to action, portal
buttons, feature icons, testimonials, form focus states and portaled controls
share it. Pale coral surfaces and borders support the palette; text links
use a deeper coral in light mode and a lighter coral in dark mode. Text and
icons on primary backgrounds are white, with a deeper coral on hover. Hero
portrait panels and statistic cards retain the reference's varied colors.

The dashboard uses the same primary and white foreground through School's
existing Najm theme. `packages/server/src/theme/theme.json` sets the factory
tokens for both modes; `apps/dashboard/src/styles/globals.css` aligns the CSS
fallbacks and table header cells. The running app's appearance was updated
through its guarded, revision-checked `/api/appearance` route.

`product-dashboard.webp` is the first dashboard screenshot supplied by the user
on 2026-10-12, converted to lossless WebP at its original 1920 × 1080 size. The
landing laptop displays the full screenshot at its original 16:9 aspect ratio.

`product-parent.webp` is the mobile interface image supplied by the user on
2026-10-12, converted to lossless WebP at its original 887 × 1774 size. The
landing phone displays the full supplied design at its original 1:2 aspect ratio.
This supplied design is illustrative and is not a capture of the running app.
Earlier capture scripts and verification results are indexed in
[landing evidence](../evidence/landing/README.md).
