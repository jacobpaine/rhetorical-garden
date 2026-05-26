export function AboutPage() {
  return (
    <article className="prose-sm mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">About The Rhetorical Garden</h1>
      </header>

      <section>
        <h2 className="mb-1 font-semibold">What this app is for</h2>
        <p className="text-ink-600 dark:text-ink-200">
          The Rhetorical Garden is a practice space for clearer thinking. You read short
          passages and mark the places where the reasoning goes wrong — then check your
          judgement against an answer key and an explanation. The goal isn't to "win";
          it's to sharpen the habit of reading critically.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">What a fallacy is</h2>
        <p className="text-ink-600 dark:text-ink-200">
          A fallacy is a flaw in an argument — a place where the conclusion doesn't
          actually follow from the reasons given. Some are formal logical errors; many
          are everyday persuasion tricks, like attacking the person instead of their
          point, or treating a single story as proof.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">We use "fallacy" broadly</h2>
        <p className="text-ink-600 dark:text-ink-200">
          For simplicity, the app uses the single word <em>fallacy</em> to cover a wide
          family of reasoning problems: weak or missing evidence, framing and bias,
          loaded language, emotional manipulation, causation errors, and common
          propaganda techniques. Purists might separate these; here they all live under
          one friendly label so you can focus on spotting them.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">How scoring works</h2>
        <p className="text-ink-600 dark:text-ink-200">
          We don't show you a formula. What matters is simple: accurate marks earn
          points, marking something that isn't actually faulty costs you, hints lower
          your score a little, and your stated confidence is weighed in. The result is a
          percentage and a neutral label like <em>Good</em> or <em>Needs Review</em>.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Why false positives matter</h2>
        <p className="text-ink-600 dark:text-ink-200">
          Seeing fallacies everywhere is its own failure mode. If you flag sound
          reasoning as fallacious, you've misread it — so false positives are penalized
          more than simply missing one. Good critical thinking means knowing when an
          argument is actually fine.
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Why confidence calibration matters</h2>
        <p className="text-ink-600 dark:text-ink-200">
          Being right is good; knowing how sure you should be is better. High confidence
          on a correct answer earns a bonus, but high confidence on a wrong one costs
          more. Marking everything "high" is not a strategy — calibrated confidence is
          the skill we're training.
        </p>
      </section>
    </article>
  );
}
