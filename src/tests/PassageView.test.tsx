import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PassageView } from '../components/PassageView';
import type { MarkedAnswer, Passage } from '../types';

const passage: Passage = {
  id: 'p1',
  title: 'A Passage',
  paragraphs: [
    {
      id: 'p1-para1',
      sentences: [
        { id: 'p1-s1', text: 'First sentence.' },
        { id: 'p1-s2', text: 'Second sentence.' },
      ],
    },
  ],
};

const multiPara: Passage = {
  id: 'mp',
  title: 'Multi',
  paragraphs: [
    { id: 'mp-para1', sentences: [{ id: 'mp-s1', text: 'One.' }] },
    { id: 'mp-para2', sentences: [{ id: 'mp-s2', text: 'Two.' }] },
  ],
};

describe('PassageView', () => {
  it('opens a sentence target when a sentence is clicked', async () => {
    const onOpenTarget = vi.fn();
    render(<PassageView passage={passage} marks={[]} onOpenTarget={onOpenTarget} />);
    await userEvent.click(screen.getByRole('button', { name: /Mark sentence: First sentence/i }));
    expect(onOpenTarget).toHaveBeenCalledWith({
      passageId: 'p1',
      scope: 'sentence',
      targetId: 'p1-s1',
    });
  });

  it('collapses paragraph and whole-passage to the same target when there is one paragraph', async () => {
    const onOpenTarget = vi.fn();
    render(<PassageView passage={passage} marks={[]} onOpenTarget={onOpenTarget} />);

    const canonical = { passageId: 'p1', scope: 'whole-passage', targetId: 'p1::whole' };
    await userEvent.click(screen.getByRole('button', { name: 'Mark paragraph' }));
    expect(onOpenTarget).toHaveBeenLastCalledWith(canonical);

    await userEvent.click(screen.getByRole('button', { name: 'Mark whole passage' }));
    expect(onOpenTarget).toHaveBeenLastCalledWith(canonical);
  });

  it('keeps paragraph and whole-passage distinct when there are multiple paragraphs', async () => {
    const onOpenTarget = vi.fn();
    render(<PassageView passage={multiPara} marks={[]} onOpenTarget={onOpenTarget} />);

    await userEvent.click(screen.getAllByRole('button', { name: 'Mark paragraph' })[0]);
    expect(onOpenTarget).toHaveBeenLastCalledWith({
      passageId: 'mp',
      scope: 'paragraph',
      targetId: 'mp-para1',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Mark whole passage' }));
    expect(onOpenTarget).toHaveBeenLastCalledWith({
      passageId: 'mp',
      scope: 'whole-passage',
      targetId: 'mp::whole',
    });
  });

  it('shows a single shared badge for a single-paragraph mark', () => {
    const marks: MarkedAnswer[] = [
      {
        passageId: 'p1',
        scope: 'whole-passage',
        targetId: 'p1::whole',
        fallacyId: 'ad-hominem',
        confidence: 'medium',
      },
    ];
    render(<PassageView passage={passage} marks={marks} onOpenTarget={() => {}} />);
    // Header chip reflects it, and the paragraph row does not duplicate the badge.
    expect(screen.getByText('Ad Hominem')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Whole passage marked' })).toBeInTheDocument();
  });

  it('renders the formal-name badge for an existing mark', () => {
    const marks: MarkedAnswer[] = [
      {
        passageId: 'p1',
        scope: 'sentence',
        targetId: 'p1-s1',
        fallacyId: 'ad-hominem',
        confidence: 'medium',
      },
    ];
    render(<PassageView passage={passage} marks={marks} onOpenTarget={() => {}} />);
    expect(screen.getByText('Ad Hominem')).toBeInTheDocument();
  });
});
