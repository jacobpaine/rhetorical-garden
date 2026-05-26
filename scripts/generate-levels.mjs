// Generates src/data/levels.json for The Rhetorical Gym.
//
// Bulk placeholder content: every normal tier gets >= 5 lessons, each lesson
// gets 3 similarly-hard variants. Crucially, NO sentence is reused anywhere —
// each fallacy and each neutral distractor sentence is consumed from a pool
// exactly once, and a self-check at the end fails the build if any sentence
// text repeats across the whole content set (including the pinned lessons).
//
// The tutorial and the tier-3 review lesson are pinned verbatim (their text is
// referenced by e2e tests). Run with:  node scripts/generate-levels.mjs
// The output is validated at app load by src/utils/validateContent.ts.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../src/data');

const fallacies = JSON.parse(readFileSync(resolve(dataDir, 'fallacies.json'), 'utf8'));
const categories = JSON.parse(readFileSync(resolve(dataDir, 'categories.json'), 'utf8'));

const formalName = Object.fromEntries(fallacies.map((f) => [f.id, f.formalName]));
const categoryName = Object.fromEntries(categories.map((c) => [c.id, c.name]));
const categoryOf = Object.fromEntries(fallacies.map((f) => [f.id, f.categoryId]));

// --- Phrase bank: a unique instance is consumed at most once across all
//     lessons. Each fallacy has at least (#lessons using it) * 3 instances. ---

