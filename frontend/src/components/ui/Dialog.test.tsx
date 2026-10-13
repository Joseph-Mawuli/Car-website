import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Dialog } from './Dialog';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('Dialog sheet', () => {
  it('keeps the form in the sheet instead of collapsing it under the title', () => {
    renderWithProviders(
      <Dialog open onClose={() => {}} title="Invite a team member">
        <label>
          Full name
          <input />
        </label>
        <button type="button">Create invitation</button>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Invite a team member' });
    expect(dialog).toHaveClass('dialog-sheet');
    expect(screen.getByRole('button', { name: 'Create invitation' })).toBeVisible();
    expect(dialog.querySelector('.flex-1.min-h-0')).not.toBeInTheDocument();
  });
});
