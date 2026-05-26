import { GuideBrowser } from '../components/GuideBrowser';

export function GuidePage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Fallacy Guide</h1>
        <p className="mt-1 text-ink-500 dark:text-ink-300">
          A reference for every fallacy in the game. Each entry shows its formal name,
          a plain-English label, a definition, an example, clues to look for, and the
          fallacies it's easy to confuse it with.
        </p>
      </header>
      <GuideBrowser />
    </div>
  );
}
