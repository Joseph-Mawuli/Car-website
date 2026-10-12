import { describe, expect, it } from 'vitest';
import { buttonClasses } from './Button';

describe('buttonClasses', () => {
  it('is inline-flex by default', () => {
    expect(buttonClasses().split(' ')).toContain('inline-flex');
  });

  it('lets responsive visibility classes hide the button on small screens', () => {
    const classes = buttonClasses('primary', 'sm', 'hidden md:inline-flex').split(' ');
    expect(classes).toContain('hidden');
    expect(classes).not.toContain('inline-flex');
  });
});
