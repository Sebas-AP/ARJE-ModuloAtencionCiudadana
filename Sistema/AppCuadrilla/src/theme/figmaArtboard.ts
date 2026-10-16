export const DESIGN_ARTBOARD = { width: 412, height: 917 } as const;

export const fitArtboard = (viewportWidth: number, viewportHeight: number): number =>
  Math.min(viewportWidth / DESIGN_ARTBOARD.width, viewportHeight / DESIGN_ARTBOARD.height);