const BANK = {
  'ad-hominem': {
    cue: 'an insult aimed at the person',
    instances: [
      { text: "We can dismiss the auditor's findings — she's clearly just chasing a promotion.", rationale: 'It rejects the findings by guessing at her motive instead of checking them.' },
      { text: "His traffic study means nothing; the man can't even parallel park.", rationale: 'It mocks the author rather than engaging the study.' },
      { text: "Why trust the chef's nutrition advice when he's overweight himself?", rationale: "It judges the advice by the speaker's appearance, not its substance." },
      { text: "The intern's security warning isn't worth reading — he's barely out of his teens.", rationale: 'It dismisses the warning based on age, not its content.' },
      { text: "She opposes the rezoning only because she's a bitter landlord, so ignore her.", rationale: 'It explains away the objection through a supposed motive.' },
      { text: "Don't take investment tips from him; he still lives with his parents.", rationale: "It attacks the person's living situation instead of the tips." },
      { text: "The professor's theory is laughable — he's been divorced twice, after all.", rationale: 'It drags in irrelevant personal facts to discredit the theory.' },
      { text: "Their safety report is garbage because their CEO is so arrogant.", rationale: "It targets the CEO's personality, not the report's data." },
      { text: "You can ignore her climate talk; she takes private jets sometimes.", rationale: "It uses the speaker's behavior to dodge the argument." },
      { text: "He says the bridge is unsafe, but he failed the engineering exam once.", rationale: 'It points at a past failure rather than the current claim.' },
      { text: "The critic panned our film, though everyone knows he's a washed-up hack.", rationale: 'It insults the critic instead of answering the criticism.' },
      { text: "Why heed the doctor's diet plan? She smokes on her break.", rationale: "It rejects the plan by pointing at the doctor's habit." },
      { text: "His budget plan is worthless; the guy is new and obviously clueless.", rationale: 'It dismisses the plan by labeling the person clueless.' },
      { text: "Ignore the volunteer's data — she's only in it for the attention.", rationale: 'It assigns a motive to avoid addressing the data.' },
      { text: "The coach's strategy can't be right; he hasn't won a title in years.", rationale: 'It uses the record to wave away the strategy itself.' },
    ],
  },
  'false-dilemma': {
    cue: 'only two extreme options',
    instances: [
      { text: 'Either we adopt the new software company-wide today or we fall hopelessly behind.', rationale: 'Two extremes are offered with no gradual rollout in between.' },
      { text: 'You either support the highway expansion or you want the town to choke on traffic.', rationale: 'It frames the choice as expansion or disaster, ignoring alternatives.' },
      { text: 'We can either keep every legacy feature or rebuild the whole app from scratch.', rationale: 'It excludes the option of incremental change.' },
      { text: 'Either students memorize everything or they learn nothing at all.', rationale: 'It presents two extremes as the only learning outcomes.' },
      { text: 'Either we pay for the premium tier or we accept a broken website.', rationale: 'It ignores middle-ground options like a basic plan.' },
      { text: "You're either fully vegan or you simply don't care about the planet.", rationale: 'It collapses a spectrum into two rigid camps.' },
      { text: 'We either hire ten people now or cancel the launch entirely.', rationale: 'It rules out any smaller, phased hiring plan.' },
      { text: "Either the festival sells out or it's a total failure.", rationale: 'It allows no outcome between sellout and failure.' },
      { text: 'We either ban phones in class or surrender to constant distraction.', rationale: 'It offers only a ban or chaos, ignoring managed use.' },
    ],
  },
  'anecdotal-evidence': {
    cue: 'a single story used as proof',
    instances: [
      { text: "A friend of mine doubled her money on that coin, so it's a safe bet.", rationale: 'One lucky case is treated as proof the investment is safe.' },
      { text: 'My cousin recovered fast after the surgery, so the procedure is clearly low-risk.', rationale: 'A single recovery stands in for real risk data.' },
      { text: 'Our top salesperson skips meetings and still wins, so meetings are pointless.', rationale: 'One exception is generalized into a rule for everyone.' },
      { text: 'I tried the cold plunge once and felt great, so it must cure burnout.', rationale: 'A single experience is offered as proof of a broad effect.' },
      { text: 'A startup near us succeeded without funding, so any company can.', rationale: 'One outlier is used to claim a general possibility.' },
      { text: 'My grandmother ate butter daily and lived to ninety, so the guidelines are wrong.', rationale: 'A lone long life is set against population-level evidence.' },
      { text: 'One graduate got hired straight from a bootcamp, so degrees are obsolete.', rationale: 'A single hire is used to dismiss a broad trend.' },
      { text: 'My phone survived a drop in the lake, so this brand is basically indestructible.', rationale: 'One incident is generalized into a durability claim.' },
      { text: 'A reader wrote that the tea fixed her insomnia, so it works for sleep.', rationale: 'An isolated testimonial replaces real evidence.' },
    ],
  },
  'bandwagon': {
    cue: 'popularity treated as proof',
    instances: [
      { text: 'Half the office already uses this tool, so you should switch too.', rationale: 'Adoption by coworkers is used to pressure the choice.' },
      { text: 'This track is topping every chart, so it must be a masterpiece.', rationale: 'Chart position is treated as proof of quality.' },
      { text: "Millions can't be wrong about this show, so it's worth your time.", rationale: 'Popularity is offered as proof of merit.' },
      { text: "All the neighbors installed these panels, so they're obviously the right move.", rationale: 'Neighborhood uptake is treated as evidence.' },
      { text: "Every serious investor is buying in, so you'd be foolish not to.", rationale: 'Crowd behavior is used to compel a decision.' },
      { text: 'It is the most-booked tour in the city, so it has to be the best.', rationale: 'Booking volume is mistaken for quality.' },
      { text: "Everyone has pre-ordered the sequel, so it's bound to be great.", rationale: 'Pre-order numbers stand in for an actual argument.' },
      { text: 'The whole department voted yes, so the plan must be sound.', rationale: 'Group agreement is treated as proof of correctness.' },
      { text: 'This app has the most five-star reviews, so it clearly works best.', rationale: 'Review counts are used as proof rather than evidence.' },
    ],
  },
  'straw-man': {
    cue: 'a distorted version of the other side',
    instances: [
      { text: 'So you want flexible hours? I guess nobody should ever have to show up at all.', rationale: "It inflates a flexibility request into 'no one shows up.'" },
      { text: 'You support trimming the budget, so clearly you want the whole department gone.', rationale: 'It exaggerates a trim into total elimination.' },
      { text: 'She suggested a small pilot, so apparently she wants to experiment on everyone.', rationale: 'It distorts a small pilot into reckless experimentation.' },
      { text: 'You questioned one statistic, so you must reject all of science.', rationale: 'It blows a single question up into rejecting science.' },
      { text: 'He wants bike lanes, so he obviously thinks cars should be banned outright.', rationale: 'It recasts bike lanes as an outright car ban.' },
      { text: "You'd like more code review, so you think developers can't be trusted at all.", rationale: 'It twists a process request into total distrust.' },
      { text: "They asked for a later start, so they clearly don't want to work.", rationale: 'It distorts a schedule request into not wanting to work.' },
      { text: 'You prefer tea, so you must think coffee should be outlawed.', rationale: 'It exaggerates a preference into a prohibition.' },
      { text: 'She wants clearer rules, so apparently she craves a rigid police state.', rationale: 'It inflates a request for clarity into authoritarian control.' },
    ],
  },
  'appeal-to-fear': {
    cue: 'a threat used instead of a reason',
    instances: [
      { text: "Approve the merger now, or we'll be bankrupt by spring.", rationale: 'A threat of bankruptcy replaces an argument.' },
      { text: 'Skip the upgrade and hackers will drain your accounts overnight.', rationale: 'It uses a frightening scenario instead of evidence.' },
      { text: 'Vote against this and watch your neighborhood fall apart.', rationale: 'It pressures with a dire image rather than reasons.' },
      { text: "Don't question the plan, or you'll be the reason we all fail.", rationale: 'It uses fear of blame to silence questions.' },
      { text: 'Cancel the program and a generation of kids will be left behind.', rationale: 'A catastrophic prediction stands in for a case.' },
      { text: 'Delay the recall and the headlines will destroy us all.', rationale: 'It invokes disaster to force quick action.' },
      { text: 'Ignore this warning and you may not have a job next month.', rationale: 'It threatens loss rather than giving reasons.' },
      { text: 'Reject the treaty and the region will erupt into chaos.', rationale: 'It substitutes a frightening forecast for argument.' },
      { text: 'Refuse the policy and your savings could vanish in a crash.', rationale: 'It leans on fear of ruin instead of evidence.' },
      { text: 'Pass on this insurance and one accident could wipe you out.', rationale: 'It pressures with worst-case fear rather than facts.' },
      { text: 'Stall the project and competitors will bury us for good.', rationale: 'It uses a threat of defeat to compel agreement.' },
      { text: "Doubt the forecast and you're gambling with your family's safety.", rationale: 'It frames disagreement as endangering loved ones.' },
      { text: 'Cut the security budget and a single breach will end the company.', rationale: 'A scare scenario replaces a reasoned case.' },
      { text: 'Hesitate now and the opportunity — and your career — is gone.', rationale: 'It uses fear of personal loss to push action.' },
      { text: 'Block the dam repair and the whole valley could flood.', rationale: 'It invokes catastrophe instead of presenting evidence.' },
    ],
  },
  'post-hoc': {
    cue: 'cause inferred only from timing',
    instances: [
      { text: 'We repainted the storefront and sales jumped, so the paint brought customers in.', rationale: 'Cause is read from timing alone.' },
      { text: 'I switched to oat milk and my headaches stopped, so dairy caused them.', rationale: 'It assumes the change must be the cause.' },
      { text: 'The team adopted standups and shipped faster, so standups made them faster.', rationale: 'It infers cause purely from sequence.' },
      { text: 'She wore the lucky jersey and the team won, so the jersey won the game.', rationale: 'It credits an event based only on order.' },
      { text: 'Right after the ad aired, signups doubled, so the ad doubled them.', rationale: 'Timing alone is treated as proof of cause.' },
      { text: 'We added a mascot and donations rose, so the mascot drove the giving.', rationale: "It treats 'after' as 'because.'" },
      { text: 'Crime dropped once the cameras went up, so the cameras stopped the crime.', rationale: 'It infers cause from the timing of the drop.' },
      { text: 'He changed his diet and aced the exam, so the diet boosted his grades.', rationale: 'It links two events by sequence, not evidence.' },
      { text: 'Traffic eased after the new signal, so the signal fixed congestion.', rationale: 'It credits the signal based only on timing.' },
      { text: 'Profits climbed after the leadership swap, so the new boss created the gains.', rationale: 'It assumes the later success was caused by the earlier change.' },
      { text: 'The garden bloomed after I played it music, so the music helped it grow.', rationale: 'It mistakes coincidence in time for causation.' },
      { text: 'Once we moved desks, output rose, so the new layout caused the boost.', rationale: 'It reads cause from a change in timing.' },
      { text: 'She started journaling and slept better, so journaling fixed her sleep.', rationale: 'It assumes the first habit caused the second outcome.' },
      { text: 'After the tax cut, hiring picked up, so the cut created the jobs.', rationale: 'It infers causation from sequence alone.' },
      { text: 'We launched the newsletter and churn fell, so the newsletter retained users.', rationale: 'It credits the newsletter based only on what followed.' },
    ],
  },
  'tu-quoque': {
    cue: "a 'what about you' deflection",
    instances: [
      { text: 'You flag my typos, but your last memo was full of them, so back off.', rationale: 'It deflects by accusing the critic of the same fault.' },
      { text: "Sure, I missed the meeting — didn't you skip two last month?", rationale: 'It answers a charge with a counter-charge.' },
      { text: 'You criticize my driving, yet you got a ticket last week.', rationale: "It dodges by pointing at the accuser's record." },
      { text: 'Why should I cut sugar when you drink soda all day?', rationale: 'It rejects the advice by alleging hypocrisy.' },
      { text: 'You say my code is messy, but have you seen your own repo?', rationale: 'It turns the criticism back instead of addressing it.' },
      { text: "Don't tell me to save money when you just splurged on a vacation.", rationale: 'It deflects rather than engaging the point.' },
      { text: "You complain I'm always on my phone — so are you, constantly.", rationale: 'It answers a complaint with the same accusation.' },
      { text: "He scolded me for being late, but he's never on time either.", rationale: "It dismisses the scolding by citing the scolder's habit." },
      { text: 'You want me to apologize? You never apologized for last year.', rationale: 'It deflects the request with a counter-grievance.' },
    ],
  },
  'appeal-to-pity': {
    cue: 'sympathy used instead of a reason',
    instances: [
      { text: "Renew my contract — I just can't handle another setback right now.", rationale: 'It asks for renewal out of sympathy, not performance.' },
      { text: "Waive the late fee; it's been such a brutal month for me.", rationale: 'Hardship is offered in place of a valid reason.' },
      { text: 'Pick my design — I worked nights on it while caring for my mom.', rationale: "It appeals to sacrifice rather than the design's merits." },
      { text: 'Let us stay open; the staff have nowhere else to go.', rationale: 'It uses pity instead of a business case.' },
      { text: "Give my essay a pass; I've already failed twice and I'm desperate.", rationale: 'It leans on desperation rather than the work itself.' },
      { text: "Approve my loan — I've struggled my whole life to get here.", rationale: 'It substitutes a hard story for the loan criteria.' },
      { text: "Don't fine us; we're a tiny shop just scraping by.", rationale: 'It pleads for leniency on sympathy, not the rules.' },
      { text: "Let me on the team; I'd be crushed to be left out again.", rationale: 'It appeals to feelings rather than qualifications.' },
      { text: 'Extend my deadline — you have no idea how exhausted I am.', rationale: 'It uses exhaustion as the reason instead of a justification.' },
    ],
  },
  'hasty-generalization': {
    cue: 'a sweeping rule from too few cases',
    instances: [
      { text: "Two buses were late today, so this city's transit is completely broken.", rationale: 'A sweeping verdict is drawn from two incidents.' },
      { text: 'My last two dates were boring, so dating apps are a total waste.', rationale: 'It generalizes from a tiny sample.' },
      { text: 'A few reviews mention bugs, so the whole product is unusable.', rationale: 'It leaps from a handful of reports to a blanket claim.' },
      { text: "Three students cheated, so this entire class can't be trusted.", rationale: 'It condemns everyone based on three cases.' },
      { text: 'I had two bad meals there, so that whole cuisine is overrated.', rationale: 'It overgeneralizes from two experiences.' },
      { text: 'Both interns I trained quit, so interns never stick around.', rationale: 'It turns two cases into a universal rule.' },
      { text: 'A couple of clients complained, so our service is clearly failing.', rationale: 'It generalizes from a couple of complaints.' },
      { text: 'Two coworkers love the gym, so everyone here must be fitness-obsessed.', rationale: 'It builds a sweeping claim from two people.' },
      { text: "My first two coding attempts crashed, so I'm just hopeless at this.", rationale: 'It draws a broad conclusion from two tries.' },
    ],
  },
  'correlation-causation': {
    cue: 'linked trends read as cause and effect',
    instances: [
      { text: 'Towns with more libraries have lower crime, so libraries cut crime.', rationale: 'It treats a correlation as proof of cause.' },
      { text: 'Kids who eat breakfast get better grades, so breakfast raises grades.', rationale: 'It ignores other factors behind the link.' },
      { text: 'Months with more weddings have more rainstorms, so weddings bring rain.', rationale: 'It reads a spurious correlation as causation.' },
      { text: 'Offices with standing desks report fewer sick days, so the desks prevent illness.', rationale: 'It assumes the desks cause the difference.' },
      { text: 'Regions with more solar panels have higher test scores, so panels boost learning.', rationale: 'It links unrelated trends as cause and effect.' },
      { text: 'People who drink wine live longer, so wine extends your life.', rationale: 'It mistakes a correlation for a causal lever.' },
      { text: 'Cities with more gyms report more injuries, so gyms cause injuries.', rationale: 'It overlooks the shared cause behind the link.' },
      { text: 'Teams with bigger budgets win more, so spending alone wins games.', rationale: 'It treats correlation as the whole cause.' },
      { text: 'Students with tutors score higher, so a tutor guarantees higher scores.', rationale: 'It reads a correlation as a guarantee of cause.' },
    ],
  },
  'red-herring': {
    cue: 'an unrelated topic used to dodge',
    instances: [
      { text: 'When asked about the missed deadline, he launched into a long story about how busy traffic has been.', rationale: 'A deadline question is dodged by pivoting to traffic — an unrelated diversion.' },
      { text: 'Pressed on the budget overrun, she pivoted to talking about how nice the new lobby looks.', rationale: 'A budget question is sidestepped by switching to office decor.' },
      { text: 'Instead of answering the safety question, he reminded everyone how many awards the team has won.', rationale: 'A safety concern is dodged by listing unrelated awards.' },
      { text: 'Asked about the typos, the editor began listing every weekend he had worked all month.', rationale: 'A complaint about typos is met with a tangent about workload.' },
      { text: 'Confronted about the bug, she shifted to praising the design team’s recent redesign.', rationale: 'The bug question is deflected by praising another team’s work.' },
      { text: 'When the cost question came up, the speaker started reminiscing about the company’s early days.', rationale: 'A cost question is brushed aside with company nostalgia.' },
    ],
  },
  'slippery-slope': {
    cue: 'a chain of dire predictions',
    instances: [
      { text: 'If we allow casual Fridays, soon people will dress for the beach on Monday and morale will collapse.', rationale: 'A small dress-code change is chained to morale collapse with no supporting steps.' },
      { text: 'Let students retake one quiz and they’ll demand do-overs on every test, gutting all grading.', rationale: 'One retake is asserted to inevitably end all grading.' },
      { text: 'Approve one remote-work day and we’ll be down to nobody coming in by next year.', rationale: 'A single remote day is chained to total office abandonment.' },
      { text: 'Cut the parking budget and within a year the whole campus will be impassable.', rationale: 'A modest cut is chained to a worst-case outcome with no mechanism.' },
      { text: 'Skip one yearly review and reviews will quietly vanish company-wide, ending accountability.', rationale: 'Skipping one review is chained to the end of accountability everywhere.' },
      { text: 'Let kids have phones at dinner and family conversation will disappear from the world.', rationale: 'A small habit is chained to a sweeping civilizational loss.' },
    ],
  },
  'begging-the-question': {
    cue: 'the conclusion treated as its own premise',
    instances: [
      { text: 'Our product is the best because no competitor matches its quality.', rationale: 'The premise just rephrases the conclusion — being best is asserted as proof of being best.' },
      { text: 'This policy must be fair, since fair policies are exactly what we adopt here.', rationale: 'Fairness is assumed in the premise to prove fairness in the conclusion.' },
      { text: 'He’s trustworthy because he wouldn’t say anything that wasn’t true.', rationale: 'Truthfulness is assumed in the premise to prove trustworthiness.' },
      { text: 'The plan will succeed because, when it works, success follows.', rationale: 'The conclusion sneaks into the premise via a near-identical restatement.' },
      { text: 'Free speech is essential because society needs people to be able to speak freely.', rationale: 'The claim circles back on itself rather than offering independent support.' },
      { text: 'We know the book is great because everyone who likes great books loves it.', rationale: 'Greatness is assumed in the very group cited as evidence for greatness.' },
    ],
  },
  'appeal-to-authority': {
    cue: 'an out-of-place expert vouching',
    instances: [
      { text: 'A famous actor swears by this supplement, so it must really work.', rationale: 'An actor’s fame is treated as evidence in a medical question outside their expertise.' },
      { text: 'The CEO of a different company called the plan brilliant, so we should adopt it.', rationale: 'A CEO from another industry is cited as proof, with no relevant evidence.' },
      { text: 'A retired general endorsed the diet, so its science must be solid.', rationale: 'Military rank is offered as a stand-in for nutritional evidence.' },
      { text: 'A pop star says this skin cream cleared her acne, so it’ll clear yours.', rationale: 'Celebrity testimony is used to settle a clinical claim.' },
      { text: 'An award-winning novelist recommends this brand of coffee maker, so it’s the best.', rationale: 'Literary acclaim is used to validate a consumer-product claim.' },
      { text: 'A famous chef calls this kitchen layout perfect, so it’ll work for any home.', rationale: 'A chef’s fame is generalized into a home-design rule.' },
    ],
  },
  'cherry-picking': {
    cue: 'only the favorable cases shown',
    instances: [
      { text: 'Three customers raved about the launch, so the rollout was clearly a hit, while the dozens who complained went unmentioned.', rationale: 'Only favorable feedback is shown; the contrary cases are left out.' },
      { text: 'Our best month showed strong growth, proving the strategy is working, with last quarter’s losses left off the chart.', rationale: 'Selective months are presented; losing periods are quietly omitted.' },
      { text: 'Two studies support our claim, so it’s settled; the eight studies that found no effect are skipped.', rationale: 'Supporting studies are highlighted while null-result studies are ignored.' },
      { text: 'Last year’s hires from this college all succeeded, so the pipeline is perfect, with the ones who left omitted.', rationale: 'Only successful hires are counted; those who departed are excluded.' },
      { text: 'Top reviewers loved the film, so it must be a masterpiece, while the bulk of mixed reviews are quietly skipped.', rationale: 'A small set of glowing reviews is featured; the broader picture is ignored.' },
      { text: 'Five players hit personal bests after the new diet, so it’s transformative, with the rest of the squad’s results missing.', rationale: 'Standout cases are presented as the whole story; counter-cases are hidden.' },
    ],
  },
  'false-equivalence': {
    cue: 'unlike things treated as the same',
    instances: [
      { text: 'Skipping a stretch session is just as bad as skipping the surgery itself.', rationale: 'A minor habit lapse is equated with a major medical decision.' },
      { text: 'Forgetting a coworker’s birthday is essentially the same as betraying their trust.', rationale: 'A small oversight is treated as morally equivalent to a serious betrayal.' },
      { text: 'Being five minutes late is morally equivalent to missing the whole shift.', rationale: 'A short delay is equated with full absence — very different in scale.' },
      { text: 'Posting a typo online is just as harmful as publishing a deliberate lie.', rationale: 'An honest mistake is equated with intentional deception.' },
      { text: 'Choosing a worse menu item is no different from poisoning your dinner guests.', rationale: 'A taste preference is equated with deliberate harm.' },
      { text: 'Returning a library book a day late is the same as stealing it outright.', rationale: 'A minor lateness is equated with theft, ignoring intent and impact.' },
    ],
  },
  'loaded-language': {
    cue: 'charged wording doing the arguing',
    instances: [
      { text: 'This bold, forward-thinking measure leaves only cowards to oppose it.', rationale: 'Flattering and smearing terms do the persuading.' },
      { text: 'Their reckless, job-killing scheme must be stopped at once.', rationale: 'Charged adjectives carry the conclusion.' },
      { text: 'Any decent person can see this generous plan is simply humane.', rationale: 'Praise words stand in for an argument.' },
      { text: 'The corrupt, bloated agency is finally facing real scrutiny.', rationale: 'Loaded terms pre-judge the agency.' },
      { text: 'This brave reform will silence the whining of entitled critics.', rationale: 'It smears opponents instead of answering them.' },
      { text: 'Naturally, the wise and patriotic choice is to back the bill.', rationale: 'Flattery is used in place of reasons.' },
      { text: "Their so-called 'savings' are nothing but cruel, heartless cuts.", rationale: 'Charged framing decides the verdict.' },
      { text: 'Only fearmongers would dare question this common-sense safeguard.', rationale: 'It brands doubters to avoid debate.' },
      { text: "This visionary leader's flawless plan deserves our full trust.", rationale: 'Glowing labels replace evidence.' },
      { text: 'The lazy, do-nothing council ignored our brilliant proposal.', rationale: 'Insults and praise carry the claim.' },
      { text: 'Such a dangerous, radical experiment will wreck everything we love.', rationale: 'Alarming words steer the conclusion.' },
      { text: 'Every sensible family supports this wholesome, time-tested tradition.', rationale: 'Warm labels substitute for argument.' },
      { text: "Their greedy land grab is merely dressed up as 'development.'", rationale: 'Loaded terms pre-decide the issue.' },
      { text: 'This courageous crackdown will finally tame the unruly mob.', rationale: 'Charged wording frames the verdict.' },
      { text: 'Only out-of-touch elitists could reject this honest, hard-working plan.', rationale: 'It smears critics rather than reasoning.' },
    ],
  },
};

