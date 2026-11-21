/**
 * The self-assessment quiz (ADR 0005), a Preact island on the quiz page
 * (Quiz.astro), which renders it at build time and hydrates it once visible.
 *
 * One question per step, as native radio buttons in a fieldset; the result
 * screen shows the score, the level, the three priorities and the matching
 * offers. Keyboard: 1, 2 and 3 pick an answer, Enter continues, Backspace
 * goes back. The answers stay in memory: nothing is stored or sent. The
 * scoring is src/lib/quiz.ts.
 */
import type { CSSProperties, JSX } from "preact";
import { useEffect, useLayoutEffect, useReducer, useRef } from "preact/hooks";
import { type Points, quizResult } from "../../lib/quiz";
import type { IconShape } from "../ui/icons";

export interface QuizQuestion {
  category: string;
  question: string;
  answers: readonly { label: string; score: Points }[];
  advice: { "1": string; "2": string };
}

export interface QuizOffer {
  title: string;
  duration: string;
  text: string;
  href: string;
  icon: IconShape;
}

export interface QuizLevel {
  id: "low" | "mid" | "high";
  min: number;
  max: number;
  short: string;
  title: string;
  summary: string;
  offers: readonly QuizOffer[];
  /** The call to action, to the contact page with its subject. */
  action: { label: string; href: string };
}

export interface QuizLabels {
  eyebrow: string;
  step: string;
  previous: string;
  next: string;
  finish: string;
  keyboard: string;
  enterKey: string;
  result: {
    eyebrow: string;
    scoreLabel: string;
    outOf: string;
    priorities: { one: string; other: string };
    priority: string;
    watch: string;
    none: string;
    offer: string;
    restart: string;
  };
}

export interface QuizProps {
  labels: QuizLabels;
  questions: readonly QuizQuestion[];
  levels: readonly QuizLevel[];
  arrow: IconShape;
}

/** The answers' letters, on their badges. */
const letters = ["A", "B", "C"] as const;

/** Fills a label's `{name}` slots. */
function fill(label: string, values: Record<string, string | number>): string {
  return label.replace(/\{(\w+)\}/g, (slot, name: string) => String(values[name] ?? slot));
}

/** Fills a label's `{name}` slots with elements. */
function fillNodes(label: string, nodes: Record<string, JSX.Element>): (string | JSX.Element)[] {
  return label
    .split(/(\{\w+\})/)
    .filter((part) => part !== "")
    .map((part) => nodes[part.slice(1, -1)] ?? part);
}

function Icon({ shape, size }: { shape: IconShape; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={shape.stroke}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      // A trusted constant of src/components/ui/icons.ts.
      dangerouslySetInnerHTML={{ __html: shape.body }}
    />
  );
}

/** Whether a key press is typed into a field, where the shortcuts must not act. */
function inField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement && target.type !== "radio"))
  );
}

/** The quiz's state: the step shown and the chosen answers. */
interface QuizState {
  /** The question shown, from 0; the number of questions is the result screen. */
  readonly step: number;
  /** The chosen answer of each question, by its index. */
  readonly chosen: readonly (number | undefined)[];
  /** Whether the visitor moved between steps, so focus follows; not on the first render. */
  readonly moved: boolean;
}

type QuizAction =
  | { readonly type: "choose"; readonly answer: number }
  | { readonly type: "next" }
  | { readonly type: "previous" }
  | { readonly type: "restart" };

/**
 * The next state. Each action applies to the latest state, so keys pressed
 * faster than the page renders all count.
 */
function reduce(state: QuizState, action: QuizAction): QuizState {
  const total = state.chosen.length;
  const asking = state.step < total;
  switch (action.type) {
    case "choose":
      return asking
        ? {
            ...state,
            chosen: state.chosen.map((value, index) =>
              index === state.step ? action.answer : value,
            ),
          }
        : state;
    case "next":
      return asking && state.chosen[state.step] !== undefined
        ? { ...state, step: state.step + 1, moved: true }
        : state;
    case "previous":
      return asking && state.step > 0 ? { ...state, step: state.step - 1, moved: true } : state;
    case "restart":
      return { step: 0, chosen: state.chosen.map(() => undefined), moved: true };
  }
}

