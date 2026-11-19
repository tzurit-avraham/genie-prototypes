/* data.js - Courseware: fake data.

   Loading colors per avatar image. The loading look (4. Mist, 5. Fairy dust) takes the colors of
   the image that is about to load, so it leads into her. In the product the developers compute
   these from the image itself (app.js shows how: avatarPaletteFrom). Opened from file://, the
   browser doesn't let the page read an image's pixels, so the prototype falls back to these
   values, measured from the same images (three main colors, dark to light, plus the most
   saturated one as an accent). Image data, not design colors: no DS token applies. */
const AVATAR_PALETTES = {
  'assets/julia-glow-cream.png': { dark: '#8d4e38', mid: '#c2a487', light: '#fdf0cc', accent: '#a5472f' },
  'assets/julia-glow-pink.png':  { dark: '#8e4e38', mid: '#c18c7e', light: '#fdc4bc', accent: '#a64931' },
};