// Neutral, well-reasoned sentences used as distractors (in tier 2+ lessons) and
// as the no-fallacy content of the final review. Consumed without reuse.
const SOUND = [
  'The committee published its methodology alongside the results.',
  'Analysts noted the sample skewed slightly younger than the population.',
  'The vendor agreed to a trial period before any long-term contract.',
  'Maintenance logs were cross-checked against the sensor data.',
  'The forecast lists a margin of error for each estimate.',
  'Reviewers flagged two assumptions that still need testing.',
  'The pilot will be measured against a matched control group.',
  'Costs were itemized so the board could compare options.',
  'The survey was repeated in three regions to check consistency.',
  'Staff documented the steps so others could reproduce them.',
  'The team scheduled a follow-up audit for next quarter.',
  'Each figure in the report cites its original source.',
  'The proposal sets clear criteria for calling the project a success.',
  'Engineers stress-tested the design before sign-off.',
  'The minutes record who raised each objection and why.',
  "They compared this year's numbers with the prior three years.",
  'The lab disclosed which trials did not show an effect.',
  'Participants were chosen at random from the registry.',
  'The budget includes a contingency line for overruns.',
  'Findings were shared with an outside reviewer for comment.',
  'The contract specifies how disputes will be resolved.',
  'Data collection paused while the instrument was recalibrated.',
  'The plan names the metrics it will track each month.',
  'Two analysts reached the same total independently.',
  'The store tested the new layout in a single aisle first.',
  'The report separates confirmed results from preliminary ones.',
  'They published the raw data along with the summary.',
  'The schedule builds in time to revisit early decisions.',
  "The estimate was checked against last year's actuals.",
  'The committee invited dissenting members to submit notes.',
  "The model's limitations are listed in an appendix.",
  'Inspectors visited each site rather than relying on photos.',
  'The trial recorded side effects as well as benefits.',
  'Funding was approved in stages tied to clear milestones.',
  'The team logged every change with a timestamp and reason.',
  'Results were broken out by region to spot any differences.',
  'The author thanks reviewers who challenged the first draft.',
  'A second lab repeated the measurement to confirm it.',
  'The plan can be reversed if the metrics decline.',
  'They surveyed both customers who stayed and those who left.',
  'The figures were rounded, with exact values in the footnotes.',
  'The committee set a date to review whether the policy worked.',
  'Each recommendation is paired with its expected cost.',
  'The study notes where its data was incomplete.',
  'They ran the numbers under three different assumptions.',
  'The report explains why two outliers were excluded.',
  'Volunteers were briefed and could withdraw at any time.',
  "The vendor's claims were verified against an independent test.",
  'The team mapped the risks before approving the launch.',
  'The draft was circulated for feedback before the vote.',
  'Sales were tracked separately for each store format.',
  'The agency posted the criteria it used to score bids.',
  'Researchers pre-registered their hypotheses before collecting data.',
  'The plan includes a clear way to undo it if needed.',
  'Each claim in the brief links to supporting evidence.',
  'The audit sampled records across the full year.',
  'They tested the page with users before rolling it out.',
  'The report distinguishes correlation from any causal claim.',
  'The committee weighed the costs against the expected benefits.',
  'Measurements were taken at the same time each day.',
  'The proposal was compared with two alternative approaches.',
  'Reviewers checked the math and noted no errors.',
  'The trial enrolled participants from several clinics.',
  'The team set thresholds for when to stop the experiment.',
  'The summary states clearly what the data cannot show.',
  'Each estimate is labeled as low, likely, or high.',
  'They confirmed the trend held after removing the holidays.',
  'The board asked for a smaller test before full approval.',
  'The notes flag which conclusions are still tentative.',
  'The study reports both the effect size and its uncertainty.',
  'They checked whether the result held in a second city.',
  'The plan schedules a review once more data is available.',
  "The team revisited the plan after the first month's data.",
  'Each option was scored on the same five criteria.',
  'The report was updated when a calculation error was found.',
  "Participants' identities were kept separate from the results.",
  'They compared outcomes before and after the change, with a control.',
  'The committee published both the majority and minority views.',
  'The estimate was stress-tested against a worst-case scenario.',
  'The study lists every variable it was unable to control.',
  'The forecast was issued only after a sensitivity analysis on the inputs.',
  'Every committee member signed off on the change before it went out.',
  'The methodology section names every database that was queried.',
  'Researchers met with critics to incorporate their concerns into the design.',
  'The plan was tested in a sandbox environment before reaching customers.',
  'A second team replicated the analysis using the same raw data set.',
  'Logs were kept of every parameter changed during the trial.',
  'The proposal lists the conditions under which it should be withdrawn.',
  'Feedback from the focus groups was published alongside the final draft.',
  'The estimate was updated when the underlying numbers changed.',
];

