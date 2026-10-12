# Moroccan landing portraits and events

Updated and checked locally on 2026-10-11 at `http://localhost:3102/welcome`.

Both hero children now have newly generated fictional Moroccan faces. The original
poses, yellow backpacks, clothing, transparent cutouts and page layout are retained.
The boy is an 800 × 960 WebP and the girl is an 800 × 1200 WebP, both with alpha.
The branding slot and the hero component share `LANDING_HERO_FALLBACK` from
`@sms/contracts`, so the branding default also uses the new portrait.

The six gallery cards show a winter celebration, sports day, Moroccan heritage
celebration, cooking workshop, school outing and winter craft activity. These are
AI recreations of user-supplied themes with fictional people. They do not verify
the event dates displayed by existing landing content.

- [Hero screenshot](desktop-hero.png): final portraits on the actual local page.
- [Gallery screenshot](../event-redraw/desktop-gallery.png): final six gallery images.
- [Hero assets and ImageGen prompts](../../../design/landing-hero-moroccan-prompts.json).
- [Event assets and ImageGen prompts](../../../design/landing-event-redraw-prompts.json).
- [Verification details](verification.json).

`bun run lint`, all seven `bun run test:landing` checks, and `bun run build` passed
after the shared hero fallback was aligned. The build used the isolated directory
`.next-landing-moroccan-final`.

Desktop visual inspection confirmed both portraits and all six gallery images.
At a 390 × 844 viewport, the two hero images loaded and the page had no horizontal
overflow. Mobile evidence is limited to DOM and image-loading smoke checks; no
mobile screenshot is used as visual evidence. The separate headless Chrome launch
timed out, so connected Chrome was used for these focused local checks instead.
This is local asset/render verification, not deployment or full browser acceptance.

On 2026-10-12 the user selected the trampoline activity for the sixth gallery card,
replacing the winter-craft view. The earlier gallery screenshot and JSON above
retain the 2026-10-11 state. The updated sixth card was verified on the running page:
[latest gallery screenshot](../event-redraw/sixth-card-2026-10-12.png) and
[verification](../event-redraw/sixth-card-2026-10-12.json). Lint passed after the change.
