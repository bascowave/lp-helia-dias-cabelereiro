/** Larguras geradas para astro:assets (~2× retina nos layouts atuais). */
export const imageWidths = {
  gallery: [640, 960, 1280, 1600, 1920],
  serviceFeatured: [1280, 1600, 1920, 2560],
  spaceFeatured: [1280, 1600, 1920, 2560],
  spaceGrid: [800, 1200, 1600, 2000],
  beforeAfter: [960, 1280, 1600, 1920, 2400],
  brandLogo: [400, 560, 720, 960],
  hero: [1280, 1920, 2560, 3200],
} as const;

export const imageSizes = {
  gallery: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px',
  serviceFeatured: '(max-width: 1024px) 100vw, 50vw',
  spaceFeatured: '(max-width: 1024px) 100vw, 50vw',
  spaceGrid: '(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 320px',
  beforeAfter: '(max-width: 1024px) 92vw, 50vw',
  brandLogo: '(max-width: 640px) 42vw, 240px',
  hero: '100vw',
} as const;