// --- Lesson definitions per tier ---

const LESSONS = [
  { tier: 'tier-1', slug: 't1-l1', title: 'Reading the Room', pattern: ['ad-hominem'], tags: ['workplace'] },
  { tier: 'tier-1', slug: 't1-l2', title: 'The Shortcut Pitch', pattern: ['anecdotal-evidence', 'bandwagon'], tags: ['advertising'] },
  { tier: 'tier-1', slug: 't1-l3', title: 'Take It or Leave It', pattern: ['false-dilemma'], tags: ['public-policy'] },
  { tier: 'tier-1', slug: 't1-l4', title: 'Putting Words in Mouths', pattern: ['straw-man'], tags: ['workplace'] },
  { tier: 'tier-1', slug: 't1-l5', title: 'Two at Once', pattern: ['ad-hominem', 'false-dilemma'], tags: ['public-policy'] },

  { tier: 'tier-2', slug: 't2-l1', title: 'After the Fact', pattern: ['post-hoc'], tags: ['science-claim'] },
  { tier: 'tier-2', slug: 't2-l2', title: 'Scare Tactics', pattern: ['appeal-to-fear'], tags: ['public-policy'] },
  { tier: 'tier-2', slug: 't2-l3', title: 'The Op-Ed', pattern: ['post-hoc', 'ad-hominem', 'appeal-to-fear'], tags: ['social-media'] },
  { tier: 'tier-2', slug: 't2-l4', title: 'Reframe and Frighten', pattern: ['straw-man', 'appeal-to-fear'], tags: ['workplace'] },
  { tier: 'tier-2', slug: 't2-l5', title: 'One Story, One Timeline', pattern: ['anecdotal-evidence', 'post-hoc'], tags: ['advertising'] },

  { tier: 'tier-4', slug: 't4-l1', title: 'What About You', pattern: ['tu-quoque'], tags: ['workplace'] },
  { tier: 'tier-4', slug: 't4-l2', title: 'A Plea for Sympathy', pattern: ['appeal-to-pity'], tags: ['personal-advice'] },
  { tier: 'tier-4', slug: 't4-l3', title: 'Deflect and Attack', pattern: ['tu-quoque', 'ad-hominem'], tags: ['social-media'] },
  { tier: 'tier-4', slug: 't4-l4', title: 'Pity and Pressure', pattern: ['appeal-to-pity', 'false-dilemma'], tags: ['public-policy'] },
  { tier: 'tier-4', slug: 't4-l5', title: 'Three Moves', pattern: ['post-hoc', 'tu-quoque', 'appeal-to-fear'], tags: ['politics'] },

  { tier: 'tier-5', slug: 't5-l1', title: 'Jumping to a Rule', pattern: ['hasty-generalization'], tags: ['workplace'] },
  { tier: 'tier-5', slug: 't5-l2', title: 'Linked, Not Caused', pattern: ['correlation-causation'], tags: ['science-claim'] },
  { tier: 'tier-5', slug: 't5-l3', title: 'A Few and the Many', pattern: ['hasty-generalization', 'anecdotal-evidence'], tags: ['social-media'] },
  { tier: 'tier-5', slug: 't5-l4', title: 'Cause for Concern', pattern: ['correlation-causation', 'post-hoc'], tags: ['science-claim'] },
  { tier: 'tier-5', slug: 't5-l5', title: 'Crowded Reasoning', pattern: ['appeal-to-pity', 'hasty-generalization', 'bandwagon'], tags: ['public-policy'] },

  { tier: 'tier-6', slug: 't6-l1', title: 'Choice Words', pattern: ['loaded-language'], tags: ['politics'] },
  { tier: 'tier-6', slug: 't6-l2', title: 'Slant and Smear', pattern: ['loaded-language', 'ad-hominem'], tags: ['social-media'] },
  { tier: 'tier-6', slug: 't6-l3', title: 'Everybody Says So', pattern: ['loaded-language', 'bandwagon'], tags: ['advertising'] },
  { tier: 'tier-6', slug: 't6-l4', title: 'Cause and Color', pattern: ['correlation-causation', 'loaded-language'], tags: ['science-claim'] },
  { tier: 'tier-6', slug: 't6-l5', title: 'The Whole Toolbox', pattern: ['loaded-language', 'appeal-to-fear', 'straw-man'], tags: ['politics'] },

  // Tier 8 — newer moves: diversion, circular reasoning, misplaced authority
  { tier: 'tier-8', slug: 't8-l1', title: 'Change the Subject', pattern: ['red-herring'], tags: ['workplace'] },
  { tier: 'tier-8', slug: 't8-l2', title: 'Down the Slope', pattern: ['slippery-slope'], tags: ['public-policy'] },
  { tier: 'tier-8', slug: 't8-l3', title: 'Round in a Circle', pattern: ['begging-the-question', 'appeal-to-authority'], tags: ['advertising'] },
  { tier: 'tier-8', slug: 't8-l4', title: 'Picking and Equating', pattern: ['cherry-picking', 'false-equivalence'], tags: ['workplace'] },
  { tier: 'tier-8', slug: 't8-l5', title: 'Three Subtle Moves', pattern: ['red-herring', 'slippery-slope', 'cherry-picking'], tags: ['politics'] },
];

