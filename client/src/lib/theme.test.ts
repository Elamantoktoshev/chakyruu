import { describe, expect, it } from 'vitest';
import { templateThemeStyle } from './theme';

describe('templateThemeStyle', () => {
  it('maps the template palette to theme CSS variables', () => {
    const style = templateThemeStyle({ palette: { primary: '#1F4E5F', accent: '#C9A24B', background: '#F4EFE6' } });
    expect(style).toMatchObject({
      '--color-burgundy': '#1F4E5F',
      '--color-gold': '#C9A24B',
      '--color-cream': '#F4EFE6',
    });
  });

  it('ignores anything that is not a strict hex colour', () => {
    const style = templateThemeStyle({ palette: { primary: 'red; background:url(x)', accent: '#fff', background: 42 } });
    expect(style).toEqual({});
    expect(templateThemeStyle(null)).toEqual({});
    expect(templateThemeStyle({ palette: 'oops' })).toEqual({});
  });
});
