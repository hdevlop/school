# Administrator avatar

Generated on 2026-10-12 using the built-in imagegen tool. Existing teacher,
parent, and principal portraits were inspected as visual style references;
no administrator portrait existed in the project's assets.

- Asset: `apps/dashboard/public/images/admin.png`
- Original: `C:/Users/hdevlop/.codex/generated_images/01a1317d-b1ec-7b41-9634-377a49124118/exec-f5b5f947-7095-411f-9f5e-536d53f56f1e.png`
- Format: PNG, 1254 × 1254, RGBA; alpha range 0–255.
- Bytes: 1,300,524; original output copied without image modification.
- SHA256: `7b5c4a0cf306505b0659a44dbe2e6788b33794374078b7c73ab78b57d8a59c91`
- Consumer: Mobile Home's admin avatar fallback. Uploaded images take precedence;
  the default `noavatar.png` placeholder is treated as a missing photo.

Validation: dashboard typecheck, root lint, and the isolated production build
(`.next-admin-avatar-check`) passed. The local app served the PNG with HTTP 200
and the expected byte count. Rendered browser acceptance was not run.

## Generation prompt

```text
Use case: stylized-concept. Asset type: school management application administrator profile avatar. Create one friendly adult male school system administrator as a transparent cartoon portrait, in the same simple charming illustration style as the teacher and parent portraits visible in the conversation: oversized rounded head, short neatly combed dark brown hair, small black oval eyes, warm peach skin, small smile, soft hand-painted shading, subtle brown outlines, clean readable shapes. He wears round dark glasses, a navy blue blazer over a pale blue shirt and holds a small teal clipboard against his chest. Centered front-facing bust from head to lower torso, shoulders fully visible, head occupies about half the image height, minimal transparent margin, square composition designed to remain recognizable as a small circular avatar. Fully transparent background with real alpha. No desk, no scenery, no enclosing circle, no text, no letters, no logo, no watermark. One character only.
```