const VARIANTS = 3;
const tierIndexById = { 'tier-1': 1, 'tier-2': 2, 'tier-3': 3, 'tier-4': 4, 'tier-5': 5, 'tier-6': 6, 'tier-7': 7, 'tier-8': 8, 'tier-9': 9 };

// --- Consume-without-reuse cursors ---

const fallacyCursor = {};
function nextInstance(fid) {
  const pool = BANK[fid].instances;
  const i = fallacyCursor[fid] ?? 0;
  if (i >= pool.length) {
    throw new Error(`Out of unique "${fid}" sentences (have ${pool.length}). Add more to BANK.`);
  }
  fallacyCursor[fid] = i + 1;
  return pool[i];
}

let soundCursor = 0;
function nextSound() {
  if (soundCursor >= SOUND.length) {
    throw new Error(`Out of unique neutral sentences (have ${SOUND.length}). Add more to SOUND.`);
  }
  return SOUND[soundCursor++];
}

function buildVariant(lesson, tierIndex, v) {
  const useDistractor = tierIndex > 1;
  const vid = `${lesson.slug}-v${v + 1}`;
  const pid = `${vid}-p1`;

  const sentences = [];
  const expected = [];

  lesson.pattern.forEach((fid) => {
    const inst = nextInstance(fid);
    const sid = `${pid}-s${sentences.length + 1}`;
    sentences.push({ id: sid, text: inst.text });
    expected.push({ passageId: pid, scope: 'sentence', targetId: sid, fallacyId: fid, rationale: inst.rationale });
  });

  if (useDistractor) {
    const sid = `${pid}-s${sentences.length + 1}`;
    sentences.push({ id: sid, text: nextSound() });
  }

  const positions = lesson.pattern.map((_, i) => i + 1);
  const cats = [...new Set(lesson.pattern.map((fid) => categoryName[categoryOf[fid]]))];
  const labels = lesson.pattern.map((fid) => `"${BANK[fid].cue}" → ${formalName[fid]}`);
  const locationText = useDistractor
    ? `Focus on sentence ${positions.join(', ')}. One sentence here is sound — don't mark it.`
    : `Focus on sentence ${positions.join(', ')}.`;

  return {
    id: vid,
    passages: [{ id: pid, title: lesson.title, paragraphs: [{ id: `${pid}-para1`, sentences }] }],
    expected,
    hints: [
      { passageId: pid, step: 1, kind: 'category', text: `Look for: ${cats.join(', ')}.` },
      { passageId: pid, step: 2, kind: 'location', text: locationText },
      { passageId: pid, step: 3, kind: 'label', text: labels.join('; ') + '.' },
    ],
  };
}

