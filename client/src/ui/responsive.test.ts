import { describe, expect, it, afterEach } from 'vitest';
import {
  applyLayoutForWidth,
  LAYOUT_PHONE_CLASS,
  LAYOUT_TABLET_CLASS,
  PALETTE_COLLAPSED_CLASS,
  PHONE_MAX_WIDTH,
  startResponsiveLayout,
  TABLET_MAX_WIDTH,
} from './responsive';

describe('responsive layout', () => {
  afterEach(() => {
    document.documentElement.classList.remove(LAYOUT_TABLET_CLASS, LAYOUT_PHONE_CLASS);
    document.documentElement.classList.remove('sdq-palette-is-collapsed');
    document.body.replaceChildren();
  });

  it('applies tablet class at width <= 1024 and removes above', () => {
    const root = document.createElement('div');
    expect(applyLayoutForWidth(TABLET_MAX_WIDTH, root)).toBe(true);
    expect(root.classList.contains(LAYOUT_TABLET_CLASS)).toBe(true);

    expect(applyLayoutForWidth(TABLET_MAX_WIDTH + 1, root)).toBe(false);
    expect(root.classList.contains(LAYOUT_TABLET_CLASS)).toBe(false);
  });

  it('applies phone class at width <= 768 with bottom-dock styles', () => {
    const root = document.createElement('div');
    applyLayoutForWidth(PHONE_MAX_WIDTH, root);
    expect(root.classList.contains(LAYOUT_PHONE_CLASS)).toBe(true);
    expect(root.classList.contains(LAYOUT_TABLET_CLASS)).toBe(true);

    applyLayoutForWidth(PHONE_MAX_WIDTH + 1, root);
    expect(root.classList.contains(LAYOUT_PHONE_CLASS)).toBe(false);

    const css = document.getElementById('sdq-responsive-styles')?.textContent ?? '';
    expect(css).toMatch(/\.sdq-layout--phone\s+\.sdq-palette\s*\{[^}]*bottom:\s*0/);
    expect(css).toMatch(/min-height:\s*44px/);
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
    expect(btn.textContent).toBe('»');
    expect(document.documentElement.classList.contains('sdq-palette-is-collapsed')).toBe(true);

    controller.setPaletteCollapsed(false);
    expect(palette.classList.contains(PALETTE_COLLAPSED_CLASS)).toBe(false);
    expect(btn.textContent).toBe('«');
    controller.dispose();
  });
});
