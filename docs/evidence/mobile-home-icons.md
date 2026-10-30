# Mobile Home illustrated icons

Generated with the built-in imagegen tool, then copied unchanged into School. No CLI/API fallback was used.

- Generated asset: `feature-icons-v1.png` (removed from `public/` on 2026-10-30; recover it from git history at commit `99acdc17`).
- One square RGBA atlas, exactly six columns by six rows; real alpha transparency is preserved.
- Dimensions: 1254 by 1254 pixels, 209 by 209 pixels per cell.
- File size: 1,373,044 bytes. SHA-256: `7bf72eb8c4bae7e2ae7ad3a9cceb44088100b7e3a6e79a808ca3431fc1f8612e`.
- Served asset: `apps/dashboard/public/images/home/feature-icons-v2.webp`, the same atlas resized with sharp (Lanczos) to 864 by 864 pixels (144 per cell, enough for 48-pixel tiles at 3x) and encoded as WebP (quality 82, alpha quality 90): about 183 KB instead of 1.37 MB. Nothing else was changed.
- Cell order: `apps/dashboard/src/features/Home/config/homeIllustrations.ts`.
- The Home uses CSS background positioning; the bitmap is not cropped, recoloured, or edited in code.
- The original draft had a Home illustration in its final cell. The targeted imagegen edit below replaces that cell with Alerts for the final atlas.
- All 36 illustrations were visually inspected in the generated image. Rendered phone UI acceptance remains separate from image inspection.
- Every current feature card maps to a distinct cell. The running app served the exact PNG with HTTP 200.

## Generation prompt

```text
Use case: stylized-concept.
Asset type: ONE production icon sprite atlas for a mobile school app. Generate a single square PNG with genuinely transparent background. The atlas contains exactly 36 small illustrated icons arranged in exactly SIX COLUMNS and SIX ROWS. Each grid cell is the same width and height, all centers aligned. The square image edges align precisely with the outer edges of this 6-by-6 invisible grid. NO margins outside the grid. Inside each cell its icon has generous equal clear transparent padding, occupies approximately 65 percent of the cell width and height, and touches no neighboring cell. No tile backgrounds, no frames, no cell border lines.
Style: polished colorful miniature flat illustrations with gentle dimensional shading, rounded shapes and crisp edges, like attractive illustrated icons in a friendly school mobile app. Readable at 40 pixels. Rich blue, sunny orange, coral pink, teal, lavender and green. Consistent illustration style, light from upper left. Subjects must be recognizable at a glance. More illustrated than line icons: filled shapes, small accents, subtle depth. No photograph, no realism, no thick black outlines, no glossy plastic, no repeated generic symbols.
Draw exactly the following subjects in the following order, reading LEFT TO RIGHT then TOP TO BOTTOM:
ROW 1:
1. Dashboard: four rounded blue and purple dashboard panels, one tiny graph.
2. Subjects: blue graduation cap with golden tassel.
3. Teachers: friendly female teacher bust with brown hair and coral blouse, holding a little book.
4. Student attendance: three friendly person silhouettes in blue, cyan and yellow, with a small green check.
5. Timetable: blue school calendar with small coral and purple lesson squares.
6. Assessments: cream clipboard with blue checklist and a yellow pencil.
ROW 2:
1. Exams: cyan exam paper with blue lines and coral pencil.
2. Grades/results: rising purple and blue bar chart with curved upward arrow.
3. Fees: stacked golden coins with a little orange payment coin.
4. Calendar/events: coral-pink calendar with a white star.
5. Inbox: golden yellow envelope, white folded flap.
6. Announcements: sky-blue megaphone with coral accents.
ROW 3:
1. Students: friendly young school student bust with dark hair, blue shirt and a little backpack.
2. Parents: two warm adult parent figures with a small child, coral and teal accents.
3. Staff: teal staff identity badge, small person portrait and lanyard.
4. Classes: small blue school building with an open doorway and golden roof accent.
5. Sections: four colorful classroom blocks in blue, pink, mint and yellow.
6. Cycles: three stacked ascending books in purple, orange and blue.
ROW 4:
1. Discipline: coral-pink shield with a small white exclamation mark.
2. Rewards: gold medal with purple ribbon and white star.
3. Staff attendance: lavender calendar with a small blue staff silhouette and green check.
4. Expenses: coral wallet with a blue receipt.
5. Fee types: orange price tag with a small golden coin.
6. Reminders: orange bell with a coral notification dot.
ROW 5:
1. Payroll: teal hand presenting a golden coin.
2. Financial operations: blue ledger book and small calculator with green and yellow accents.
3. Transport: cheerful small yellow school bus with blue windows.
4. Visit requests: blue visitor pass beside a small coral calendar.
5. Users: three account portraits in blue, coral and purple.
6. Roles: purple person silhouette with a little golden crown.
ROW 6:
1. Permissions: small blue and gold key with a lavender shield.
2. Settings: blue and teal rounded gear.
3. School website: small blue browser window containing a cheerful school building.
4. Theme: purple artist palette with blue, coral and yellow paint dots.
5. Branding: coral image frame containing golden sun and teal hills with a small purple brush.
6. Home: friendly small blue house with golden roof accent.
Constraints: this is a SINGLE sprite atlas, not a UI screenshot or a poster. Exactly 6 columns by 6 rows, precisely equal cell sizes, one icon per cell, order must be exact. NO words, NO labels, NO letters, NO numbers, NO watermark. Transparency must be genuine alpha, not a drawn checkerboard. Prefer high-resolution square output.
```

## Final edit prompt

```text
Use case: precise-object-edit. Edit the attached single transparent 6-by-6 school-app icon atlas. Replace ONLY the very last icon, at row 6 column 6 (bottom-right), which currently depicts a blue house, with a friendly amber-yellow warning triangle containing a white exclamation mark, representing Alerts. Match the existing colorful polished miniature illustrated style, rounded shapes and gentle shading. Keep the other 35 icons unchanged in subject, colors, size, cell positions and order. Preserve the exact square canvas dimensions, the 6 columns and 6 rows of equal invisible cells, and genuine transparent alpha background. The replacement must be centered inside the same bottom-right cell with equal transparent padding and must not touch any neighboring cell. No text labels, no letters, no numbers, no tile backgrounds, no watermark. This remains one production sprite atlas, not a user-interface screenshot.
```