export default function QuizIsland({ labels, questions, levels, arrow }: QuizProps) {
  const total = questions.length;
  const [{ step, chosen, moved }, dispatch] = useReducer(reduce, undefined, () => ({
    step: 0,
    chosen: questions.map(() => undefined),
    moved: false,
  }));
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  /** The question's form, absent on the result screen. */
  const form = useRef<HTMLFormElement>(null);

  const answered = step < total && chosen[step] !== undefined;

  // After a move, focus goes to the new step's heading: the question, or
  // the result's heading, with the quiz scrolled to its top.
  useEffect(() => {
    if (!moved) return;
    if (step === total) root.current?.scrollIntoView({ block: "start" });
    heading.current?.focus({ preventScroll: step === total });
  }, [step, total, moved]);

  // The shortcuts, while a question is shown. Attached in a layout effect,
  // which runs as the island hydrates, so the keys work as soon as the
  // island is marked hydrated, not one frame later.
  useLayoutEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (form.current === null || inField(event.target)) return;
      const answer = ["1", "2", "3"].indexOf(event.key);
      if (answer !== -1) {
        event.preventDefault();
        dispatch({ type: "choose", answer });
        form.current.querySelectorAll<HTMLInputElement>('input[type="radio"]')[answer]?.focus();
      } else if (event.key === "Enter") {
        // Enter on a button or a link keeps its own action.
        if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement)
          return;
        event.preventDefault();
        dispatch({ type: "next" });
      } else if (event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "previous" });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (step === total) {
    const points = questions.map(
      (question, index) => question.answers[chosen[index] ?? 0]?.score ?? 0,
    ) as Points[];
    return (
      <div ref={root} class="quiz-panel">
        <Result
          labels={labels}
          questions={questions}
          levels={levels}
          arrow={arrow}
          points={points}
          heading={heading}
          onRestart={() => dispatch({ type: "restart" })}
        />
      </div>
    );
  }

  const question = questions[step];
  if (question === undefined) return null;
  const last = step === total - 1;
  return (
    <div ref={root} class="quiz-panel">
      <div class="quiz-top">
        <p class="eyebrow">{labels.eyebrow}</p>
        <p class="quiz-count">
          {fillNodes(labels.step, { n: <strong>{step + 1}</strong>, total: <>{total}</> })}
        </p>
      </div>
      <ol class="quiz-progress" aria-hidden="true">
        {questions.map((_, index) => (
          <li key={index} class={index < step ? "done" : index === step ? "current" : undefined} />
        ))}
      </ol>
      <form
        ref={form}
        key={step}
        class="quiz-step"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "next" });
        }}
      >
        <fieldset>
          <legend>
            <span class="quiz-chip">{question.category}</span>
            <h2 ref={heading} tabIndex={-1} class="quiz-question">
              {question.question}
            </h2>
          </legend>
          <div class="quiz-answers">
            {question.answers.map((answer, index) => (
              <label key={answer.label} class="quiz-answer">
                <input
                  type="radio"
                  name={`quiz-${step}`}
                  value={index}
                  checked={chosen[step] === index}
                  onChange={() => dispatch({ type: "choose", answer: index })}
                />
                <span class="quiz-letter" aria-hidden="true">
                  {letters[index]}
                </span>
                <span>{answer.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div class="quiz-nav">
          {step > 0 && (
            <button
              type="button"
              class="quiz-previous"
              onClick={() => dispatch({ type: "previous" })}
            >
              <span aria-hidden="true">←</span> {labels.previous}
            </button>
          )}
          <button type="submit" class="button button-primary button-md" disabled={!answered}>
            {last ? labels.finish : labels.next}
            <Icon shape={arrow} size={18} />
          </button>
        </div>
        <p class="quiz-keys">
          {fillNodes(labels.keyboard, {
            keys: (
              <>
                <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>
              </>
            ),
            enter: <kbd>{labels.enterKey}</kbd>,
          })}
        </p>
      </form>
    </div>
  );
}

interface ResultProps extends QuizProps {
  points: Points[];
  heading: { current: HTMLHeadingElement | null };
  onRestart: () => void;
}

function Result({ labels, questions, levels, arrow, points, heading, onRestart }: ResultProps) {
  const { score, max, level, priorities } = quizResult(points, levels);
  const copy = labels.result;
  // Set through the CSSOM, which the Content Security Policy allows.
  const gauge: CSSProperties = { "--score": score, "--ratio": score / max };
  return (
    <section class={`quiz-result level-${level.id}`} aria-labelledby="quiz-result-title">
      <h2 id="quiz-result-title" ref={heading} tabIndex={-1} class="eyebrow quiz-result-title">
        {copy.eyebrow}
      </h2>
      <figure class="quiz-gauge" style={gauge}>
        <div class="quiz-gauge-dial">
          <svg viewBox="0 0 230 130" aria-hidden="true">
            <path class="quiz-gauge-track" d="M23 118 A92 92 0 0 1 207 118" pathLength={1} />
            <path class="quiz-gauge-score" d="M23 118 A92 92 0 0 1 207 118" pathLength={1} />
          </svg>
          <p class="quiz-gauge-value" aria-hidden="true">
            <span class="quiz-gauge-number" />
            <span>/{max}</span>
          </p>
        </div>
        <figcaption>
          <span class="sr-only">{fill(copy.outOf, { score, max })}, </span>
          {copy.scoreLabel}
        </figcaption>
      </figure>
      <p class="quiz-level">
        <span aria-hidden="true" />
        {level.title}
      </p>
      <div class="quiz-scale" aria-hidden="true">
        <div class="quiz-scale-track" style={gauge}>
          {levels.map((band) => (
            <span
              key={band.id}
              class={`level-${band.id}`}
              style={{ flexGrow: band.max - band.min + 1 }}
            />
          ))}
        </div>
        <ul>
          {levels.map((band) => (
            <li key={band.id}>
              {band.min} · {band.short}
            </li>
          ))}
        </ul>
      </div>
      <p class="quiz-summary">{level.summary}</p>
      {priorities.length === 0 ? (
        <p class="quiz-none">{copy.none}</p>
      ) : (
        <>
          <h3 class="eyebrow quiz-priorities-title">
            {priorities.length === 1
              ? copy.priorities.one
              : fill(copy.priorities.other, { n: priorities.length })}
          </h3>
          <ol class="quiz-priorities">
            {priorities.map(({ question, points: value }, index) => {
              const item = questions[question];
              if (item === undefined) return null;
              return (
                <li key={item.category} class={value === 2 ? "priority" : "watch"}>
                  <span class="quiz-rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <p class="quiz-priority-head">
                      <strong>{item.category}</strong>{" "}
                      <span class="quiz-tag">{value === 2 ? copy.priority : copy.watch}</span>
                    </p>
                    <p>{item.advice[value === 2 ? "2" : "1"]}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <ul class="quiz-offers" aria-label={copy.offer}>
        {level.offers.map((offer) => (
          <li key={offer.href}>
            <a href={offer.href} class="quiz-offer">
              <span class="quiz-offer-icon">
                <Icon shape={offer.icon} size={22} />
              </span>
              <span>
                <strong>
                  {offer.title} · {offer.duration}
                </strong>
                <span>{offer.text}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <div class="quiz-actions">
        <a href={level.action.href} class="button button-primary button-md">
          {level.action.label}
          <Icon shape={arrow} size={18} />
        </a>
        <button type="button" class="quiz-restart" onClick={onRestart}>
          {copy.restart}
        </button>
      </div>
    </section>
  );
}
