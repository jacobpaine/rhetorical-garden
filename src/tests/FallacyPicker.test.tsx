import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FallacyPicker } from '../components/FallacyPicker';

describe('FallacyPicker', () => {
  it('applies the selected fallacy', async () => {
    const onApply = vi.fn();
    render(
      <FallacyPicker open maxTier={6} onApply={onApply} onClose={() => {}} />,
    );

    // Personal Attack expands by default (first category) — select Ad Hominem.
    await userEvent.click(screen.getByRole('button', { name: /Ad Hominem/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith('ad-hominem');
  });

  it('filters fallacies by search', async () => {
    render(<FallacyPicker open maxTier={6} onApply={() => {}} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText('Search fallacies'), 'straw');
    expect(screen.getByRole('button', { name: /Straw Man/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ad Hominem/i })).not.toBeInTheDocument();
  });

  it('only offers fallacies up to the current tier', () => {
    render(<FallacyPicker open maxTier={1} onApply={() => {}} onClose={() => {}} />);
    // Ad Hominem is tier 1 — available.
    expect(screen.getByRole('button', { name: /Ad Hominem/i })).toBeInTheDocument();
    // Appeal to Fear is tier 2 — hidden at tier 1.
    expect(screen.queryByRole('button', { name: /Appeal to Fear/i })).not.toBeInTheDocument();
  });

  it('shows Remove only when a mark already exists', async () => {
    const onRemove = vi.fn();
    const { rerender } = render(
      <FallacyPicker open maxTier={6} onApply={() => {}} onClose={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: 'Remove mark' })).not.toBeInTheDocument();

    rerender(
      <FallacyPicker
        open
        maxTier={6}
        currentFallacyId="ad-hominem"
        onApply={() => {}}
        onRemove={onRemove}
        onClose={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove mark' }));
    expect(onRemove).toHaveBeenCalled();
  });
});
