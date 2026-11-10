# Local dashboard fonts

The dashboard bundles the variable Lora and Roboto Mono fonts so production
builds do not need to fetch font files from Google. Both are from the official
[Google Fonts repository](https://github.com/google/fonts), compressed to WOFF2
without changing the font data:

- `Lora.woff2`: [`ofl/lora/Lora[wght].ttf`](https://github.com/google/fonts/blob/main/ofl/lora/Lora%5Bwght%5D.ttf)
- `RobotoMono.woff2`: [`ofl/robotomono/RobotoMono[wght].ttf`](https://github.com/google/fonts/blob/main/ofl/robotomono/RobotoMono%5Bwght%5D.ttf)

Arabic names (elements marked `lang="ar"`) use Noto Naskh Arabic, because Lora
has no Arabic letters:

- `NotoNaskhArabic-400.woff2`, `NotoNaskhArabic-700.woff2`: the Arabic subset as
  packaged by `@fontsource/noto-naskh-arabic` 5.2.5
  ([notofonts/arabic](https://github.com/notofonts/arabic)), the same unmodified
  files as `public/fonts/insurance/`.

The corresponding Open Font License texts are retained beside the fonts.
