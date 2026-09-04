import type { Metadata } from 'next'
import Pathway, { Callout, Fig } from '@/components/Pathway/Pathway'
import { ContextAssembly, AgentLoop } from './diagrams'

export const metadata: Metadata = {
  title: 'AI Engineering — a free pathway from zero to professional',
  description:
    'How language models actually work, retrieval and context, agents and tools, and the evaluation discipline that separates demos from systems — a staged free course with curated further reading.',
}

export default function AiEngineeringPage() {
  return (
    <Pathway
      trackId="ai-engineering"
      sections={{
        /* ── Stage 1 ─────────────────────────────────────────────── */
        model: (
          <>
            <p>
              A language model does exactly one thing: given a sequence of tokens, it produces a
              probability for every token that could come next. That single sentence, taken
              seriously, explains most of what you will meet in this pathway — the abilities and the
              failure modes alike.
            </p>
            <Fig caption="Fig 1 · One sequence in, one distribution out — repeated once per generated token">
              <ContextAssembly />
            </Fig>
            <p>
              Unpack the moving parts. <strong>Tokens</strong>, not words: text is chopped into
              common fragments, a few characters each — which is why the model is billed and limited
              in units that do not map cleanly onto words. Each token becomes a vector — the
              Foundations maths, employed — and <strong>attention</strong> lets every position look
              back over the whole sequence and decide which earlier tokens matter for predicting
              the next. Stack a few dozen layers of that, and you have the transformer: matrix
              multiplications and a soft lookup, repeated.
            </p>
            <p>
              Generation is the loop run once per token: predict, sample, append, predict again.
              That is why output streams, why long answers cost more, and what{' '}
              <strong>temperature</strong> really is — sharpening or flattening the distribution
              before sampling, trading determinism against variety.
            </p>
            <p>
              Two boundaries follow directly. The <strong>weights are frozen</strong>: everything
              the model “knows” was baked in at training, which is where the knowledge cutoff comes
              from. And the <strong>context window is its entire working memory</strong>: the model
              knows nothing about your request except the tokens you assembled into it. Between
              frozen weights and assembled context, all of your leverage is in the context.
            </p>
            <p>
              Hallucination stops being mysterious from this vantage: the machine’s only move is
              “emit a plausible continuation”, and when the truth is not strongly represented,
              plausible and true part ways — fluently. It is not lying; it is doing the one thing
              it does, on the wrong material. The rest of this pathway is the engineering answer to
              exactly that.
            </p>
            <Callout>
              The model is a next-token function with frozen weights. Every improvement you will
              ever ship is either better context in, or better checking of what comes out.
            </Callout>
          </>
        ),

        /* ── Stage 2 ─────────────────────────────────────────────── */
        context: (
          <>
            <p>
              If the model is fixed and context is your leverage, then the central engineering
              problem is: <em>of everything my system knows, which few thousand tokens does this
              request need?</em> Answering that at runtime is retrieval, and
              retrieval-augmented generation is just the pattern of doing it before every call:
              fetch what is relevant, place it in the context, ask the model to answer{' '}
              <em>from it</em>.
            </p>
            <p>
              The pipeline is short but every joint matters. Documents are split into{' '}
              <strong>chunks</strong> — and chunking is a real decision: split mid-thought and no
              retriever can save you. Chunks are embedded into vectors so that “nearest vectors”
              approximates “related meaning”, and stored in an index. At query time you embed the
              question, take the nearest chunks, often <strong>rerank</strong> them with a more
              careful model, and assemble the survivors into the prompt.
            </p>
            <p>
              Know where embeddings fail, because they fail predictably: exact identifiers, part
              numbers, names, rare jargon — semantically thin strings that keyword search handles
              trivially. Production systems are therefore usually <strong>hybrid</strong>: lexical
              search and vector search side by side, merged. Twenty years of information retrieval
              did not become obsolete; it became a component.
            </p>
            <p>
              The discipline that separates working RAG from demo RAG is measuring the halves{' '}
              <strong>separately</strong>. Before blaming the model, ask: was the right passage even
              in the context? Retrieval has boring, honest metrics — did the gold passage appear in
              the top k? — and a small labelled set of real questions will tell you more than any
              amount of prompt-tweaking. In practice, when a RAG system is bad, it is usually the R.
            </p>
            <p>
              Long context windows change the economics — sometimes you can simply include the
              whole manual — but not the principle: attention over a million tokens is paid for in
              latency and money, and relevant material buried mid-context is used less reliably
              than material placed deliberately. Retrieval is how you stay deliberate.
            </p>
            <Callout>
              Debug the R before the G. If the right passage never reached the context, the best
              model in the world is answering a different question than you think.
            </Callout>
          </>
        ),

        /* ── Stage 3 ─────────────────────────────────────────────── */
        agents: (
          <>
            <p>
              So far the model only talks. Give it tools — search, a database query, a code runner,
              an API — and it can act. The mechanism is plainer than the word “agent” suggests: the
              model emits a <em>structured request</em> to use a tool; <strong>your code</strong>{' '}
              executes it and appends the result to the context; the model reads it and decides what
              to do next. Around that loop, a system.
            </p>
            <Fig caption="Fig 2 · The loop — the model decides, your code acts, the result comes back as context">
              <AgentLoop />
            </Fig>
            <p>
              The first professional judgement is <strong>when the loop earns its keep</strong>. A
              fixed pipeline — retrieve, summarise, format — wants a <em>workflow</em>: you write
              the steps, calling the model inside them, and the behaviour stays predictable and
              cheap. The loop pays off when the next step genuinely depends on what the last one
              revealed — debugging, research, multi-step operations across systems. The honest
              default from the reading holds up: the simplest structure that works, and single
              calls more often than it is fashionable to admit.
            </p>
            <p>
              The second judgement is remembering <em>who owns the loop</em>. Autonomy is a budget
              you allocate, not a property that emerges. Cap iterations, so a confused agent stops
              instead of orbiting. Make tools idempotent and retry-safe — the Distributed Systems
              pathway, back on duty, because a tool call that times out has the same three fates as
              any other request. Gate the irreversible ones: reading is free, sending and deleting
              deserve confirmation. And log the whole trajectory — every call, result and decision
              — because “it did something weird once” is not a bug report you can fix, and a
              transcript is.
            </p>
            <p>
              Treat tool design as API design for a fast, literal-minded caller: crisp names, typed
              arguments, errors that say what to do next. Most “agent failures” in the wild are
              tool-description failures wearing a dramatic costume.
            </p>
            <Callout>
              An agent is a loop with a language model for a policy. Engineer the loop — budget,
              gates, idempotency, logs — and the intelligence inside it becomes usable.
            </Callout>
          </>
        ),

        /* ── Stage 4 ─────────────────────────────────────────────── */
        evals: (
          <>
            <p>
              Here is the uncomfortable property that separates this field from the rest of the
              curriculum: the system is <strong>non-deterministic, and its failures are fluent</strong>.
              A wrong answer arrives in confident prose, not as a stack trace. Without measurement,
              development degenerates into vibes — you tweak a prompt, the three examples you tried
              look better, and something you did not try got worse.
            </p>
            <p>
              The instrument is the <strong>eval</strong>: a set of real cases with a defined check,
              run on every change — unit tests for behaviour. Build it from what actually happens:
              collect genuine inputs from your traffic (and the ugly ones from your failures), write
              down what a good answer must contain or do. Check programmatically wherever you can —
              the code compiles, the JSON parses, the cited document exists, the number matches.
              Where quality is a judgement, an <strong>LLM-as-judge</strong> scales it — but a judge
              is a model too: calibrate it against a sample of human labels before trusting it, or
              you have automated your own bias with extra steps.
            </p>
            <p>
              Then wire the habit in: prompts, retrieval settings and tool descriptions are code, so
              they live in version control and pass evals before they ship. The payoff compounds —
              a provider updates the model, or you want to try a cheaper tier, and instead of a week
              of anxiety you run the suite and read a number. Model upgrades become deploys, not
              leaps of faith.
            </p>
            <p>
              Production adds the systems concerns this curriculum has prepared you for, with new
              names on old bills. Latency: stream tokens, cache aggressively (identical calls are
              common), and remember Foundations — a model call is the bottom rung of the ladder,
              thousands of times over. Cost: token budgets per feature, small models for easy calls
              and big ones for hard calls. And drift: user behaviour shifts, providers retrain,
              yesterday’s eval set slowly stops representing today’s traffic — so sample production
              back into the evals continuously. The loop closes: traffic feeds evals, evals gate
              changes, changes meet traffic.
            </p>
            <Callout>
              “It seems better” is not evidence. The teams that ship reliable AI systems are the
              ones whose opinions have been replaced by a test suite.
            </Callout>
            <p>
              That closes the four pathways. Everything here compounds with the others: the ladder
              priced the model call, distributed systems made your tool calls safe to retry, system
              design gave the loop its budgets and its telemetry. Professional is exactly that —
              not knowing one layer, but moving between them without changing gears.
            </p>
          </>
        ),
      }}
    />
  )
}
