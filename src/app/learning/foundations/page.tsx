import type { Metadata } from 'next'
import Pathway, { Callout, Fig } from '@/components/Pathway/Pathway'
import { LatencyLadder, LostUpdate, RoundTrips } from './diagrams'

export const metadata: Metadata = {
  title: 'Foundations — a free pathway from zero to professional',
  description:
    'How the machine actually runs your code: memory, operating systems, networks, algorithmic cost and the mathematics behind ML — a staged free course with curated further reading.',
}

export default function FoundationsPage() {
  return (
    <Pathway
      trackId="foundations"
      sections={{
        /* ── Stage 1 ─────────────────────────────────────────────── */
        machine: (
          <>
            <p>
              Every program you will ever write runs on the same physical arrangement: a processor
              that executes simple instructions absurdly fast, and data that lives progressively
              further away from it. The processor is almost never the bottleneck. <strong>Waiting for
              data is.</strong>
            </p>
            <p>
              Between the CPU and your data sits a hierarchy — registers, two or three levels of
              cache, main memory, SSD, and finally the network. Each level is bigger and slower than
              the one before, usually by one or two orders of magnitude. The absolute numbers drift
              year to year; the <em>ratios</em> are what you memorise, because the ratios are what
              design decisions turn on.
            </p>
            <Fig caption="Fig 1 · The ladder, on a log scale — and in human time, where one L1 hit lasts a second">
              <LatencyLadder />
            </Fig>
            <p>
              Scale it to human time and the ladder stops being trivia. If a cache hit takes one
              second, main memory is a two-minute walk, an SSD read is a long weekend, and a request
              to another continent is a five-year expedition. A single line of code that quietly
              crosses the network sits at the bottom of that ladder no matter how elegant it looks.
            </p>
            <p>
              Two working habits fall out of this immediately. First, <strong>locality</strong>:
              hardware pre-fetches memory in straight lines, so data laid out contiguously (an array
              walked front to back) can be ten times faster than the same algorithm chasing pointers
              — identical big-O, different decade. Second, <strong>counting trips</strong>: a
              function that is called in a loop and touches the database each time is not a slow
              function, it is a thousand expeditions.
            </p>
            <Callout>
              Performance is mostly a question of <em>where the data is</em>, not how clever the
              code is. Before optimising anything, ask which rung of the ladder each access touches.
            </Callout>
          </>
        ),

        /* ── Stage 2 ─────────────────────────────────────────────── */
        os: (
          <>
            <p>
              Hundreds of programs share your machine, and none of them are written as if that were
              true. That is the operating system’s doing. It maintains three convenient fictions for
              every process, and understanding where each one leaks is most of what “knowing how
              computers work” means in practice.
            </p>
            <p>
              <strong>“You have the CPU to yourself.”</strong> In reality the scheduler gives your
              process short slices of it, suspending and resuming you thousands of times a second. A
              context switch costs microseconds — cheap once, expensive as a lifestyle, which is why
              thread-per-request designs sag under load and why event loops exist at all.
            </p>
            <p>
              <strong>“You have memory to yourself.”</strong> The addresses your program sees are
              virtual; the OS maps them to physical RAM page by page, and pages you have not touched
              lately may not be in RAM at all. Most of the time the fiction is free. When it is not
              — a page fault on the hot path — a “memory access” quietly becomes a disk read from
              the ladder in Stage 1.
            </p>
            <p>
              <strong>“What you wrote is on disk.”</strong> A successful <code>write()</code> means
              the OS accepted your bytes into a buffer, not that they survived. Until an{' '}
              <code>fsync</code> completes, a power cut can erase what your code considers written.
              Databases are, to a first approximation, elaborate machinery for taking this one
              problem seriously.
            </p>
            <p>
              The lie about the CPU has a sharp edge: <strong>threads</strong>. Two threads run
              wherever the scheduler pleases, and if they share memory, their operations interleave
              in any order the hardware finds convenient.
            </p>
            <Fig caption="Fig 2 · The lost update — the interleaving the scheduler is allowed to pick">
              <LostUpdate />
            </Fig>
            <p>
              Both threads did everything right, locally. The result is still wrong, and it is wrong
              only <em>sometimes</em>, which is what makes concurrency bugs so expensive to find.
              Locks restore order by making one thread wait; async/await sidesteps the interleaving
              by doing all the work on one thread and switching only at marked points. Both are
              answers to the same question: <em>who is allowed to touch this data right now?</em>{' '}
              Hold onto that question — the Distributed Systems pathway is the same question with
              the machines pulled apart.
            </p>
          </>
        ),

        /* ── Stage 3 ─────────────────────────────────────────────── */
        network: (
          <>
            <p>
              The network is the bottom rung of the latency ladder, and it is also the first place
              where things fail <em>partially</em> — a packet can simply not arrive, and no one is
              obliged to tell you. Everything you will meet later about distributed systems begins
              in this stage as plain mechanics.
            </p>
            <p>
              The mechanics are layered. IP moves packets between machines and promises nothing: they
              can be lost, duplicated, or reordered. TCP builds a reliable, ordered stream on top by
              numbering bytes, acknowledging receipt and retransmitting what goes missing — a
              genuinely great trick, paid for in round trips and in stalls when one lost packet holds
              up everything behind it. TLS adds identity and encryption, at the price of more round
              trips before the first useful byte.
            </p>
            <Fig caption="Fig 3 · What a fresh HTTPS request pays before any real work happens">
              <RoundTrips />
            </Fig>
            <p>
              Notice what the diagram is really saying: the wire is mostly <em>idle</em>. The cost is
              not bandwidth — you can buy bandwidth — it is the speed of light applied four or five
              times in a row. This is why connection reuse, caching and CDNs work: they do not make
              the network faster, they make you <strong>cross it fewer times, over shorter
              distances</strong>.
            </p>
            <p>
              One level down, the socket API keeps a last surprise: TCP is a stream of bytes, not of
              messages. A single <code>read()</code> may return half a message or three of them
              glued together, and deciding where one ends is your protocol’s job — length prefixes,
              delimiters, or a format like HTTP that does it for you. Every “it only breaks under
              load” framing bug traces back to this.
            </p>
            <Callout>
              Network performance work is the art of removing round trips. Count them the way you
              counted memory accesses in Stage 1 — they are the same ladder, lower down.
            </Callout>
          </>
        ),

        /* ── Stage 4 ─────────────────────────────────────────────── */
        cost: (
          <>
            <p>
              You now know what the machine charges. Algorithms are the discipline of deciding what
              to buy — and big-O notation is its grammar. It deliberately ignores constants and
              cache effects to answer one question: <em>as the input grows, how fast does the cost
              grow?</em> That single question separates designs that survive success from designs
              that melt at their first real workload.
            </p>
            <p>
              The comforting news is how few shapes there are. A handful of patterns cover the
              overwhelming majority of practical work: a <strong>hash table</strong> when you need
              to find things by key in constant time; <strong>sorting</strong> once so that binary
              search, merging and deduplication become cheap afterwards; a <strong>tree</strong>{' '}
              when the data needs to stay ordered while it changes; a <strong>graph</strong> when
              the relationships are the data. Recognising which shape a problem reduces to matters
              more than memorising fifty algorithms.
            </p>
            <p>
              Two refinements make the grammar honest. <strong>Amortised</strong> analysis explains
              why a dynamic array that occasionally doubles is still “constant time” per append —
              the rare expensive step is spread over the cheap ones. And the constants big-O hides
              still exist: an O(n) pass over a contiguous array can beat an O(log n) walk through
              scattered pointers for any n you will actually meet, because of Stage 1. Theory tells
              you the shape; the ladder prices it.
            </p>
            <p>
              The professional habit that falls out of this stage is the{' '}
              <strong>back-of-envelope estimate</strong>: before writing code, write down n, the
              cost per item in ladder terms, and multiply. A million items × one memory access each
              is milliseconds. The same million × one network call each is hours. Ten seconds of
              arithmetic, and an architecture review has already happened.
            </p>
            <Callout>
              An estimate that is wrong by 2× still saves you from a design that is wrong by 1000×.
              Estimate first; measure after; never rely on adjectives in between.
            </Callout>
          </>
        ),

        /* ── Stage 5 ─────────────────────────────────────────────── */
        maths: (
          <>
            <p>
              This last stage exists for one reason: the AI Engineering pathway assumes a reader who
              is not frightened of three ideas. None of them requires a degree; all of them reward a
              few evenings of real attention.
            </p>
            <p>
              <strong>Linear algebra</strong> is first because modern models are made of it. A vector
              is just a list of numbers standing in for something — a word, a user, an image — and a
              matrix multiplication is a machine that transforms whole batches of them at once.
              “Embedding”, “attention”, “projection”: under every one of those words is the same
              operation. Get the geometric picture — vectors as arrows, matrices as stretches and
              rotations of space — and the vocabulary of ML stops being incantation.
            </p>
            <p>
              <strong>Calculus</strong> earns its place through a single concept: the derivative as
              sensitivity — <em>if I nudge this input, how much does the output move?</em> Training
              a network is nothing more than computing that sensitivity for every parameter at once
              (backpropagation) and nudging each one slightly downhill (gradient descent), a few
              billion times. You need the idea and the chain rule; you do not need to integrate
              anything by hand.
            </p>
            <p>
              <strong>Probability</strong> matters because a language model’s raw output is not
              words — it is a probability distribution over every possible next token. Sampling from
              that distribution, sharpening it (low temperature) or flattening it (high), is what
              turns the distribution into text. Expectation, variance and conditional probability
              are also the honest language of evaluation, which is where the AI pathway ends up.
            </p>
            <Callout>
              Every modern model is matrix multiplication plus a simple nonlinearity, repeated, and
              trained by nudging numbers downhill. The mystery is scale, not mechanism.
            </Callout>
            <p>
              That closes the foundations. You can now price a line of code, name the fictions your
              process lives inside, follow a request across the wire, and estimate before you build.
              The next pathway takes the one assumption still standing — that you are on a single
              machine — and removes it.
            </p>
          </>
        ),
      }}
    />
  )
}