function buildLesson(lesson) {
  const tierIndex = tierIndexById[lesson.tier];
  const variants = [];
  for (let v = 0; v < VARIANTS; v++) variants.push(buildVariant(lesson, tierIndex, v));
  return {
    id: lesson.slug,
    title: lesson.title,
    tierId: lesson.tier,
    kind: 'normal',
    showFallacyCount: tierIndex === 1,
    tags: lesson.tags,
    variants,
  };
}

// --- Pinned lessons (text referenced by e2e tests) ---

const TUTORIAL = JSON.parse(readFileSync(resolve(here, 'pinned/tutorial.json'), 'utf8'));
const REVIEW_TIER3 = JSON.parse(readFileSync(resolve(here, 'pinned/review-tier3.json'), 'utf8'));
const REVIEW_TIER7 = JSON.parse(readFileSync(resolve(here, 'pinned/review-tier7.json'), 'utf8'));
const REVIEW_TIER9 = JSON.parse(readFileSync(resolve(here, 'pinned/review-tier9.json'), 'utf8'));

// --- Assemble ordered output (consumption order = generation order) ---

const generated = LESSONS.map(buildLesson);
const byTier = (t) => generated.filter((l) => l.tierId === t);

const output = [
  TUTORIAL,
  ...byTier('tier-1'),
  ...byTier('tier-2'),
  REVIEW_TIER3,
  ...byTier('tier-4'),
  ...byTier('tier-5'),
  ...byTier('tier-6'),
  REVIEW_TIER7,
  ...byTier('tier-8'),
  REVIEW_TIER9,
];

// --- Self-check: no sentence text may appear twice anywhere ---

const seen = new Map();
const dupes = [];
for (const level of output) {
  for (const variant of level.variants) {
    for (const passage of variant.passages) {
      for (const para of passage.paragraphs) {
        for (const s of para.sentences) {
          const key = s.text.trim();
          if (seen.has(key)) dupes.push(`"${key}" in ${variant.id} and ${seen.get(key)}`);
          else seen.set(key, variant.id);
        }
      }
    }
  }
}
if (dupes.length) {
  throw new Error(`Reused sentence text found:\n- ${dupes.join('\n- ')}`);
}

writeFileSync(resolve(dataDir, 'levels.json'), JSON.stringify(output, null, 2) + '\n');
console.log(
  `Wrote ${output.length} levels, ${seen.size} unique sentences ` +
    `(fallacy sentences used per id: ${Object.entries(fallacyCursor).map(([k, n]) => `${k}:${n}`).join(', ')}; ` +
    `neutral used: ${soundCursor}/${SOUND.length}).`,
);
