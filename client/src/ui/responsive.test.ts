import { describe, expect, it, afterEach } from 'vitest';
import {
  applyLayoutForWidth,
  LAYOUT_TABLET_CLASS,
  PALETTE_COLLAPSED_CLASS,
  startResponsiveLayout,
  TABLET_MAX_WIDTH,
} from './responsive';

describe('responsive layout', () => {
  afterEach(() => {
    document.documentElement.classList.remove(LAYOUT_TABLET_CLASS);
    document.body.replaceChildren();
  });

  it('applies tablet class at width <= 1024 and removes above', () => {
    const root = document.createElement('div');
    expect(applyLayoutForWidth(TABLET_MAX_WIDTH, root)).toBe(true);
    expect(root.classList.contains(LAYOUT_TABLET_CLASS)).toBe(true);

    expect(applyLayoutForWidth(TABLET_MAX_WIDTH + 1, root)).toBe(false);
    expect(root.classList.contains(LAYOUT_TABLET_CLASS)).toBe(false);
  });

  it('collapses and expands palette in tablet mode', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const palette = document.createElement('div');
    palette.className = 'sdq-palette';
    const btn = document.createElement('button');
    btn.setAttribute('data-testid', 'palette-collapse');
    palette.appendChild(btn);
    document.body.appendChild(palette);

    const controller = startResponsiveLayout({
      root,
      getWidth: () => 800,
    });

    expect(controller.isTablet()).toBe(true);
    controller.setPaletteCollapsed(true);
    expect(palette.classList.contains(PALETTE_COLLAPSED_CLASS)).toBe(true);
    expect(controller.isPaletteCollapsed()).toBe(true);
    expect(btn.textContent).toMatch(/Expandir/i);

    controller.setPaletteCollapsed(false);
    expect(palette.classList.contains(PALETTE_COLLAPSED_CLASS)).toBe(false);
    controller.dispose();
  });
});
