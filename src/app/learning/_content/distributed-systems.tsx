/**
 * The written chapters of the distributed-systems pathway, keyed by stage id.
 * Rendered one per page by StageView; a stage listed in the data but
 * missing here fails the static build.
 *
 * One running example carries all ten chapters: a wallet service for a
 * payments app. It starts on one machine, then moves to three machines in
 * two data centres, and every idea is introduced because the wallet needs it.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
import {
  TimeoutAmbiguity,
  QuorumOverlap,
  ReplicatedLog,
  IdempotentRetry,
  LamportTimeline,
  ReplicationLag,
  FencingToken,
  TwoPhaseDoubt,
} from './distributed-systems-diagrams'

export const sections: Record<string, ReactNode> = {

  /* ── 01 · Partial failure ─────────────────────────────────────────── */
  'partial-failure': (
    <>
      <p>
        This chapter gives you the habit the rest of the pathway depends on. When a call to another
        machine does not answer, you treat its outcome as unknown, list the things that might have
        happened, and design for each of them. That sounds like caution. In practice it decides what
        your screens say, how your retries work and which bugs you will be explaining to customers.
      </p>
      <p>
        Our running example is a wallet service for a payments app. It holds a balance for every
        user and moves money between them. Asha opens the app and sends ₹500 to Ravi. The app calls
        our API, the API calls the wallet service, and two seconds later the API gives up waiting.
        The screen has to say something. Did Ravi get the money?
      </p>
      <p>
        On one machine that question had an answer. Across a network it does not, at least not
        yet. The next nine chapters are different ways of living with that fact, so it is worth
        being exact about where it comes from.
      </p>

      <h3>What one machine let us assume</h3>
      <p>
        The first version of the wallet is a single server running the application and a Postgres
        database. A transfer is one database transaction:
      </p>
      <pre><code>{`BEGIN;
UPDATE accounts SET balance = balance - 500
  WHERE id = 'asha' AND balance >= 500;
UPDATE accounts SET balance = balance + 500
  WHERE id = 'ravi';
INSERT INTO transfers (id, src, dst, amount) VALUES (...);
COMMIT;`}</code></pre>
      <p>
        Two comforts come with this arrangement, and we rarely notice them until they are gone. The
        first is atomicity. If the server loses power halfway through, the database replays its
        write-ahead log on restart, keeps every transaction that reached <code>COMMIT</code> and
        discards the rest. Asha is debited and Ravi credited, or neither happens. The second is
        shared fate. The code that asked for the transfer and the code that performed it run in the
        same process. A function call either returns or the whole process is gone, in which case
        nobody is left waiting for an answer that will never come.
      </p>
      <p>
        Strictly, the phone was always on the far side of a network, so even version one had the
        problem we are about to meet. It was easy to ignore while the server was fast and retries
        were rare. It stops being ignorable the moment the team splits the system: an API service
        that handles the app, authentication and limits, and a wallet service on a different
        machine that owns the balances. The API now calls the wallet over the network, and the
        second comfort disappears.
      </p>

      <h3>Three failures that look the same</h3>
      <p>
        When the API sends a transfer request and hears nothing for two seconds, at least three
        different things could have happened.
      </p>
      <Fig caption="Fig 1 · Request lost, wallet crashed mid-work, reply lost. The API sees the same silence in all three">
        <TimeoutAmbiguity />
      </Fig>
      <p>
        The request may have been dropped on the way, perhaps by a switch with a full buffer or a
        connection that was reset. No money moved. The wallet may have received the request and
        crashed. If it crashed before <code>COMMIT</code>, no money moved; if it crashed just after,
        money moved and nobody was told. Or the wallet may have done the work and replied, and the
        reply was lost or delayed. Money moved.
      </p>
      <p>
        There is a fourth case that the picture cannot show, and it causes the most trouble. The
        wallet may simply be slow. It is still working on the request when the API gives up, and it
        commits the transfer at 2.4 seconds, after the API has already told the app that something
        went wrong. The timeout fired in the caller. The wallet has no idea the caller left.
      </p>
      <p>
        So a timeout records how long the caller was willing to wait. It carries no information
        about what the callee did. The API cannot tell these cases apart by waiting longer, because
        each of them can look like any other for an arbitrary length of time.
      </p>

      <Predict q={<>The API times out after two seconds and the app shows “Transfer failed, please try again”. Asha taps Send again and this time it succeeds in 300 ms. She started with ₹2,000. List every balance she could see in her account an hour later.</>}>
        <p>
          ₹1,500 is the outcome everyone expects: the first attempt never reached the wallet, or
          the wallet crashed before committing, and the second attempt moved the money once.
        </p>
        <p>
          ₹1,000 is also possible. The first attempt committed and its reply was lost, or it was
          still running when the API gave up and committed later. The retry was a new request as
          far as the wallet could tell, so it moved another ₹500. Ravi received ₹1,000 and Asha was
          told the first transfer failed.
        </p>
        <p>
          There is a third reading, which is about what she sees rather than what she ends with. If
          the first attempt was slow and committed after the retry, she might refresh and see
          ₹1,500, then later ₹1,000. The app’s message “Transfer failed” was the real bug here. The
          system stated as fact something it did not know.
        </p>
      </Predict>

      <h3>Why the API cannot just ask</h3>
      <p>
        The obvious fix is a status call: after the timeout, ask the wallet whether the transfer
        happened. That helps, and we will build it, but it does not remove the ambiguity. The status
        call is itself a network request that can time out. Worse, if the original request is still
        sitting in the wallet’s queue, the honest answer to “did transfer X happen?” is “not yet”,
        and that answer can become false a millisecond after it is sent. A status check is only
        useful if the original request can no longer commit, which means the wallet must have some
        rule that stops abandoned work. The next chapter gives it one.
      </p>
      <p>
        There is a classic thought experiment behind this, usually told as two generals who must
        agree on a time to attack while every messenger between them might be captured. Each
        acknowledgement needs its own acknowledgement, and no finite number of messages makes both
        sides certain. The practical lesson is narrower than the puzzle: we will never get
        certainty from the network, so we design operations that are safe to repeat and records
        that let us find out later what happened.
      </p>

      <h3>Slow and dead look the same from outside</h3>
      <p>
        A machine that has crashed and a machine that is paused are indistinguishable from the
        outside. Both stop answering. The paused one may be in a long garbage-collection pause, may
        have been frozen by the hypervisor during a live migration, or may be waiting on a disk that
        has become very slow. When it resumes, it carries on from exactly where it stopped, with no
        sense that time has passed. That detail matters a great deal in the coordination chapter,
        where a paused leader wakes up and keeps acting like a leader.
      </p>
      <p>
        Because we cannot tell slow from dead, choosing a timeout is choosing which mistake to make
        more often. Suppose we measure the wallet in normal operation: median latency 40 ms, 99th
        percentile 180 ms, 99.9th percentile around 600 ms. These are illustrative numbers, but the
        shape is typical: a long tail caused by pauses, retries inside the database and the
        occasional slow disk.
      </p>
      <p>
        A 200 ms timeout would cut off roughly one call in a hundred even on a healthy day. At 200
        transfers per second that is two ambiguous transfers every second, each of which needs the
        recovery machinery. A 10 second timeout makes ambiguity rare when things are healthy, but
        on a bad day every request holds a connection and a worker for ten seconds. At 200 requests
        per second that is 2,000 requests in flight. If the API has a pool of 200 workers, it runs
        out within a second and stops serving everything, including balance reads that never
        needed the slow path.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Timeout</th><th>When it is too short</th><th>When it is too long</th></tr>
          </thead>
          <tbody>
            <tr><td>The cost</td><td>Healthy-but-slow calls become ambiguous; retries add load</td><td>Callers hold threads, connections and memory while waiting</td></tr>
            <tr><td>Who notices</td><td>Users see spurious failures; duplicates appear if retries are unsafe</td><td>Users see a frozen screen; the caller fails too, and so does its caller</td></tr>
            <tr><td>A reasonable start</td><td colSpan={2}>Somewhat above the measured p99.9 for the call, inside the caller’s own deadline, revisited when the latency distribution moves</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        No timeout value is correct in general. What we can do is pick it from measured latency
        rather than from a round number, and make sure that when it fires, the system does
        something safe.
      </p>

      <h3>Naming what can go wrong</h3>
      <p>
        Engineers describe the failures a design must survive as a failure model. The model you
        choose decides how much machinery you need, so it is worth saying out loud.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Model</th><th>What the wallet machine may do</th><th>What the design must handle</th></tr>
          </thead>
          <tbody>
            <tr><td>Crash-stop</td><td>Halt and never return</td><td>Another copy of the data, and a way to start serving from it</td></tr>
            <tr><td>Crash-recovery</td><td>Halt, then restart with its disk intact and its memory gone</td><td>Durable logs, and in-flight requests, locks and caches that vanish on restart</td></tr>
            <tr><td>Omission</td><td>Keep running while messages to or from it are lost</td><td>Partitions: the wallet is healthy and unreachable, which looks like a crash</td></tr>
            <tr><td>Timing</td><td>Respond, but far later than usual</td><td>Pauses and slow disks, which look like crashes and then stop looking like them</td></tr>
            <tr><td>Byzantine</td><td>Send wrong or malicious answers</td><td>Signatures, voting among many replicas; far more expensive</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Most backend systems, including our wallet, are designed for crash-recovery with omission
        and timing failures. We assume our own servers are buggy and unreliable but not lying. The
        Byzantine model still shows up, just at a different boundary. Asha’s phone runs code we do
        not control, and a modified app can send any request it likes. So the wallet trusts the
        API’s authenticated identity, checks that the amount is positive and that the balance
        covers it, and never trusts a balance the client claims to have. Byzantine thinking applies
        to clients, while the servers inside our data centre are treated as merely unreliable.
      </p>
      <p>
        One more category deserves a name because it causes so many long incidents: gray failure.
        The wallet answers its health check, so the load balancer keeps sending it traffic, but
        writes time out because its disk is degraded. It is neither up nor down. Clean crashes are
        the easy case. A partly working machine keeps attracting work it cannot finish.
      </p>

      <h3>A bad afternoon, step by step</h3>
      <p>
        Here is how these pieces combine into an incident. The wallet runs on a virtual machine with
        network-attached storage.
      </p>
      <p>
        At 14:02, another tenant on the same storage starts a heavy batch job. The time for each{' '}
        <code>fsync</code> rises from about 1 ms to about 50 ms. A transfer commit waits for an{' '}
        <code>fsync</code>, and commits queue behind each other, so the wallet’s latency climbs from
        40 ms to well over a second within a minute.
      </p>
      <p>
        By 14:04, requests are spending more than two seconds in the wallet’s queue. The API times
        out and the app shows “Transfer failed”. The wallet, which does not know anyone gave up,
        keeps working through its queue and commits those transfers at two to four seconds.
      </p>
      <p>
        Users tap Send again. The app also retries once automatically. The wallet now receives
        roughly twice the requests at a moment when it can process about a third of its usual rate,
        so the queue grows faster. Its health check, which only returns a static 200, keeps passing.
      </p>
      <p>
        At 14:30 the batch job finishes and latency returns to normal. Over the next day, support
        receives hundreds of tickets from users charged twice. Every one of them had a first attempt
        that committed late and a retry that committed too.
      </p>
      <p>
        No single component did anything unusual. The storage got slower, the timeout fired as
        designed, the retry ran as designed. The failure was in the assumptions joining them: that
        a timeout means failure, and that a retry is harmless.
      </p>
      <p>
        The fixes each address one assumption, and each has a cost. Making the transfer safe to
        repeat with an idempotency key means a retry finds the first attempt’s result instead of
        moving money twice; the cost is a stored key per transfer and a lookup on every write.
        Sending the caller’s deadline with the request lets the wallet drop work nobody is waiting
        for; the cost is plumbing and a few requests rejected that might have finished in time. A
        health check that exercises a real write would have pulled the slow wallet out of rotation,
        at the cost of being more dangerous when a shared dependency fails and every instance fails
        its check at once. And the app should have said “We are confirming your transfer” and then
        checked the status, which costs a new screen state and a status endpoint. The next chapter
        builds the first two.
      </p>
      <Callout>
        A timeout tells you how long you waited. It does not tell you what happened. Design every
        call to another machine as if it might have succeeded without telling you.
      </Callout>

      <h3>Designing the screen for an unknown outcome</h3>
      <p>
        The most visible fix is in the app, and it is worth designing properly because it is where
        the ambiguity meets a person. A transfer on Asha’s phone should have at least four states,
        not two: <em>sending</em>, <em>sent</em>, <em>failed</em> and <em>confirming</em>. The
        first three are the obvious ones. The fourth is the honest answer to a timeout: the app
        does not know yet, and it says so.
      </p>
      <p>
        For the confirming state to work, the app needs something it can ask about later. That
        means the transfer must have an identity before it is sent. When Asha taps Send, the app
        generates an id for this transfer, stores it on the phone together with the amount and
        recipient, and only then makes the request. If the request times out, the app shows
        “Confirming your transfer” and asks the API about that id at intervals. If the phone loses
        signal, or Asha closes the app, the stored id survives, and the app resumes asking when it
        next starts. Without the stored id, a crash of the app itself would turn an unknown outcome
        into a forgotten one.
      </p>
      <p>
        The confirming state also changes what the Send button does. While a transfer is
        confirming, tapping Send again for the same recipient and amount should not create a second
        transfer silently. The app can ask “A transfer of ₹500 to Ravi is still being confirmed.
        Send another?”, which turns an accidental retry into a deliberate choice. If Asha does want
        to pay twice, the second transfer gets its own id and is treated as a separate intention.
      </p>
      <p>
        There is a limit to how long confirming can last. Once the wallet guarantees that a request
        whose deadline has passed will never start, which the next chapter sets up, the app can
        wait for that deadline plus a margin, ask once more, and turn “not found” into a definite
        “failed, no money moved”. Until then, the only truthful answer after a timeout is “we do not
        know yet”.
      </p>
      <p>
        None of this is specific to payments. Any operation with effects that accumulate, such as
        sending a message, placing an order or booking a seat, has the same four states, whether or
        not the interface admits it. Interfaces that show only success and failure are reporting a
        guess in the unknown case.
      </p>

      <h3>Why distribute at all, and when not to</h3>
      <p>
        If one machine gives us atomicity and shared fate, why give them up? Performance is rarely
        the honest answer for a wallet. A well-run Postgres server can commit thousands of small
        transactions per second, and a payments app with ten million users might peak at a few
        hundred transfers per second. One machine can carry that load for a long time.
      </p>
      <p>
        The real reasons are about independent failure. Disks die, kernels need patching, and every
        reboot of a single wallet server is an outage for payments. Data centres lose power and
        fibre. A regulator or a finance team may require that no acknowledged transfer is ever lost
        and that service resumes within minutes. Meeting those requirements means keeping copies on
        machines that do not fail together, and that means a network between them. Independence is
        both the problem and the resource: the same property that makes the outcome of a call
        unknown is what lets one machine keep serving while another is down.
      </p>
      <p>
        That also tells us when to stay on one machine. If an outage of a few minutes during a
        planned failover is acceptable, and point-in-time recovery from continuously shipped
        backups gives an acceptable loss window, a single primary with a standby is simpler, cheaper
        and has fewer ways to fail than anything in the rest of this pathway. Revisit the decision
        when the business tightens its recovery targets, when maintenance windows stop being
        acceptable, or when the load genuinely outgrows one machine. Each additional machine buys
        tolerance for one kind of failure and introduces new partial failures of its own.
      </p>
      <p>
        In the next chapter, <em>Talking between machines</em>, we make Asha’s retry safe. That
        means idempotency keys stored in the same transaction as the transfer, deadlines that
        travel with the request, error codes that tell the caller what it may do next, and message
        formats that survive a rolling deploy.
      </p>
      <Notes
        items={[
          'A timeout is a decision the caller makes; it says nothing about whether the callee did the work.',
          'Request lost, crash after commit, reply lost and “still running” all look identical to the caller.',
          'A screen that says “failed” after a timeout is stating something the system does not know.',
          'Timeouts should come from measured latency and the caller’s own budget, not from round numbers.',
          'Our wallet assumes crash-recovery with lost and delayed messages, and treats clients, not servers, as potentially malicious.',
          'Distribute to survive independent failures; if a short outage is acceptable, one primary and a standby may be the better design.',
        ]}
      />
    </>
  ),

  /* ── 02 · Talking between machines ────────────────────────────────── */
  rpc: (
    <>
      <p>
        This chapter turns the transfer call into something a caller can retry without fear. By
        the end you should be able to design the request and response for a money-moving RPC: what
        key the caller sends, what the server stores and when, how long everyone waits, and what
        each error tells the caller to do.
      </p>
      <p>
        We left the wallet in a bad state. The API calls <code>Transfer(from, to, amount)</code> on
        the wallet service. When the call times out, the API does not know whether the money moved,
        and a retry might move it twice. During one slow afternoon that produced hundreds of double
        charges. We need the second attempt to find the first.
      </p>

      <h3>A remote call is not a function call</h3>
      <p>
        Most RPC frameworks generate a client stub so that calling the wallet looks like calling a
        local function: <code>wallet.Transfer(req)</code>. That convenience is useful and slightly
        dishonest. A 1994 paper from Sun, <em>A Note on Distributed Computing</em>, argued that
        local and remote calls differ in ways no interface can hide, and the argument has held up.
      </p>
      <p>
        Latency differs by orders of magnitude. A local function call costs nanoseconds; a round
        trip inside one data centre costs something like half a millisecond, and between two cities
        tens of milliseconds. A loop that makes a remote call per item is a different program from
        the same loop with local calls. Memory is not shared, so the wallet cannot receive a pointer
        to the API’s account object; everything crosses as a copy, and the copy can be stale by the
        time it arrives. Most of all, a remote call can fail partially, in exactly the ways the last
        chapter listed. A local call never returns “maybe”.
      </p>
      <p>
        The practical consequence is that the stub’s signature should not pretend. A transfer
        method that returns <code>Result</code> or throws hides a third outcome. Our design will
        make “unknown” a first-class answer the caller has to handle.
      </p>

      <h3>The retry needs a name for the operation</h3>
      <p>
        A retry is only safe if the server can recognise it as a retry. The wallet sees two requests
        that both say “move ₹500 from Asha to Ravi”. They could be one intention sent twice, or two
        genuine payments, perhaps rent split in two halves. The amounts and accounts cannot tell
        them apart. Something in the request has to.
      </p>
      <p>
        That something is an idempotency key: a unique identifier for one intention, generated by
        the client before the first attempt and sent unchanged on every retry. The important word
        is intention. The key is created when Asha taps Send, not when the API makes a network
        call. If the app generated a fresh key on each attempt, every retry would look new and the
        key would do nothing.
      </p>
      <p>
        On the server side, the key has to be recorded in the same transaction as the money
        movement. Here is the shape of it:
      </p>
      <pre><code>{`BEGIN;
INSERT INTO idempotency_keys (key, request_hash, status)
  VALUES ('k7f2...', 'sha256(asha,ravi,500)', 'done');
  -- a unique index on key: a second insert fails here
UPDATE accounts SET balance = balance - 500 WHERE id = 'asha' AND balance >= 500;
UPDATE accounts SET balance = balance + 500 WHERE id = 'ravi';
INSERT INTO transfers (...) VALUES (...);
UPDATE idempotency_keys SET response = '{"transfer":"t-9001"}' WHERE key = 'k7f2...';
COMMIT;`}</code></pre>
      <p>
        If the insert of the key fails on the unique index, the wallet rolls back, reads the stored
        row, and returns the stored response. If the request hash differs from the stored one, the
        client has reused a key for a different operation, which is a client bug, and the wallet
        returns an error instead of guessing.
      </p>
      <Fig caption="Fig 2 · The reply to the first attempt is lost. The retry carries the same key, finds the stored result, and moves no money">
        <IdempotentRetry />
      </Fig>
      <p>
        Walk the cases from the last chapter with the key in place. If the first request never
        arrived, the retry is the first time the wallet sees the key, and it does the transfer. If
        the first attempt committed and the reply was lost, the retry hits the unique index and
        gets the stored result. If the first attempt crashed before commit, the key row was rolled
        back with everything else, so the retry does the transfer. All three converge on exactly one
        transfer. The slow case needs one more rule, which we will come to.
      </p>

      <Predict q={<>A colleague suggests a simpler version: first <code>SELECT</code> the key; if it is absent, call the existing transfer code, which runs its own transaction; then insert the key. What goes wrong?</>}>
        <p>
          Two things. First, two attempts can overlap. The slow first attempt and the retry both run
          the <code>SELECT</code>, both find nothing, and both perform the transfer. The check and
          the action are separate steps, so nothing stops both from passing the check.
        </p>
        <p>
          Second, the wallet can crash between the transfer’s commit and the key insert. The money
          has moved, the key was never recorded, and the next retry moves it again.
        </p>
        <p>
          Both bugs come from the same place: the record that the work happened and the work
          itself are not atomic. Putting the key insert inside the transfer’s transaction, guarded
          by a unique index, closes both. The database does the serialising for us.
        </p>
      </Predict>

      <p>
        Keys cannot be kept forever, and they do not need to be. They need to outlive every retry
        that might carry them. If the app retries for at most a few minutes and the user might tap
        again within an hour, a retention window of a day leaves a wide margin. Stripe’s public API,
        for example, documents that keys can be pruned after 24 hours. Choose the window from the
        longest plausible retry, then add a margin, and note that a key expiring too early turns a
        late retry back into a double charge.
      </p>

      <h3>Stopping work nobody is waiting for</h3>
      <p>
        The idempotency key handles the case where the first attempt finished. It does not handle
        the slow afternoon well. There, the first attempt was still in the wallet’s queue when the
        retry arrived. With the key in place, one of them wins the unique index and the other
        returns the stored result, so we no longer charge twice. But the wallet still spends its
        scarce capacity on requests whose callers left long ago.
      </p>
      <p>
        The fix is to send a deadline with every request: an absolute point in time, or a remaining
        budget, after which the answer is useless. gRPC builds this in, and propagates it to
        downstream calls. Say the app gives the whole operation 3 seconds. The API spends 200 ms on
        authentication and limits and calls the wallet with 2.8 seconds left. The wallet’s request
        sits in a queue for 2.9 seconds. When a worker finally picks it up, the deadline has passed,
        and the wallet rejects it without touching the database. The work that would have been
        wasted is never done, and the queue drains faster.
      </p>
      <p>
        A deadline also lets the status check from the last chapter give a definite answer. Once a
        request’s deadline has passed, the wallet will not start it. If the transfer is not recorded
        by then, and the request has not been picked up by a worker, it will never be. The caller can
        wait until the deadline plus a small margin, then ask, and trust a “not found”. There is a
        subtlety: the wallet checks the deadline when it starts the work, so a transfer that started
        just inside the deadline can still commit a little after it. The margin covers the longest
        time a started transfer can take, which is why the transaction itself also needs a timeout.
      </p>

      <h3>Retry when, how often, and at which layer</h3>
      <p>
        With keys and deadlines, retries are safe. They can still be harmful. A retry is extra load,
        and it arrives precisely when the service is struggling. Three rules keep that under control.
      </p>
      <p>
        First, back off. Wait before retrying, and wait longer each time: 100 ms, then 200, then 400.
        Second, add randomness to each wait. If ten thousand app instances all time out during the
        same blip and all retry after exactly 100 ms, they arrive together and recreate the blip.
        A common form, sometimes called full jitter, picks a uniformly random delay between zero and
        the current backoff ceiling, which spreads the retries across the whole interval.
      </p>
      <p>
        Third, retry at one layer only. Suppose the app retries three times, the API retries each
        call to the wallet three times, and the wallet’s database client retries three times. One
        tap can become 3 × 3 × 3 = 27 database attempts. During an overload this multiplication is
        exactly the wrong response. A common policy is to retry only at the layer closest to the
        user, or to give each client a retry budget, for example allowing retries to add at most 10
        percent to its normal request rate and failing fast once the budget is spent.
      </p>
      <p>
        Retries should also be limited to outcomes that might heal. A timeout might. A “service
        unavailable” might. “Insufficient funds” will not, and retrying it only adds load.
      </p>

      <h3>Errors the caller can act on</h3>
      <p>
        That last point argues for designing errors around what the caller should do next. An error
        that only says “500 Internal Server Error” forces the caller to guess whether retrying is
        safe. For the transfer RPC, the wallet’s responses should fall into a small number of
        classes.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Result</th><th>Meaning</th><th>Caller’s action</th></tr>
          </thead>
          <tbody>
            <tr><td>OK</td><td>Transfer committed, or this key’s earlier attempt did</td><td>Show success with the transfer id</td></tr>
            <tr><td>Rejected</td><td>Checked and refused: insufficient funds, account frozen</td><td>Do not retry; show the reason</td></tr>
            <tr><td>Key conflict</td><td>Same key, different request body</td><td>Client bug; log and alert, do not retry</td></tr>
            <tr><td>Unavailable</td><td>Refused before any work started, such as overload or deadline already passed</td><td>Safe to retry with backoff and the same key</td></tr>
            <tr><td>Unknown</td><td>Timeout, connection reset, or an error after work may have begun</td><td>Retry with the same key, or check status after the deadline</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The difference between the last two rows is useful. A server that is shedding load can say
        so before doing any work, which lets the caller know that nothing happened. The unknown row
        is the honest residue. With idempotency keys in place, the caller handles it the same way as
        unavailable; without them, it would need a human.
      </p>

      <h3>The message will change while both versions are running</h3>
      <p>
        A remote call has one more difference from a local one: the two sides are deployed
        separately. A rolling deploy of the wallet replaces servers a few at a time over twenty
        minutes. During that window some API calls reach new wallet code and some reach old. The
        app on Asha’s phone may be months out of date. So every message format must be readable by
        older and newer code at the same time.
      </p>
      <p>
        Schema-based formats such as Protocol Buffers make the rules explicit. Each field has a
        number, and the number is what goes on the wire. Old code skips fields with numbers it does
        not know. That gives a short list of safe and unsafe changes: adding a new optional field is
        safe; removing a field is safe if its number is reserved and never reused; changing a
        field’s type or reusing a number is unsafe, because old readers will decode the new bytes as
        the old type.
      </p>
      <p>
        Those rules only protect the bytes. They do not protect meaning, and the wallet shows why.
        Suppose the team adds international transfers by adding a <code>currency</code> field, with
        INR as the default when absent. A new API server sends <code>amount=50, currency=USD</code>.
        If that request reaches an old wallet server, the old server skips the field it does not
        know and moves ₹50. The schema change was technically compatible, and the transfer is wrong
        by a factor of about eighty.
      </p>
      <p>
        The fix is a deploy order and a guard. Roll out the wallet first, with code that
        understands the field. Only when every wallet server is new does the API start sending
        non-INR transfers. And because a rollback could bring old code back, the wallet should
        reject requests that contain fields it does not understand when those fields change the
        meaning of the operation. Some teams do this with an explicit list of required capabilities
        in the request. The general rule is that a field that changes what an operation does is a
        new operation, and needs to be introduced like one.
      </p>

      <h3>Finding the wallet, and noticing it has moved</h3>
      <p>
        Before the API can call the wallet, it has to find a wallet server, and that list changes
        constantly. Servers are replaced during deploys, added when traffic grows and removed when
        it falls. The API asks a service registry, or DNS, for the current addresses and keeps a
        pool of open connections to them, because opening a fresh connection with a TLS handshake
        for every call would add one or two extra round trips to each transfer.
      </p>
      <p>
        The pool and the registry are both caches of the truth, and both go stale. Suppose the
        wallet scales down from twelve servers to eight. The registry removes four addresses. An API
        server that cached the old list for sixty seconds keeps sending a third of its transfers to
        machines that are shutting down. If those machines stop abruptly, the API sees connection
        resets in the middle of requests, which are unknown outcomes, and retries them. With
        idempotency keys that is safe, but each one costs a timeout and a retry.
      </p>
      <p>
        Two habits remove most of this. A wallet server that is about to stop should first leave the
        registry, then stop accepting new requests while finishing the ones it has, and only then
        exit. This is usually called draining, and it turns abrupt resets into clean refusals that
        the caller can retry immediately because no work began. And clients should treat a failed
        connection as a reason to refresh their view of the registry, rather than waiting for a
        cache timer.
      </p>
      <p>
        There is a subtler problem with long-lived connections. HTTP/2 and gRPC send many requests
        over one connection, so a client that opened its connections when there were four wallet
        servers keeps using those four after eight more are added. The new servers sit idle while
        the old ones are overloaded. Load balancing has to happen per request rather than per
        connection, either in the client library or in a proxy, and connections should be recycled
        periodically so that new servers receive a share. The general point is that an RPC is not
        only a request and a reply. It travels over connections and addresses that each have their
        own lifetime and their own ways of going stale.
      </p>

      <h3>When an RPC is the wrong tool</h3>
      <p>
        Not everything the wallet does needs a synchronous call. Sending Ravi a notification that
        money arrived, updating the analytics store and feeding the fraud model do not need to
        finish before Asha sees “Sent”. Making them RPCs on the transfer path adds their latency
        and their failures to every transfer. They are better as events the wallet publishes after
        the transfer commits, which is the subject of the broadcast chapter.
      </p>
      <p>
        Idempotency keys also have a cost worth stating. Every write path pays an extra indexed
        insert, and the key table grows with traffic until pruned. For operations that are already
        idempotent, such as “set Asha’s display name to A. Rao”, a key adds nothing, because
        applying the same write twice gives the same state. Keys are for operations whose effects
        accumulate: debits, credits, sending messages, creating records.
      </p>
      <p>
        So far the wallet runs on one machine and the only question was whether a request happened.
        Once we keep copies of the wallet on several machines, a harder question appears: when two
        updates touch the same account on different machines, which one came first? The next
        chapter, <em>Time and order</em>, explains why the timestamps on those machines cannot
        settle it, and what can.
      </p>
      <Notes
        items={[
          'An idempotency key names one user intention; it is created once, before the first attempt, and reused on every retry.',
          'The key must be recorded in the same transaction as the money movement, guarded by a unique index.',
          'A deadline sent with the request lets the server drop work whose caller has already left.',
          'Retry with exponential backoff and jitter, at one layer, and only for outcomes that might heal.',
          'Errors should tell the caller what to do: rejected, unavailable before work began, or unknown.',
          'Byte-compatible schema changes can still change meaning; a field that alters an operation needs a deploy order and a guard.',
        ]}
      />
    </>
  ),

  /* ── 03 · Time and order ──────────────────────────────────────────── */
  time: (
    <>
      <p>
        This chapter lets you decide what order two events happened in when they were recorded on
        different machines, and recognise when that question has no answer. Those two skills keep
        an audit trail truthful and stop a replicated store from quietly keeping the wrong write.
      </p>
      <p>
        The wallet now runs on several application servers. Compliance asks for a single audit
        trail per account, so each server writes an entry for every balance change, stamped with
        its own clock, and a nightly job merges the entries by timestamp. One morning an auditor
        opens Asha’s trail and finds a payment of ₹1,800 at 10:15:02.140, followed by the ₹2,000
        top-up that funded it at 10:15:02.190. Asha appears to have spent money she did not have.
        The ledger is correct. The trail is wrong, and it is wrong because we trusted timestamps
        from two machines to mean the same thing.
      </p>

      <h3>What a timestamp from another machine is worth</h3>
      <p>
        Every server keeps time with a quartz oscillator, and quartz drifts. A typical error is in
        the tens of parts per million. At 20 parts per million a clock gains or loses about 1.7
        seconds a day (86,400 seconds × 0.00002). The Network Time Protocol corrects this by
        comparing against reference servers and adjusting. Inside a well-run data centre, NTP
        commonly keeps machines within a few milliseconds of each other. It does worse when its
        servers are unreachable, when a virtual machine is paused and resumed, or when the network
        path is congested and its round-trip estimates are skewed.
      </p>
      <p>
        NTP also has two ways of correcting a clock. Usually it slews: it runs the clock slightly
        fast or slow until the error is gone. When the error is large it may step: it sets the clock
        to a new value at once, and that value can be in the past. Leap seconds have caused similar
        jumps, which is why large operators now smear them across a day instead.
      </p>
      <p>
        Now compare those numbers with how long a message takes. A round trip inside one data
        centre is around half a millisecond. A clock difference of a few milliseconds is therefore
        several times larger than the time a message takes to travel. Server A can send a request
        stamped 10:15:02.140, and server B can receive it and stamp the reply 10:15:02.137. The
        reply appears to come before the question. In Asha’s trail, the server that processed the
        top-up was running about 60 ms ahead of the server that processed the payment, more than
        enough to reverse two events that happened 10 ms apart.
      </p>

      <h3>Where it stops being cosmetic</h3>
      <p>
        A misordered audit trail is embarrassing. A misordered write is worse. Suppose the wallet
        keeps account settings, including a <code>status</code> field that can be{' '}
        <code>active</code> or <code>frozen</code>, in a store that accepts writes in both data
        centres and resolves conflicts by keeping the write with the later timestamp. This policy is
        called last write wins, and several databases offer it as the default.
      </p>
      <p>
        Asha calls support from DC-2’s region, verifies her identity, and an agent unfreezes her
        account. Forty milliseconds later, by true time, the fraud system in DC-1 sees a login
        from an unfamiliar device and freezes it again. DC-1’s clock is 100 ms behind DC-2’s.
      </p>

      <Predict q={<>The unfreeze is stamped 10:00:00.000 in DC-2. The freeze happens 40 ms later in real time and is stamped by DC-1’s clock, which runs 100 ms slow. Which status do both data centres end up with, and does anything report an error?</>}>
        <p>
          The freeze is stamped 10:00:00.040 − 0.100 = 09:59:59.940. Last write wins compares
          09:59:59.940 with 10:00:00.000 and keeps the unfreeze. Both data centres converge on{' '}
          <code>active</code>.
        </p>
        <p>
          Nothing reports an error. The store did what it promised: it converged, and every replica
          agrees. It agrees on the wrong answer, and the fraud team’s freeze has vanished without a
          trace. The account is open while the suspicious device is logged in.
        </p>
        <p>
          The lesson is that convergence and correctness are different properties. Last write wins
          guarantees the first. It decides correctness by whichever clock happened to run fast.
        </p>
      </Predict>

      <h3>Two clocks in every machine</h3>
      <p>
        Before the theory, one rule you can apply today. Operating systems expose two clocks. The
        wall clock answers “what time is it?” and is the one NTP adjusts, including backwards. The
        monotonic clock answers “how much time has passed?” and only moves forward, though its
        value means nothing outside the machine that produced it. Every duration, timeout and
        latency measurement belongs on the monotonic clock.
      </p>
      <pre><code>{`// wrong: elapsed can be negative, or jump by seconds, if NTP steps the clock
const start = Date.now()
await wallet.transfer(req)
const elapsed = Date.now() - start

// right: monotonic, meaningful only for durations on this machine
const t0 = performance.now()
await wallet.transfer(req)
const tookMs = performance.now() - t0`}</code></pre>
      <p>
        The same applies to lease expiry, which the coordination chapter depends on. A server that
        computes “my lease ends at 10:00:10” on the wall clock will hold its lease too long if its
        clock is stepped backwards. Leases are measured as durations on the monotonic clock, with a
        safety margin for clocks that run at slightly different rates.
      </p>

      <h3>Order from cause, not from time</h3>
      <p>
        If clocks cannot order events across machines, something else has to. Leslie Lamport’s
        1978 paper made the move that the rest of the field builds on. Instead of asking when an
        event happened, ask which events could have influenced it.
      </p>
      <p>
        He defined a relation called happens-before. Event a happens before event b if they are on
        the same machine and a came first; or if a is the sending of a message and b is its
        receipt; or if there is a chain of such steps from a to b. Two events with no chain between
        them in either direction are concurrent. Concurrent here does not mean simultaneous. It
        means neither could have known about the other.
      </p>
      <p>
        Apply that to the audit trail. Asha topped up, the wallet replied, her phone showed the new
        balance, and she then sent the payment. There is a chain: top-up commit, reply, phone,
        payment request, payment commit. The top-up happened before the payment, whatever any clock
        says, because the payment request was sent by someone who had seen the top-up’s result. Now
        apply it to the freeze. The support agent did not know about the fraud alert, and the fraud
        system did not know about the call. No message links them. They are concurrent, and asking
        which came first has no answer worth building on.
      </p>
      <p>
        That reframing is the main idea of this chapter. Some pairs of events have an order, and it
        comes from messages. Other pairs have none, and a design that pretends they do will pick one
        arbitrarily.
      </p>

      <h3>Lamport clocks: a counter that respects cause</h3>
      <p>
        A Lamport clock turns happens-before into numbers. Each server keeps an integer counter. It
        adds one before each event it records. It attaches the counter to every message it sends.
        When it receives a message, it sets its counter to one more than the larger of its own value
        and the value in the message.
      </p>
      <Fig caption="Fig 3 · Server B is at 2 when a message stamped 5 arrives, so B jumps to 6. Anything B does afterwards is numbered after the send">
        <LamportTimeline />
      </Fig>
      <p>
        For the audit trail, the wallet returns its counter with each response, the API passes it
        back on the client’s next request (as an opaque token the app stores), and the server that
        handles the payment starts from at least that value. The top-up is stamped 41, the reply
        carries 41, and the payment server, sitting at 17, jumps to 42. Sorting the trail by
        counter, with server id to break ties, now puts the top-up before the payment. If a happened
        before b, a’s counter is smaller.
      </p>
      <p>
        The converse does not hold, and this limitation matters. A smaller counter does not mean
        the event came first in any causal sense. The freeze and the unfreeze get counters too,
        maybe 88 and 91, and sorting by them picks an order. It is a consistent order that every
        replica will agree on, but for concurrent events it is as arbitrary as the wall clock was.
        Lamport clocks cannot tell you that two events raced.
      </p>

      <h3>Vector clocks: noticing that two writes raced</h3>
      <p>
        To detect concurrency, each replica keeps one counter per writer instead of one in total.
        With two data centres accepting writes, a vector clock has two entries, written [DC-1,
        DC-2]. A data centre increments its own entry when it writes, and on receiving another’s
        update it takes the larger value in each position.
      </p>
      <p>
        Say Asha’s status record is at [3, 5]: both sides have seen everything so far. The agent in
        DC-2 unfreezes her, producing [3, 6]. Before that replicates, the fraud system in DC-1
        freezes her, producing [4, 5]. When the two versions meet, compare them position by
        position. One version is newer than another only if it is greater or equal in every
        position. Here [3, 6] is ahead in the second position and behind in the first, so neither
        supersedes the other. The store knows the writes were concurrent.
      </p>
      <p>
        Knowing is all it can do. Something still has to choose, and that choice belongs to the
        domain, not to the clock. For account status, a sensible rule is that the more restrictive
        state wins and the conflict is sent to a human: freeze beats unfreeze, and support gets a
        ticket. A store that keeps both versions (often called siblings) and hands them to the
        application is doing the honest thing. A store that silently picks one is making a business
        decision on your behalf.
      </p>
      <p>
        Vector clocks have costs. Each version carries a vector whose length grows with the number
        of writers. Amazon’s Dynamo used entries per coordinating node and truncated old entries
        when the vector grew too long, accepting occasional false conflicts. Every reader must be
        prepared to receive several versions and merge them, and merge code is easy to get wrong.
      </p>

      <h3>What production systems do instead</h3>
      <p>
        Most systems avoid needing either clock for their core data, by making sure that writes
        which could conflict pass through one place.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Approach</th><th>What it gives</th><th>What the design must also handle</th></tr>
          </thead>
          <tbody>
            <tr><td>One leader per key range</td><td>A single order for every write to that range, assigned by the leader’s log; no clocks involved</td><td>All writes go to one node; replacing that node safely needs consensus</td></tr>
            <tr><td>Lamport or vector clocks</td><td>Causal order; vectors also detect concurrent writes</td><td>Metadata on every version; application merge logic</td></tr>
            <tr><td>Hybrid logical clocks</td><td>Timestamps close to wall time that never go backwards and respect happens-before</td><td>Correctness still assumes clock skew stays under a configured bound</td></tr>
            <tr><td>Bounded-uncertainty clocks</td><td>Timestamp order that matches real time across regions</td><td>Special time hardware, and waiting out the uncertainty on each commit</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        A hybrid logical clock, used by CockroachDB and others, keeps a timestamp made of a physical
        part and a counter. On each event or message it takes the maximum of its own wall clock and
        any timestamp it has seen, and bumps the counter to break ties. The result stays close to
        real time, so humans can read it, and still respects causality like a Lamport clock.
        CockroachDB also refuses to run a node whose clock drifts beyond a configured maximum
        offset, because some of its guarantees depend on that bound. Google’s Spanner goes further
        with GPS and atomic clocks; we will look at what it buys in the chapter on systems that
        shipped.
      </p>
      <p>
        For the wallet, the first row is the answer. Every balance change and every status change
        for an account goes through that account’s leader, which appends it to a log and gives it a
        sequence number. The audit trail is sorted by sequence number per account, so it is correct
        by construction. The freeze and the unfreeze can no longer be concurrent writes in two
        places: they queue at the same leader, and the second one sees the first. If we still want
        the more restrictive state to win, that becomes an ordinary rule in code (an unfreeze after a
        recent freeze needs review) rather than an accident of clocks.
      </p>
      <p>
        Cross-account order is the remaining gap. Asha’s debit and Ravi’s credit may live on
        different leaders, and an auditor reading both logs may want to see that the money left
        before it arrived. That is a causal relationship, and the cheap way to preserve it is to
        carry it: Ravi’s credit entry records the id and sequence number of Asha’s debit that caused
        it.
      </p>

      <h3>A hybrid clock, worked through</h3>
      <p>
        Hybrid logical clocks are worth tracing once, because the mechanism is small and the
        failure it guards against is instructive. Each timestamp is a pair: a time part l and a
        counter c. For brevity we will write the time part as milliseconds past 10:00:00.
      </p>
      <p>
        On a local event or a send, a server sets l to the larger of its current l and its physical
        clock. If l did not change, it adds one to c; if l moved forward, c goes back to zero. On
        receiving a message stamped (lm, cm), it sets l to the largest of its own l, lm and its
        physical clock, and sets c so that the new timestamp is strictly greater than both its
        previous one and the message’s.
      </p>
      <p>
        Server A’s physical clock reads 100 when it sends a message, so the message carries (100,
        0). Server B’s clock runs 60 ms behind. When the message arrives, B’s physical clock reads
        45 and its last timestamp was (40, 0). B takes the largest of 40, 100 and 45, which is 100,
        and since that came from the message, sets the counter one past the message’s: (100, 1).
        The receive is ordered after the send, as causality requires. B’s next local events, while
        its physical clock is still below 100, are stamped (100, 2), (100, 3) and so on. About 55 ms
        later its physical clock passes 100, l follows the physical clock again, and the counter
        resets.
      </p>
      <p>
        Three properties fall out. Timestamps never go backwards on any server, even if NTP steps
        the clock back, because l only ever takes a maximum. Timestamps respect happens-before,
        like a Lamport clock. And the time part never runs further ahead of a server’s physical
        clock than the largest skew in the cluster, so the timestamps remain readable as times.
      </p>
      <p>
        That last property depends on the skew staying small. If one server’s clock is wrongly set
        a day ahead, every timestamp it sends drags its receivers’ l a day ahead, and they pass it
        on. Within minutes the whole cluster is stamping events with tomorrow’s date, and nothing
        in the algorithm brings it back until real time catches up. That is why systems built on
        hybrid clocks monitor clock offset between nodes and shut down a node whose offset exceeds
        the configured maximum, rather than letting it contaminate everyone else. Hybrid clocks
        tolerate skew; they do not tolerate an unbounded amount of it.
      </p>

      <h3>When the wall clock is fine</h3>
      <p>
        None of this means wall-clock timestamps are useless. They are the right tool for showing
        Asha when she sent money, for log lines a human reads during an incident, for metrics, and
        for expiry times with generous margins, such as deleting idempotency keys after a day. In
        all of these, an error of a few milliseconds, or even a second, changes nothing.
      </p>
      <p>
        They are the wrong tool when the timestamp decides an outcome: which write survives, who
        holds a lease, which ledger entry comes first. The test is simple. If shifting one machine’s
        clock by 100 ms could change what the system does, the design is using time to stand in
        for order, and it will eventually get it wrong. Revisit the question whenever you add a
        second place where the same data can be written.
      </p>
      <p>
        We have decided that each account’s writes go through one leader. The next chapter,{' '}
        <em>Replication and consistency</em>, keeps copies of that leader’s data on other machines
        so that the wallet survives losing one, and meets the first consequence: Asha sends money and
        then sees her old balance.
      </p>
      <Notes
        items={[
          'Clock skew between servers is often larger than the time a message takes, so timestamps from two machines can reverse cause and effect.',
          'Last write wins converges reliably and can still silently discard the write that mattered.',
          'Durations, timeouts and leases belong on the monotonic clock; wall clocks can jump backwards.',
          'Happens-before comes from chains of messages; events with no chain between them are concurrent and have no meaningful order.',
          'Lamport clocks respect causality but cannot detect concurrency; vector clocks can, and then the application must decide.',
          'The cheapest way to order two writes is to route them through one leader’s log.',
        ]}
      />
    </>
  ),

  /* ── 04 · Replication and consistency ─────────────────────────────── */
  replication: (
    <>
      <p>
        This chapter lets you choose, for each piece of data, how stale a read may be and what
        that costs, and predict what users will notice when the copies disagree. It also walks
        through the failover that most teams get wrong the first time.
      </p>
      <p>
        The wallet now runs on three machines in two data centres. The leader and one follower are
        in DC-1; a second follower is in DC-2. We will assume a round trip between the data centres
        of about 30 ms, which is in the range for two cities several hundred kilometres apart, and
        about half a millisecond inside each. Asha sends ₹500 to Ravi. The app says “Sent”. She
        pulls down to refresh, and her balance still shows ₹2,000.
      </p>

      <h3>What the copies are for</h3>
      <p>
        Replication buys three different things, and it helps to know which one a given copy is
        for. The follower in DC-1 is there so that losing the leader’s machine does not lose data or
        stop payments for long. The follower in DC-2 is there so that losing all of DC-1 does not
        either. And either follower can serve reads, which spreads load and, for users near DC-2,
        cuts latency.
      </p>
      <p>
        The mechanism is the leader’s log. Every committed transaction is already written to the
        leader’s write-ahead log for crash recovery. Streaming replication ships that log to the
        followers, which apply it in the same order. Because there is one leader and one log, the
        order question from the previous chapter is settled: every copy applies the same changes in
        the same sequence. The open question is timing. A follower is always somewhat behind, and
        the distance it is behind is called replication lag.
      </p>

      <h3>When does the leader say “done”?</h3>
      <p>
        The first decision is when the leader acknowledges a transfer to the caller. It can answer
        as soon as its own disk has the commit, or it can wait until some followers have it too.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Acknowledge after</th><th>Added commit latency</th><th>Survives losing</th><th>What the design must also handle</th></tr>
          </thead>
          <tbody>
            <tr><td>Leader only (async)</td><td>None</td><td>Nothing that was not yet shipped</td><td>Acknowledged transfers lost on failover</td></tr>
            <tr><td>Leader + DC-1 follower</td><td>About 1 ms</td><td>The leader’s machine</td><td>A whole-DC outage still loses recent transfers</td></tr>
            <tr><td>Leader + DC-2 follower</td><td>About 30 ms</td><td>All of DC-1</td><td>Every commit pays the cross-DC round trip; DC-2 trouble slows all writes</td></tr>
            <tr><td>All followers</td><td>About 30 ms, plus the slowest node</td><td>Everything</td><td>Any one slow or dead follower stops all writes</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        It helps to put a number on the asynchronous row. Suppose the wallet commits 200 transfers
        per second and the DC-2 follower usually runs 50 ms behind. At any moment, about 200 × 0.05
        = 10 acknowledged transfers exist only in DC-1. During a burst, or while DC-2 is replaying a
        large batch, lag can reach seconds, and the window grows to hundreds of transfers. For
        comments on a blog, losing ten writes in a rare disaster may be acceptable. For a wallet, an
        acknowledged transfer that disappears means Asha was told she paid and Ravi never got the
        money, or worse, Ravi was notified and the money then vanished.
      </p>
      <p>
        So the wallet waits for at least one follower. Which one depends on the failure it must
        survive. Waiting for DC-2 costs about 30 ms on every commit, but databases group concurrent
        commits into one flush and one round trip, so throughput suffers far less than latency.
        That is the choice we will assume: the leader acknowledges once the DC-2 follower has the
        transaction on disk.
      </p>

      <h3>Why Asha sees her old balance</h3>
      <p>
        Waiting for a follower to store the log is not the same as waiting for it to apply the log.
        Many systems acknowledge once the follower has written the entry to disk and apply it to
        their tables shortly after. Reads served by that follower can still miss a transfer that
        has been acknowledged.
      </p>
      <Fig caption="Fig 4 · The leader acknowledges the transfer. The refresh is served by the DC-2 follower, which has not applied it yet, so Asha sees ₹2,000">
        <ReplicationLag />
      </Fig>

      <Predict q={<>Asha’s refreshes are load-balanced across the two followers. The DC-1 follower applies the transfer within 2 ms; the DC-2 follower within about 80 ms. She refreshes twice in quick succession. What sequences of balances can she see?</>}>
        <p>
          If both refreshes land on the DC-1 follower after it applied the transfer, she sees
          ₹1,500 twice. If the first lands on DC-2 before it caught up, she sees ₹2,000 then
          ₹1,500, which looks like the app was slow.
        </p>
        <p>
          The unsettling case is the reverse: the first refresh lands on DC-1 and shows ₹1,500,
          the second lands on DC-2 and shows ₹2,000. Her balance appears to go back up. To Asha
          this looks like the payment was reversed. She may well send it again.
        </p>
        <p>
          Nothing is wrong with the data in any of these cases. Each replica is a correct copy of the
          leader at some recent moment. What is missing is a guarantee about which moment a given
          read reflects.
        </p>
      </Predict>

      <h3>The guarantees users actually notice</h3>
      <p>
        Database theory has a long list of consistency models. Three of them map directly onto
        things a wallet user sees, and they are worth learning by the complaint they prevent.
      </p>
      <p>
        Read-your-writes says that after Asha makes a change, her own reads reflect it. Its violation
        is the case we started with: “I sent money and my balance did not change.” Monotonic reads
        says that once a user has seen a value, later reads do not show an older one. Its violation
        is the balance that goes back up. Consistent prefix says that if a series of writes happened
        in an order, nobody sees a later one without the earlier ones. In the wallet, its violation
        is a history page showing Ravi spending ₹500 before the credit that gave him the ₹500.
      </p>
      <p>
        There is a fourth that crosses users. Ravi receives a push notification: “You received ₹500
        from Asha.” He opens the app, his read goes to a lagging follower, and the money is not
        there. The notification was caused by the credit, and his read should reflect everything
        that caused what he has seen. That is causal consistency.
      </p>
      <p>
        One mechanism serves all of these. When the leader commits a transfer, it returns its log
        position along with the result, a number like LSN 88,412. The app stores the highest
        position it has seen and sends it with each read. A follower that receives a read asking for
        “at least 88,412” either waits until it has applied that far, typically a few milliseconds,
        or forwards the read to the leader. The push notification carries the position of the
        credit, so Ravi’s read waits for it too. The cost is plumbing a token through the app and
        API, and an occasional wait. A cruder alternative is to send a user’s reads to the leader for
        a few seconds after each write, which costs leader capacity and, for DC-2 users, 30 ms per
        read.
      </p>

      <h3>Measuring lag before it surprises you</h3>
      <p>
        Every choice in this chapter depends on how far behind the followers are, so the wallet
        needs to measure it, and the obvious measurements mislead.
      </p>
      <p>
        Databases usually report lag as a distance in the log: the follower has applied up to byte
        position X and the leader has written up to Y. That number is precise and hard to
        interpret. Two megabytes of lag is nothing during a bulk import and a long time during a
        quiet night. Converting it to seconds by assuming a write rate gives the wrong answer exactly
        when the write rate changes, which is when lag matters.
      </p>
      <p>
        A more direct method is a heartbeat row. Once a second, the leader writes its current time
        into a small table. Each follower, when it applies that write, compares the stored time
        with its own clock. The difference is the lag in seconds, as seen by a reader of that
        follower. It includes clock skew between the two machines, so a few milliseconds of error
        should be expected, but it measures the thing users care about: how old is the data a read
        here would see.
      </p>
      <p>
        There is one trap. If the leader stops writing, perhaps because it has crashed or been
        partitioned, the follower’s last applied heartbeat simply gets older. A follower that
        computes lag as “now minus the last heartbeat I applied” reports growing lag, which is
        correct. A follower that only reports lag when a new heartbeat arrives reports nothing, and a
        dashboard showing the last value shows healthy lag throughout an outage. Lag should be
        computed continuously from the age of the newest applied heartbeat.
      </p>
      <p>
        With a trustworthy lag figure, routing can use it. The API can send a balance read to the
        DC-2 follower only while that follower reports lag below, say, 200 ms, and fall back to the
        leader otherwise. During the salary-credit batch at the end of each month, when DC-2 falls
        a few seconds behind, reads quietly move to the leader instead of showing stale balances to
        everyone in the region. The cost is extra load on the leader at exactly the moment it is
        busiest, which is worth checking against its capacity before relying on it.
      </p>

      <h3>Which reads need the leader</h3>
      <p>
        The strongest model is linearizability: the system behaves as if there were one copy, and
        each operation takes effect at a single instant between its start and end. Every read sees
        every write that finished before it began. It is what a single machine gives you, and it
        costs a trip to the leader, or a check with a majority, on every read.
      </p>
      <p>
        Not every read in the wallet needs it, and the skill is to decide per read path.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Read</th><th>Guarantee</th><th>Why</th></tr>
          </thead>
          <tbody>
            <tr><td>Balance check inside a transfer</td><td>Linearizable, on the leader</td><td>A stale balance would let Asha spend money she no longer has</td></tr>
            <tr><td>Balance on the home screen</td><td>Read-your-writes and monotonic</td><td>A few milliseconds stale is invisible; going backwards is not</td></tr>
            <tr><td>Transaction history</td><td>Consistent prefix, causal across accounts</td><td>Credits must appear before the spending they funded</td></tr>
            <tr><td>Monthly statement</td><td>Snapshot as of a log position</td><td>Must be exact for a point in time, not current</td></tr>
            <tr><td>Analytics dashboard</td><td>Eventual</td><td>Minutes of lag change nothing</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        This is also the right place to read the CAP theorem precisely. It says that when the
        network partitions, a system must choose for each operation between answering with possibly
        stale or conflicting data and not answering. That is all it says. Suppose the link between
        the data centres fails. DC-2’s app servers can reach only their follower. They can show
        balances marked “as of 10:42”, which is available and stale. They should not accept
        transfers: the leader is unreachable, and accepting debits locally would let Asha spend the
        same ₹2,000 once in each data centre. For the wallet, reads stay available and writes in
        DC-2 stop. When the network is healthy, the trade is between latency and freshness, which is
        the subject of every row in the table above.
      </p>

      <h3>Copies without a leader</h3>
      <p>
        There is another family of designs worth understanding even though the wallet will not use
        it for balances. In a leaderless store, in the style of Amazon’s Dynamo, a client writes to
        several replicas directly and reads from several, with no single node deciding order.
      </p>
      <Fig caption="Fig 5 · With five replicas, a write acknowledged by three and a read that asks three must share at least one node">
        <QuorumOverlap />
      </Fig>
      <p>
        With N replicas, a write is acknowledged once W of them have it, and a read asks R of them
        and takes the newest version it gets. If R + W &gt; N, every read set overlaps every write
        set in at least one node, so some replica in the read has the latest acknowledged write.
        With N = 3, W = 2 and R = 2 is the balanced choice; W = 3 and R = 1 makes reads cheap and
        lets one slow node block writes.
      </p>
      <p>
        The overlap guarantee is weaker than it looks. A write that reached one replica and then
        failed is reported as failed, but it is still on that replica and may spread later. Two
        writes to the same key arriving at different replicas at once produce siblings, the
        concurrent versions from the last chapter. And nothing in the scheme can stop two
        concurrent debits that each see a balance of ₹2,000 from both succeeding. Preventing an
        overdraft means checking and updating the balance in one place, in one order. That is
        coordination, and leaderless replication is designed to avoid it.
      </p>
      <p>
        The general principle is worth stating carefully. Data types designed to merge concurrent
        updates automatically, known as CRDTs, work well for counters, sets and presence. A counter
        CRDT can add up concurrent top-ups correctly. It cannot enforce “balance never below zero”,
        because that invariant depends on the order of concurrent debits. Any invariant of that
        shape needs coordination somewhere.
      </p>

      <h3>The failover that goes wrong</h3>
      <p>
        Now the walk-through the chapter promised. Before we chose to wait for DC-2, the wallet was
        configured asynchronously. Here is what happened during a power failure.
      </p>
      <p>
        At 21:10, DC-1 loses power. The leader and the DC-1 follower go down together. The DC-2
        follower was 400 ms behind at the time, because a large batch of salary credits had just
        been committed. At 200 transfers per second, that is about 80 acknowledged transfers that
        exist nowhere outside DC-1.
      </p>
      <p>
        The on-call engineer sees DC-1 unreachable and promotes the DC-2 follower to leader. Payments
        resume after eleven minutes. The 80 transfers are gone. Some of their users were told
        “Sent”. Some recipients had already received push notifications, because the notification
        service consumed events from the old leader before it died.
      </p>
      <p>
        It gets worse. Transfer ids came from a database sequence. The new leader’s sequence was
        behind, so it hands out ids t-9001 through t-9080 again, to different transfers. Receipts,
        support tickets and the bank reconciliation file now have two meanings for each of those ids.
        GitHub described a similar failure in 2012, where a promoted MySQL follower reused
        auto-increment ids that another system still referenced.
      </p>
      <p>
        At 21:40, power returns in DC-1. The old leader boots, finds its configuration says it is
        the leader, and starts accepting writes from the API servers in DC-1 that still point at it.
        There are now two leaders. Both accept transfers. This is split brain, and reconciling its
        results is manual work measured in days.
      </p>
      <p>
        Each problem has a fix with a price. Waiting for the DC-2 follower before acknowledging
        means no acknowledged transfer is lost, for about 30 ms on every commit. Identifiers that do
        not depend on the leader, such as the idempotency key or a random UUID, cannot be reissued.
        Stopping the old leader needs a rule it cannot ignore when it wakes: either it is forcibly
        shut down before the new leader starts, or every leader carries an epoch number and storage
        rejects writes from older epochs. And deciding who is leader should not depend on one
        engineer reading a dashboard at night. Making that decision automatically, without ever
        producing two leaders, is the consensus problem.
      </p>

      <h3>When replicas for reads are not worth it</h3>
      <p>
        Every anomaly in this chapter came from serving reads on followers. If the leader can
        handle all reads, keeping followers purely as standbys removes the whole class: users only
        ever read from the one copy that is always current. Many payment systems do exactly this for
        balances and use followers only for reporting.
      </p>
      <p>
        Serving reads from followers becomes worth its complexity when the leader is genuinely
        overloaded, or when users far from the leader need lower latency than a cross-region round
        trip allows. Revisit the decision when either of those becomes true, and take the session
        tokens with it.
      </p>
      <p>
        Before we automate failover, there is a quieter problem. The leader does not only replicate
        to followers; the notification service, the fraud model and the analytics store all need to
        hear about every balance change, in an order that makes sense. The next chapter,{' '}
        <em>Broadcast, gossip and ordering guarantees</em>, looks at what each of those listeners
        needs and what it costs to provide.
      </p>
      <Notes
        items={[
          'With asynchronous replication, the loss window on failover is roughly the write rate times the replication lag.',
          'Acknowledging only after a follower in another data centre has the write survives a data-centre loss for about one cross-DC round trip per commit.',
          'Read-your-writes, monotonic reads and causal consistency can all be provided by passing the leader’s log position with each read.',
          'Choose a consistency guarantee per read path; the balance check inside a transfer needs the leader, the analytics dashboard does not.',
          'Quorums give overlap, not invariants; preventing an overdraft needs one place that orders debits.',
          'Manual failover risks lost writes, reused ids and two leaders; making it safe is the consensus problem.',
        ]}
      />
    </>
  ),

  /* ── 05 · Broadcast, gossip and ordering guarantees ───────────────── */
  broadcast: (
    <>
      <p>
        This chapter lets you say, for each consumer of a stream of events, what it needs: every
        event or most of them, in which order, and relative to what. Once you can say that
        precisely, you can buy the cheapest mechanism that provides it, instead of paying for the
        strongest one everywhere or discovering in production that you bought too little.
      </p>
      <p>
        Every committed transfer in the wallet produces balance-change events. The notification
        service tells Ravi he received money. The fraud model scores each debit. The history service
        builds the transaction list in the app. Analytics counts volume. And the followers from the
        last chapter are, in a sense, listeners too: they apply the same changes. These consumers
        want different things, and the differences decide the design.
      </p>

      <h3>One event, many listeners</h3>
      <p>
        Start by asking each listener two questions: what happens if it misses an event, and what
        happens if it sees two events in the wrong order?
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Listener</th><th>If an event is missing</th><th>If events are reordered</th><th>What it needs</th></tr>
          </thead>
          <tbody>
            <tr><td>Notifications</td><td>Ravi is not told; mildly bad</td><td>Rarely matters</td><td>Every event, duplicates suppressed</td></tr>
            <tr><td>Fraud model</td><td>A fraudulent debit goes unscored</td><td>A debit before its funding credit looks like an overdraft</td><td>Every event, per-account order, causal across accounts</td></tr>
            <tr><td>History service</td><td>The statement is wrong</td><td>Spending appears before the money that funded it</td><td>Every event, per-account order, causal across accounts</td></tr>
            <tr><td>Analytics</td><td>A rounding error in a daily total</td><td>Irrelevant for aggregates</td><td>Most events, any order</td></tr>
            <tr><td>Followers</td><td>The copy diverges</td><td>The copy diverges</td><td>Every event, in one order identical everywhere</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The right-hand column is a ladder. From weakest to strongest: best-effort delivery (most
        events, no order), reliable delivery (every event, no order), FIFO (each sender’s events in
        the order it sent them), causal (anything an event depends on is delivered before it), and
        total order (every listener sees every event in the same sequence). Each rung costs more
        than the one below, in messages, metadata, latency or availability. The rest of the chapter
        is about what each rung costs and where the wallet needs it.
      </p>

      <h3>Getting every event out at least once</h3>
      <p>
        Reliability fails first at the source. The obvious code commits the transfer and then
        publishes an event to a message broker. If the wallet crashes between the two steps, the
        transfer exists and the event does not; Ravi never hears about the money. Publishing first
        and committing second is worse: if the commit then fails, listeners hear about a transfer
        that never happened. Writing to two systems without a transaction spanning both is called a
        dual write, and it is one of the most common sources of drift between services.
      </p>
      <p>
        The usual fix is an outbox. The wallet inserts the event into an <code>outbox</code> table
        in the same transaction as the transfer. Either both exist or neither does. A separate
        relay process reads new outbox rows, publishes them to the broker, and marks them sent. If
        the relay crashes after publishing but before marking, it publishes the same event again
        when it restarts. So the guarantee is at least once, and every consumer must handle
        duplicates, typically by remembering the event ids it has processed. This is the same
        pattern as the idempotency key in the RPC chapter, applied on the receiving side.
      </p>
      <p>
        There is a textbook version of reliable broadcast that is worth knowing because it explains
        why systems are built the way they are. If a sender crashes partway through sending to ten
        listeners, some got the event and some did not. To repair that without the sender, each
        listener re-sends every new event to all others the first time it sees it. Every listener
        then gets it as long as any one did, at a cost of roughly n² messages for n listeners. Real
        systems rarely do this. They put the event into a replicated, durable log such as a Kafka
        topic, and each listener reads the log at its own pace. Once the log has accepted the event,
        reliability is the log’s job, and the log solves it with the replication from the last
        chapter.
      </p>

      <h3>The consumer’s side: remembering what it has done</h3>
      <p>
        At-least-once delivery moves the duplicate problem to every consumer, and how a consumer
        handles it decides whether duplicates are harmless. Consider the history service, which
        adds a row to Asha’s transaction list for each event. A Kafka consumer reads a batch of
        events, processes them, and then commits its offset, the position in the partition up to
        which it has finished. If it crashes after processing and before committing, it restarts
        from the old offset and processes the same events again.
      </p>
      <p>
        If the history rows are keyed by event id and the insert ignores a row that already exists,
        reprocessing is harmless. If the consumer instead increments a counter, such as “number of
        transfers this month”, reprocessing double-counts. The fix that works in general is the
        mirror image of the outbox, sometimes called an inbox: the consumer records the ids of
        processed events, or simply its offset, in its own database, in the same transaction as the
        effect. On restart, it reads its position from its own database rather than from the broker.
        The effect and the record of having done it are atomic, which is the same reasoning as the
        idempotency key in the RPC chapter.
      </p>
      <p>
        Two operational questions follow. The first is how long to remember. A consumer that tracks
        individual event ids needs to keep them for longer than any redelivery could arrive, which
        for a broker that retains a week of data could in principle be a week. Tracking the offset
        per partition avoids that, because the offset alone says which events are done.
      </p>
      <p>
        The second is what to do with an event the consumer cannot process. Suppose a bug in the
        wallet publishes one event with a malformed amount. The history service fails on it, does
        not commit, restarts, and fails on it again. Because the partition is ordered, everything
        behind that event, all of Asha’s later activity and everyone else hashed to that partition,
        waits. Ordered delivery means one bad event can block a partition indefinitely. Consumers
        usually handle this by moving the failing event to a separate dead-letter topic after a few
        attempts and carrying on, which unblocks the partition and breaks the order for that
        account. Which of those is worse is a decision for each consumer: the history service might
        stop and page someone, while analytics skips and logs.
      </p>

      <h3>Per-sender order, and where it stops</h3>
      <p>
        FIFO delivery needs only a sequence number per sender. The receiver keeps, for each sender,
        the next number it expects, and holds back anything that arrives early until the gap is
        filled. A Kafka partition provides this for free: it is a single ordered log, and consumers
        read it in order. If the wallet publishes events keyed by account id, every event for Asha’s
        account lands in the same partition and is consumed in the order the leader committed it.
        The fraud model never sees Asha’s debit before the top-up that funded it.
      </p>
      <p>
        That covers order within an account. A transfer touches two accounts, and Asha’s and Ravi’s
        events may land in different partitions, consumed at different speeds.
      </p>

      <Predict q={<>A reconciliation job reads all partitions and checks, every second, that the sum of all balance changes it has seen equals total top-ups minus total withdrawals. Asha’s events are in partition 4, Ravi’s in partition 9, and the job reads each partition with its own thread. Asha sends Ravi ₹500. What does the job report?</>}>
        <p>
          It depends on which thread is ahead. If partition 9 is ahead, the job sees Ravi’s +₹500
          before Asha’s −₹500 and reports ₹500 created from nothing. If partition 4 is ahead, it
          reports ₹500 destroyed. A moment later both events have been read and the books balance.
        </p>
        <p>
          On a busy system, with thousands of transfers per second crossing partitions, the job will
          almost never see a balanced total, and its alerts become noise that people learn to
          ignore.
        </p>
        <p>
          There are three fixes. Publish one event per transfer, containing both legs, keyed by
          transfer id, so the two halves can never be separated. Or have Ravi’s credit event name
          the debit it depends on, and have the job hold back the credit until it has seen the
          debit. Or check the totals only at positions in every partition that form a consistent
          cut, a set of positions where every event included has all its causes included too.
        </p>
      </Predict>

      <h3>Causal delivery: carrying what you depended on</h3>
      <p>
        The second fix in that answer is causal delivery, and it generalises. Each event carries a
        record of the events it depends on. A receiver delivers an event to its application only
        after delivering everything in that record. For the wallet, Ravi’s credit event says “after
        Asha’s debit, account asha, sequence 4,417”. The history service receives the credit, checks
        whether it has processed Asha’s sequence 4,417, and if not, keeps the credit in a buffer
        until it has.
      </p>
      <p>
        The general version uses the vector clocks from the time chapter. With one entry per
        sender, a receiver delivers a message from sender j when the message’s entry for j is
        exactly one more than the receiver has delivered from j, and every other entry is no greater
        than what the receiver has already delivered. Anything else waits.
      </p>
      <p>
        The costs are the metadata on every event and the hold-back buffer. If Asha’s debit event is
        delayed, perhaps because partition 4’s consumer is slow, Ravi’s credit waits too, and so
        does everything that depends on Ravi’s credit. A lost dependency stalls a whole causal chain
        until it is fetched. In practice, causal delivery is easier to provide for a few explicit
        dependencies, such as a credit naming its debit, than for full vectors over many senders.
      </p>

      <h3>Total order is the consensus problem</h3>
      <p>
        The followers are the strictest listeners. If two followers apply the same transfers in
        different orders, they can disagree about whether Asha’s second debit was allowed. Followers
        need total order: every one of them applies every change in the same sequence.
      </p>
      <p>
        With a healthy leader, total order is cheap. The leader is a single sequencer: it decides
        the order by appending to its log, and everyone else follows the log. The difficulty is
        entirely in failure. When the leader dies, the replacement must agree with everyone on
        exactly which entries the old sequence contained, including those that reached some
        followers and not others, and must never assign a different event to a position someone has
        already acted on.
      </p>
      <p>
        That is the consensus problem in another form. If you have total-order broadcast, you can
        solve consensus: everyone broadcasts a proposal and everyone picks the first one delivered,
        which is the same for all. If you have consensus, you can build total-order broadcast: run
        consensus once per log position to agree on which event goes there. The two problems are
        equivalent, so total order can never be cheaper than consensus once failures are
        included. This is why a Kafka partition, which looks like a simple ordered log, depends on a
        consensus-based controller to decide which replica leads each partition.
      </p>
      <p>
        The wallet’s event partitions show what is at stake. Suppose the producer writes with{' '}
        <code>acks=1</code>, so the partition leader acknowledges an event as soon as it has
        written it locally. The leader acknowledges Asha’s debit event at offset 5,002 and crashes
        before any follower has fetched it. A follower that stopped at offset 5,001 becomes the new
        leader, and the next event for that partition, another user’s top-up, is written at offset
        5,002. Consumers that had already read the old 5,002 before the crash saw a debit there;
        consumers that read after see a top-up. Two consumers disagree about the content of the
        same position in a log that was supposed to be totally ordered. With{' '}
        <code>acks=all</code> and a minimum number of in-sync replicas, an acknowledged event is on
        every replica eligible to become leader, so the new leader’s log contains it, and the
        positions mean the same thing to everyone. The difference between those two settings is the
        difference between a single sequencer and a fault-tolerant one.
      </p>

      <h3>Gossip, for information that may lag</h3>
      <p>
        At the other end of the ladder is information where a few seconds of disagreement is
        harmless: which wallet servers are alive, which feature flags are on, rough load figures for
        each server. Pushing these reliably to every node is more machinery than they need. Gossip
        spreads them the way rumours spread. Every second, each node picks a few random peers and
        exchanges what it knows. A node that hears something new passes it on in the next round.
      </p>
      <p>
        The arithmetic is why it works. If each informed node tells three others per round, the
        number of informed nodes can roughly quadruple each round while most are still uninformed.
        In a cluster of 1,000 nodes, about five rounds reach most of them, since 4⁵ is just over
        1,000, and a few more rounds catch the stragglers that kept picking informed peers. At one
        round per second, a change reaches the whole cluster in roughly ten seconds. Each node sends
        a fixed number of messages per round however large the cluster grows, and there is no
        central node to overload or lose.
      </p>
      <p>
        Gossip is often paired with anti-entropy, a background process in which two replicas compare
        their data and repair differences. Comparing a million keys one by one would be expensive.
        A Merkle tree hashes the keys into a tree of hashes; two replicas compare root hashes, and
        only descend into subtrees whose hashes differ. With a fanout of 16, a million keys fit in
        a tree five levels deep, so finding one differing key means exchanging a few dozen hashes
        instead of a million values.
      </p>
      <p>
        The weakness is in the name. Gossip is probabilistic and eventually consistent, so it must
        never carry information an invariant depends on. Suppose the wallet gossips which server
        owns which shard of accounts. During a handover, some API servers still believe server A owns
        shard 7 when server B now does. That is acceptable only if the receiving server checks
        ownership itself and rejects requests for shards it does not own, so the API can refresh and
        retry. Stale gossip used as a hint is fine; stale gossip used as authority is a split brain
        waiting for a slow round.
      </p>

      <h3>Buying the cheapest sufficient rung</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Guarantee</th><th>Typical mechanism</th><th>What it costs</th><th>Wallet use</th></tr>
          </thead>
          <tbody>
            <tr><td>Best effort</td><td>Fire and forget</td><td>Almost nothing</td><td>Client-side metrics</td></tr>
            <tr><td>Reliable</td><td>Outbox plus a durable log, consumer dedup</td><td>An outbox write per transaction; dedup state</td><td>Notifications</td></tr>
            <tr><td>FIFO per key</td><td>Partition by account id</td><td>Parallelism limited to the number of partitions</td><td>Per-account fraud features</td></tr>
            <tr><td>Causal</td><td>Explicit dependencies, hold-back buffers</td><td>Metadata; a delayed event stalls its dependents</td><td>History, reconciliation</td></tr>
            <tr><td>Total order</td><td>Single leader’s log, replaced by consensus</td><td>Consensus on failover; one sequencer’s throughput</td><td>Followers</td></tr>
            <tr><td>Eventual</td><td>Gossip, anti-entropy</td><td>Seconds of disagreement</td><td>Membership, flags</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Overbuying is a real failure mode, not just a waste. A team that wants analytics to see
        events “in the right order” might put all events through one partition. That gives total
        order and caps the whole pipeline at the throughput of one partition and one consumer. On
        the day volume doubles, analytics falls hours behind, and nothing in the analytics actually
        depended on that order. Underbuying shows up the other way, as the reconciliation alerts
        nobody trusts. Revisit a listener’s rung when its job changes: the day the fraud model starts
        blocking payments instead of scoring them afterwards, its ordering needs change too.
      </p>
      <p>
        We have now seen twice that the hard part of a single leader is replacing it. The next
        chapter, <em>Consensus</em>, is the mechanism for that: how three wallet replicas agree on
        a leader and on a log, so that no acknowledged transfer is lost and no two leaders ever
        accept writes in the same term.
      </p>
      <Notes
        items={[
          'For each listener, ask what a missing event and a reordered event would each cost; the answers pick the guarantee.',
          'Committing and then publishing is a dual write; an outbox in the same transaction gives at-least-once delivery.',
          'Partitioning events by account gives per-account order, but a transfer spans two accounts and two partitions.',
          'Causal delivery holds an event back until its dependencies arrive, so one delayed event can stall a chain.',
          'Total-order broadcast and consensus are equivalent problems; a single leader is cheap until it has to be replaced.',
          'Gossip is fine for hints such as membership, provided whoever acts on a hint checks it at the point of use.',
        ]}
      />
    </>
  ),

  /* ── 06 · Consensus ───────────────────────────────────────────────── */
  consensus: (
    <>
      <p>
        This chapter explains how a group of machines agrees on one answer and keeps it agreed
        while some of them crash. By the end you should be able to trace a leader election and a
        log commit in Raft, say what the group can survive given where its machines are, and explain
        why a deposed leader cannot lose a committed transfer.
      </p>
      <p>
        In the replication chapter, an engineer promoted a follower by hand during a power failure.
        Acknowledged transfers were lost, ids were reused, and when power returned there were two
        leaders. We want the three wallet replicas to make that decision themselves, quickly, and in
        a way that can never produce two leaders at once or forget a transfer that was acknowledged.
      </p>

      <h3>What we are asking the replicas to agree on</h3>
      <p>
        Consensus is the problem of getting several machines to decide on one value, such that all
        of them that decide pick the same value, the value was actually proposed by someone, and
        they eventually decide as long as enough of them are running and can talk. For the wallet
        the value is “who leads in this period”, and then, repeatedly, “which transfer is entry
        number 4,418 in the log”. If every replica agrees on every log entry, they all apply the same
        transfers in the same order, which is the total-order broadcast from the last chapter.
      </p>
      <p>
        Two tempting shortcuts fail, and seeing why tells us what the real protocol must do. The
        first is a fixed coordinator that decides and tells everyone. That is a single point of
        failure; if it crashes mid-decision, nobody knows what was decided. The second is to let any
        replica that thinks the leader is dead declare itself leader. During a partition, each side
        thinks the other is dead, and both declare. We need a rule under which two different leaders
        cannot both be legitimate.
      </p>
      <p>
        The rule all practical protocols use is a majority. Out of three replicas, any two form a
        majority; out of five, any three. Any two majorities of the same group must share at least
        one member, since two disjoint groups of two would need four replicas out of three. If every
        decision requires a majority, and each replica takes part in at most one decision of a given
        kind, two conflicting decisions cannot both happen, because the shared member would have to
        take part in both.
      </p>

      <h3>Where the replicas live decides what they survive</h3>
      <p>
        A majority rule turns placement into arithmetic. Our wallet has two replicas in DC-1 and one
        in DC-2.
      </p>
      <Predict q={<>The three wallet replicas are placed two in DC-1 and one in DC-2. What happens to transfers if (a) one DC-1 machine dies, (b) the link between the data centres is cut, (c) DC-1 loses power entirely?</>}>
        <p>
          (a) The remaining DC-1 machine and the DC-2 machine are two of three, a majority.
          Transfers continue, after an election if the dead machine was the leader.
        </p>
        <p>
          (b) DC-1’s two replicas are still a majority and keep accepting transfers. The DC-2
          replica is alone. It cannot win an election, so it cannot accept writes. Clients in DC-2
          that can reach DC-1 through another path keep working; those that cannot are refused.
        </p>
        <p>
          (c) Only the DC-2 replica is left, one of three. It cannot form a majority, so the wallet
          stops accepting transfers until DC-1 returns. No data is lost, since the DC-1 disks still
          hold the committed log, but the wallet is unavailable.
        </p>
        <p>
          So a 2 + 1 layout across two sites survives the loss of a machine, not of a site. With
          two sites, whichever site holds the majority is a single point of failure. Surviving a
          site loss needs a third site, even if it only holds a lightweight voting replica.
        </p>
      </Predict>
      <p>
        That answer explains a pattern seen in many production deployments: three sites, one
        replica each, or five replicas spread 2 + 2 + 1. With one replica per site, losing any site
        leaves two of three. The cost is latency. A log entry commits when a majority has it, so the
        leader must wait for at least one replica in another site on every commit. If the nearest
        other site is 30 ms away, every transfer takes at least 30 ms to commit. The 2 + 1 layout
        commits in about a millisecond, because the leader and its neighbour in DC-1 form a
        majority, and pays for that speed with the site-loss behaviour above.
      </p>

      <h3>Terms and votes</h3>
      <p>
        We will use Raft, which was designed to be understood and is used in etcd, Consul,
        CockroachDB, TiKV and Kafka’s newer controller. Raft divides time into numbered terms. Each
        term begins with an election and has at most one leader. Every message carries the sender’s
        term, and a replica that sees a higher term than its own adopts it and, if it was leader,
        steps down at once.
      </p>
      <p>
        A leader sends heartbeats to its followers several times per election timeout. A follower
        that hears nothing for its election timeout assumes the leader is gone. It increments its
        term, becomes a candidate, votes for itself and asks the others for votes. Each replica
        grants at most one vote per term and writes that vote to disk before replying, so that a
        crash and restart cannot let it vote twice. A candidate that collects a majority becomes
        leader for that term.
      </p>
      <p>
        That rule is where the majority argument does its work. Two candidates in the same term
        would each need a majority, the majorities would share a replica, and that replica can vote
        only once. So there is at most one leader per term. There can be an old leader from an
        earlier term that has not yet heard about the new one, and we will deal with it shortly.
      </p>
      <p>
        If two followers time out at the same moment, they can split the vote and neither wins.
        Raft makes this unlikely by randomising each follower’s timeout within a range, so one
        usually starts its campaign first and wins before the other wakes up. The Raft paper uses
        150 to 300 ms on a local network. etcd defaults to a 100 ms heartbeat and a 1,000 ms
        election timeout, and recommends raising both when replicas are far apart, since a timeout
        must comfortably exceed the round trip between them. Shorter timeouts mean faster failover
        and more spurious elections when a garbage-collection pause or a slow link is mistaken for
        a death.
      </p>

      <h3>The log, and when an entry counts</h3>
      <p>
        Once elected, the leader accepts transfers. For each one it appends an entry to its log
        and sends it to the followers. An entry is committed once a majority of replicas have
        stored it. Only then does the leader apply it to the balances and reply “Sent” to the
        caller.
      </p>
      <Fig caption="Fig 6 · The leader and one follower hold entries 1–5; the slow follower has 1–3. Entries 1–5 are committed because two of three replicas hold them">
        <ReplicatedLog />
      </Fig>
      <p>
        Followers check that their log matches the leader’s before accepting anything. Each append
        message includes the index and term of the entry just before the new ones. If the follower
        has no entry at that index with that term, it refuses, and the leader retries one entry
        further back until the two logs agree. The follower then discards anything after that point
        and takes the leader’s entries. This is how a follower that had extra, uncommitted entries
        from an old leader gets repaired.
      </p>
      <p>
        One more rule protects committed entries across elections. A replica votes for a candidate
        only if the candidate’s log is at least as up to date as its own: its last entry has a
        higher term, or the same term and an index at least as large. A committed entry is on a
        majority. A winning candidate collected votes from a majority. Those majorities overlap, so
        at least one voter holds the committed entry, and that voter would refuse a candidate
        lacking it. A new leader therefore always has every committed entry, and since leaders never
        delete their own entries, committed transfers are never lost.
      </p>

      <h3>The leader that did not know it was deposed</h3>
      <p>
        Here is the failure the manual failover handled badly, walked through with Raft. The wallet
        replicas are A and B in DC-1 and C in DC-2. A leads in term 4.
      </p>
      <p>
        A’s network link to B and C fails, but A can still reach some of the API servers in its own
        rack. A still believes it leads term 4. B and C stop receiving heartbeats. B’s election
        timeout fires first; it becomes a candidate for term 5, C votes for it, and B leads term 5
        with two of three.
      </p>
      <p>
        Meanwhile, an API server sends Asha’s transfer to A. A appends it as entry 120 in term 4
        and sends it to B and C. Nothing arrives. Entry 120 is on one replica out of three, so it
        never commits. A never applies it and never replies “Sent”. The API server times out, and,
        because the request carries Asha’s idempotency key, safely retries. Its retry reaches B,
        which commits the transfer as entry 120 in term 5 and replies.
      </p>

      <Predict q={<>When A’s network recovers, its log has entry 120 from term 4 (Asha’s transfer, never committed). B’s log has entry 120 from term 5 (the same transfer, committed, from the retry). What happens to A’s entry, and is anything lost or duplicated?</>}>
        <p>
          A receives a message from B carrying term 5, adopts term 5 and steps down to follower. B
          sends entries with the consistency check; A finds that its entry 120 has term 4 where B
          expects term 5, discards it, and takes B’s entry 120.
        </p>
        <p>
          Nothing acknowledged is lost, because A’s entry was never acknowledged. Nothing is
          duplicated, because the retry carried the same idempotency key, and the transfer was
          applied once, through B. The uncommitted entry was always provisional, and Raft is allowed
          to throw provisional entries away.
        </p>
      </Predict>
      <p>
        Writes are safe in this scenario because they must commit through a majority. Reads are not
        automatically safe. If A answers balance reads from its own state while partitioned, it
        returns balances that miss everything B has committed since. Asha could see ₹2,000 on the
        home screen after her transfer committed. To serve a linearizable read, a leader must first
        confirm it is still the leader. One way, called a read index, is to record the current commit
        index, exchange a heartbeat with a majority, and answer once its state has applied up to that
        index; that costs a round trip per read or batch of reads. The other is a leader lease: after
        a successful heartbeat round, the leader assumes nobody else can be elected for slightly
        less than an election timeout, and serves reads locally until then. Lease reads are faster
        and rely on clocks running at roughly the same rate, which the next chapter takes seriously.
      </p>

      <h3>Replacing a replica without creating two majorities</h3>
      <p>
        Machines are replaced routinely: a disk fails, a host is retired, the team moves a replica
        to a new site to survive a site loss. Each change alters the group, and a careless change
        breaks the majority argument that everything else rests on.
      </p>
      <p>
        Suppose the wallet grows from three replicas, A, B and C, to five by adding D and E, and the
        new configuration reaches the replicas at slightly different moments. For a short time, A and
        B may still believe the group is {'{'}A, B, C{'}'}, where two votes make a majority, while
        C, D and E already believe it is {'{'}A, B, C, D, E{'}'}, where three do. A and B can elect a
        leader with two votes under the old rule while C, D and E elect another with three under
        the new one. Two leaders in the same term, each with a valid majority in the configuration
        it believes in.
      </p>
      <p>
        Raft offers two ways out. The original paper uses joint consensus: during the transition,
        every decision needs a majority of the old configuration and a majority of the new one at
        the same time. Only once that joint configuration has itself been committed does the group
        move to the new configuration alone. The simpler approach, used by many implementations,
        changes membership one replica at a time. Adding or removing a single replica means any
        majority of the old group and any majority of the new group must overlap, so there is no
        moment at which two disjoint majorities exist. Growing from three to five takes two steps.
      </p>
      <p>
        A new replica also starts with an empty log. If it joined as a voting member immediately, a
        three-replica group would become four, with a majority of three. The new replica cannot
        acknowledge anything until it has caught up, so every commit would need all three of the
        old replicas. The slowest of them would set commit latency, and a single failure would stop
        writes. Implementations
        therefore add new replicas as non-voting learners first. The learner copies a snapshot of
        the state plus the recent log, and is promoted to a voter once it has caught up.
      </p>
      <p>
        Snapshots matter for a second reason. A log that is never trimmed grows forever, and a
        replica that restarts would have to replay years of transfers. Each replica periodically
        writes a snapshot of its balances at some log index and discards the entries before it. A
        follower that has fallen behind past the trimmed point is sent the snapshot instead of the
        entries. This is routine, and it is also a common source of bugs, because sending a large
        snapshot competes with normal replication for the same network and disk.
      </p>

      <h3>What consensus guarantees, and what it cannot</h3>
      <p>
        Raft’s safety, meaning no two leaders in a term and no lost committed entries, never
        depends on timing. Messages can be delayed arbitrarily and the protocol still never decides
        two different things. Its liveness, meaning that it eventually makes progress, does depend
        on timing: elections need timeouts, and a network that delays messages badly enough can
        cause election after election with no leader lasting long enough to commit anything.
      </p>
      <p>
        This is not a weakness of Raft in particular. A 1985 result by Fischer, Lynch and Paterson
        shows that in a fully asynchronous system, where messages can take any time to arrive, no
        deterministic protocol can guarantee that it always decides if even one process may crash.
        Practical protocols keep safety unconditional and accept that progress requires the network
        to behave reasonably for long enough. In production this appears as a flapping link that
        makes a replica start elections repeatedly, bumping the term and disrupting a healthy
        leader. etcd’s pre-vote option addresses this: a replica first asks whether it would win
        before it increments its term.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Choice</th><th>What it improves</th><th>What the design must also handle</th></tr>
          </thead>
          <tbody>
            <tr><td>3 voters</td><td>Survives 1 failure; commit needs 1 follower</td><td>A second failure stops writes</td></tr>
            <tr><td>5 voters</td><td>Survives 2 failures</td><td>Commit needs 2 followers; more traffic per entry</td></tr>
            <tr><td>4 voters</td><td>Nothing over 3</td><td>Majority is 3, so it still survives only 1 failure</td></tr>
            <tr><td>One voter per site</td><td>Survives losing a site</td><td>Every commit waits for a cross-site round trip</td></tr>
            <tr><td>Majority in one site</td><td>Commit at local-network speed</td><td>That site is a single point of failure for writes</td></tr>
            <tr><td>Batching entries</td><td>Throughput: many transfers per round trip</td><td>A little added latency per entry</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Throughput deserves a word, since “every write needs a majority round trip” sounds slow. The
        leader does not wait for one entry to commit before sending the next. It pipelines entries
        and batches many transfers into each append message and each disk flush. A Raft group in one
        data centre can commit tens of thousands of small entries per second; the limit is usually
        the disk’s flush rate and the network, not the protocol’s rules.
      </p>

      <h3>When not to run consensus yourself</h3>
      <p>
        There are two common ways to apply consensus to the wallet. One is to put every transfer
        through a Raft log, as CockroachDB, TiKV and Spanner do with a consensus group per range of
        keys. The other is to keep an ordinary database with a primary and a synchronous standby,
        and use a separate consensus service only to decide which machine is primary. Tools such as
        Patroni do this for Postgres with etcd. The first gives consensus guarantees on every write.
        The second keeps the familiar database and uses consensus only for the rare leadership
        decision, which is simpler to operate and leaves more of the safety to fencing the old
        primary correctly.
      </p>
      <p>
        Writing your own consensus implementation is rarely the right choice for an application
        team. The protocol fits on a page, and the implementation details (persisting votes before
        replying, snapshotting long logs, changing membership safely, the rule that a leader only
        counts replicas for entries from its own term) have each caused bugs in mature systems.
        Revisit this only if no existing library or service fits your constraints.
      </p>
      <p>
        That second approach, a small consensus service deciding who is primary, raises its own
        question. The service grants leadership to a wallet server. What stops that server from
        acting on a grant that has expired while it was paused? The next chapter,{' '}
        <em>Membership, failure detection and coordination</em>, deals with leases and fencing tokens.
      </p>
      <Notes
        items={[
          'Any two majorities of the same group overlap, which is why majority voting cannot elect two leaders in one term.',
          'With replicas split 2 + 1 across two sites, the wallet survives losing a machine but not the site holding the majority.',
          'A log entry is committed once a majority stores it; the vote rule guarantees every new leader already has it.',
          'An entry on a partitioned old leader never commits, so it can be discarded safely, and idempotency keys make the client’s retry safe.',
          'Writes through a majority are safe during partitions; reads need a read index or a lease to avoid serving stale balances.',
          'Consensus keeps safety regardless of timing, but progress needs a network that behaves well for long enough.',
        ]}
      />
    </>
  ),

  /* ── 07 · Membership, failure detection and coordination ──────────── */
  coordination: (
    <>
      <p>
        This chapter lets you hand out authority in a cluster safely: decide that a machine is
        probably dead, give its work to another, and make sure that if the first machine was only
        paused, it cannot do damage when it wakes. The tools are failure detectors, a small
        coordination service, leases and fencing tokens.
      </p>
      <p>
        The wallet has grown. Accounts are split into 64 shards, and each shard has one primary
        wallet server that processes its transfers. Which server is primary for which shard is
        decided by a coordination service built on consensus, etcd in our case, using the approach
        from the end of the last chapter. Server A is primary for shard 7. Mid-transfer, A’s runtime
        starts a garbage-collection pause that lasts fifteen seconds. Everyone else concludes A is
        dead and gives shard 7 to server B. Then A wakes up and finishes the transfer it was in the
        middle of.
      </p>

      <h3>Deciding that someone is dead</h3>
      <p>
        The first chapter established that a dead machine and a slow one look identical from
        outside. A failure detector therefore cannot report facts. It reports suspicion, and the
        design question is how to make that suspicion accurate enough to act on and fast enough to
        matter.
      </p>
      <p>
        The simplest detector is a heartbeat with a fixed timeout: A sends “I am alive” every
        second, and if five seconds pass without one, A is declared dead. The two numbers trade
        against each other. A five-second threshold mistakes any pause longer than five seconds for
        a death. A thirty-second threshold rarely makes that mistake, but shard 7 stops processing
        transfers for thirty seconds every time a server genuinely dies.
      </p>
      <p>
        Adaptive detectors do better by learning what normal looks like. The phi accrual detector,
        used in Cassandra and Akka, records the intervals between recent heartbeats and, at any
        moment, computes how unlikely the current silence would be if the node were alive. It
        reports that as a number, phi, on a logarithmic scale: a phi of 8 means that under the model
        of recent arrivals, a live node would be this late about one time in a hundred million. On a
        network where heartbeats normally arrive within 2 ms, a 500 ms gap is alarming; on a jittery
        cross-region link, the same gap is routine. A fixed timeout treats both the same.
      </p>
      <p>
        At cluster scale, a different problem appears. If each of 1,000 nodes sends a heartbeat to
        every other node every second, that is about a million messages per second spent on
        knowing who is alive. SWIM, the protocol behind HashiCorp’s memberlist and therefore Consul,
        replaces that with two ideas. Each round, a node pings one random member. If no reply comes,
        it does not conclude anything yet; it asks a few other members to ping the silent node on
        its behalf. Only if none of them get a reply is the node marked suspect, and the suspicion
        is spread by piggybacking it on the pings that are being sent anyway. The indirect probe
        matters because a bad link between two particular machines should not convince the whole
        cluster that one of them is dead. Each node sends a constant number of messages per round
        regardless of cluster size.
      </p>
      <p>
        None of these detectors can be right every time. The design consequence is that anything
        the system does on the basis of “A is dead” must be safe even when A is alive. The rest of
        the chapter is about making that true.
      </p>

      <h3>Put agreement in one small service</h3>
      <p>
        Every wallet server could run Raft with every other to decide shard ownership, but that
        spreads delicate code across the fleet. The common alternative is a small, separate
        coordination service, such as etcd, ZooKeeper or Consul, that runs consensus among three or
        five machines and exposes a few primitives: a strongly consistent key-value store,
        compare-and-set operations, watches that notify clients of changes, and leases or sessions
        that expire if a client stops renewing them.
      </p>
      <p>
        Leader election for a shard is a few lines on top of those primitives. Each server that wants
        shard 7 tries to create the key <code>/wallet/shards/7/primary</code> with its own name,
        attached to its lease, and only if the key does not exist. One succeeds. The others watch
        the key. If the primary’s lease expires, etcd deletes the key, the watchers are notified,
        and they race to create it again.
      </p>
      <p>
        The ZooKeeper paper’s lasting point is about what does not go through this service. Transfers
        go from the API to shard 7’s primary directly. The coordination service sees only lease
        renewals and ownership changes: 64 shards renewing once a second is 64 small writes per
        second, well within what a three-node etcd cluster handles. etcd’s documentation suggests
        keeping its data to a few gigabytes. It is built to hold the small facts everyone must agree
        on, not the data itself.
      </p>

      <h3>A lease is a promise with an expiry</h3>
      <p>
        Ownership must expire. A lock with no expiry, held by a server that has died, leaves shard 7
        unowned forever, or until someone intervenes at 3 a.m. A lease is ownership for a fixed
        period, renewed while the holder is healthy. Say the lease lasts ten seconds and A renews it
        every three.
      </p>
      <p>
        The holder has to reason carefully about its own lease. It should measure the lease from
        the moment it sent the renewal request, not when the reply arrived, because the server may
        have started the lease when it processed the request. It should use the monotonic clock,
        for the reasons in the time chapter. And it should stop acting some margin before ten
        seconds have passed, to allow for clocks that run at slightly different rates. Note what this
        assumes: not that A’s clock and etcd’s clock agree on the time, but that they agree roughly
        on how long ten seconds is. That is a much weaker and more reliable assumption.
      </p>
      <p>
        Leases also explain the leader-lease reads from the consensus chapter. A leader that has
        just heard from a majority knows no other leader can be elected for about an election
        timeout, so for slightly less than that it can serve reads without checking. The same
        reasoning, the same clock-rate assumption, and the same weakness, which is next.
      </p>

      <Predict q={<>A holds the lease for shard 7. It checks the lease (valid, two seconds left), reads Asha’s balance (₹2,000), and is about to write the new balance of ₹1,500 when a 15-second pause begins. During the pause the lease expires, B takes shard 7, and B processes another of Asha’s payments, writing ₹1,200. Then A resumes. What happens, and could A have prevented it by checking its lease again just before writing?</>}>
        <p>
          A resumes exactly where it stopped, unaware that fifteen seconds have passed, and writes
          ₹1,500. B’s write of ₹1,200 is overwritten. Asha has made two payments and been charged for
          one. This is a lost update caused by two servers each believing they own shard 7.
        </p>
        <p>
          Checking again does not help. The pause can happen between the check and the write, no
          matter how close together they are. A process cannot know that it has been paused, and
          cannot make a check and a write on another machine happen as one indivisible step. Any
          protection has to live where the write lands.
        </p>
      </Predict>

      <h3>Fencing tokens: make the storage say no</h3>
      <p>
        The fix is a fencing token. Every time the coordination service grants ownership of shard
        7, it attaches a number that is larger than any it has granted before. In etcd, the revision
        at which the ownership key was created serves; in ZooKeeper, the version or transaction id
        of the node does. A’s grant carried token 33. B’s carries 34.
      </p>
      <p>
        The holder sends its token with every write, and the storage remembers the highest token it
        has seen for the shard. It rejects any write carrying a lower one.
      </p>
      <Fig caption="Fig 7 · A is paused while holding token 33. B gets token 34 and writes. When A wakes and writes with 33, the storage rejects it">
        <FencingToken />
      </Fig>
      <p>
        In a SQL database, the check can be one conditional statement at the start of the
        transaction that writes the balance:
      </p>
      <pre><code>{`BEGIN;
UPDATE shard_fence SET token = 33
  WHERE shard = 7 AND token <= 33;
-- 0 rows updated: someone with a newer token has written. ROLLBACK.
UPDATE accounts SET balance = 1500 WHERE id = 'asha';
COMMIT;`}</code></pre>
      <p>
        When B first writes with 34, the fence moves to 34. When A wakes and tries 33, the condition
        fails, A rolls back, and on seeing the rejection it knows it has lost ownership. The
        protection works no matter how long the pause was or what A believes, because the decision
        is made by the storage, which sees every write in order.
      </p>
      <p>
        The cost is that every system that receives writes must take part. The shard’s database can
        check tokens. The bank’s payout API, which the wallet calls when Asha withdraws to her bank
        account, cannot be asked to. For those, the idempotency key from the RPC chapter is the
        defence: if A wakes and resends a payout that B already sent, the bank sees the same key
        and returns the earlier result. Where neither fencing nor idempotency is possible, such as
        an SMS provider without keys, a duplicate is possible and the design should make it
        harmless.
      </p>
      <Callout>
        Authority that the storage cannot check is only a hint. A lease tells a server it probably
        owns a shard; a fencing token lets the storage enforce that it actually does.
      </Callout>

      <h3>Two kinds of lock</h3>
      <p>
        Not every lock needs fencing, and the distinction saves real effort. Martin Kleppmann draws
        it clearly in his essay on distributed locking: some locks exist for efficiency, others for
        correctness.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Purpose</th><th>Example in the wallet</th><th>If two holders act at once</th><th>What is enough</th></tr>
          </thead>
          <tbody>
            <tr><td>Efficiency</td><td>Only one server builds the nightly statement PDFs</td><td>Some statements are built twice; wasted CPU</td><td>A lease, even an approximate one</td></tr>
            <tr><td>Correctness</td><td>Only one server writes shard 7’s balances</td><td>Lost updates, wrong balances</td><td>A lease plus fencing at the storage</td></tr>
            <tr><td>External effect</td><td>Only one server sends a given bank payout</td><td>Money sent twice</td><td>Idempotency keys at the receiver</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Locks built on a cache with expiry, such as a key in Redis with a timeout, are reasonable for
        the first row and dangerous for the second, because nothing downstream checks them. The
        question to ask of any lock is what happens if two processes hold it at the same moment. If
        the answer involves money, the lock alone is not the protection.
      </p>

      <h3>How long should a lease be?</h3>
      <p>
        The lease length sets two numbers that pull against each other. When A genuinely dies, shard
        7 is unowned until A’s lease expires. If A renewed just before dying, that is the full ten
        seconds, plus the time for B to notice, acquire the key and load whatever state it needs.
        Shard 7’s users see roughly ten to twelve seconds in which transfers fail or wait.
      </p>
      <p>
        A two-second lease would cut that to two or three seconds. It would also mean that any
        pause, network hiccup or slow renewal longer than two seconds costs A its ownership,
        whether or not A was in trouble. Each unnecessary handover has its own cost: transfers in
        flight on A are rejected by the fence and retried, B starts with cold caches, and if the
        cause was a slow network rather than a slow A, B may lose the lease in turn. Renewal traffic
        is rarely the constraint; 64 shards renewing every 600 ms is about a hundred small writes per
        second.
      </p>
      <p>
        The sensible way to choose is from measurements. Look at the longest pauses the wallet
        servers actually experience, from garbage collection, from the hypervisor, from disk
        stalls, and at the latency distribution of renewals to the coordination service. Set the
        lease comfortably above the worst of those, and then ask whether the resulting failover time
        is acceptable for a shard. If it is not, the remedy is usually to shorten the pauses, for
        example by tuning the runtime, rather than to shorten the lease below them.
      </p>

      <h3>When the coordination service is the outage</h3>
      <p>
        Moving agreement into one small service concentrates a risk, and it is worth walking
        through how it materialises.
      </p>
      <p>
        etcd commits every write to disk before acknowledging it, so its latency follows its disk’s
        flush latency; its documentation is emphatic about giving it fast, dedicated storage. Suppose
        the etcd machines share storage with a noisy neighbour, as the wallet did in the first
        chapter, and flushes slow from milliseconds to seconds. Lease renewals from the wallet
        servers begin to time out. Nothing is wrong with any wallet server, but within one lease
        period, every primary has failed to renew. Correctly, each one stops processing transfers
        for its shard, because it can no longer prove it is the owner.
      </p>
      <p>
        Then every server tries to acquire the now-free shards, which means 64 contested writes to
        an etcd that is already too slow to handle renewals. Some acquisitions succeed, some time
        out, some servers win shards and lose them again at the next renewal. For several minutes,
        the wallet processes almost no transfers, although no wallet server and no wallet database
        failed. The coordination service is not on the data path, but it is on the availability
        path.
      </p>
      <p>
        The mitigations each cost something. Dedicated fast disks for etcd cost money. A separate
        etcd cluster for the wallet, rather than one shared with the rest of the company, costs
        operational effort, and buys isolation from other teams’ load. Leases somewhat longer than
        etcd’s worst plausible hiccup cost slower failover. Spreading the start times of renewals,
        and backing off acquisition attempts with jitter, keeps a recovery from becoming a stampede.
        What should not change is the primaries’ behaviour: a server that cannot renew its lease
        must stop, because continuing would bring back exactly the split ownership the lease exists
        to prevent.
      </p>

      <h3>Coordination you can design away</h3>
      <p>
        The cheapest coordination is the kind the design makes unnecessary. Assigning each account
        to exactly one shard, with one owner, means transfers within a shard need no distributed
        locks at all: the owner orders them in its own log. If each shard is itself a Raft group,
        Raft’s term number already acts as a fencing token, since a follower rejects appends from a
        leader with an older term, and the storage layer and the consensus layer are the same thing.
      </p>
      <p>
        The coordination service is also easy to misuse. It is not a database, so wallet data does
        not belong in it. It is not a queue, so using watches as a work queue for every transfer
        puts the data path back through consensus. And it is shared, so a burst of writes from one
        team’s misbehaving client can slow lease renewals for everyone, causing leases to expire
        across the fleet. Revisit the setup if lease renewals start to approach the service’s write
        capacity, or if ownership changes often enough that the time spent moving shards becomes
        visible to users.
      </p>
      <p>
        Every transfer so far has stayed within one shard. Asha and Ravi, however, are on different
        shards with different owners, and a transfer between them has to debit one and credit the
        other atomically. The next chapter, <em>Distributed transactions</em>, looks at the ways to
        do that and what each one costs.
      </p>
      <Notes
        items={[
          'A failure detector reports suspicion, so every action taken on “A is dead” must be safe if A is alive.',
          'SWIM’s indirect probes stop one bad link from convincing the cluster that a healthy node has died.',
          'A coordination service should hold small agreed facts such as ownership; transfers should never pass through it.',
          'A lease assumes clocks agree on how long ten seconds is, not on what time it is.',
          'A paused process cannot protect itself by checking its lease again; only the storage can reject its stale writes.',
          'Fencing tokens protect systems that can check them; idempotency keys protect the ones that cannot.',
        ]}
      />
    </>
  ),

  /* ── 08 · Distributed transactions ────────────────────────────────── */
  txns: (
    <>
      <p>
        This chapter lets you keep a transfer correct when the two accounts it touches live on
        different machines. You should come away able to trace two-phase commit and say exactly
        where it blocks, design a saga whose in-between states are honest, and choose between them
        from the invariant you need rather than from habit.
      </p>
      <p>
        Asha’s account is on shard 3 and Ravi’s is on shard 11. Each shard has its own primary,
        its own database and its own log. On one machine, the transfer was a single transaction
        that debited one row and credited another. Now no single database sees both rows. Asha
        sends Ravi ₹500, and we need the debit and the credit to happen together or not at all.
      </p>

      <h3>Say what must remain true</h3>
      <p>
        Before choosing a protocol, write down the invariants. For the wallet there are four. Money
        is conserved: the total across all accounts, plus anything explicitly in transit, never
        changes because of a transfer. No balance goes below zero. Each transfer is applied exactly
        once. And a fourth, which is a choice rather than a law: whether anyone may observe the
        moment when the money has left Asha and not yet reached Ravi.
      </p>
      <p>
        The naive approach shows why the list matters. The transfer service debits Asha on shard 3,
        commits, then calls shard 11 to credit Ravi. If the service crashes between those steps, ₹500
        has left Asha and arrived nowhere. Conservation is broken, and nothing in the system records
        that a credit is owed. If the credit call times out, we are back in the first chapter: the
        credit may or may not have happened.
      </p>
      <p>
        There are two broad responses. One makes both shards commit atomically, so the in-between
        state is never visible. The other accepts the in-between state and makes it an explicit,
        recorded state that the system knows how to finish. Two-phase commit is the first; sagas are
        the second.
      </p>

      <h3>Two-phase commit, step by step</h3>
      <p>
        Two-phase commit has a coordinator, here the transfer service, and participants, here the
        two shards. It runs as follows.
      </p>
      <p>
        The coordinator writes a transaction record and sends <em>prepare</em> to both shards.
        Shard 3 checks that Asha has at least ₹500, locks her row, writes the pending debit and a
        prepare record durably to its log, and votes yes. By voting yes, it promises that it can
        commit no matter what happens next, including its own crash and restart. Shard 11 does the
        same for Ravi’s credit. If either votes no, or does not answer, the coordinator decides to
        abort.
      </p>
      <p>
        If both vote yes, the coordinator writes its decision, commit, durably to its own log. That
        write is the moment the transaction commits. It then sends <em>commit</em> to both shards,
        which apply their changes and release their locks. If a shard does not acknowledge, the
        coordinator keeps resending until it does.
      </p>
      <Fig caption="Fig 8 · Both shards have voted yes and hold their locks. The coordinator crashes before recording a decision, and neither shard can decide alone">
        <TwoPhaseDoubt />
      </Fig>

      <Predict q={<>The coordinator crashes after both shards vote yes and before it writes its decision. Asha immediately tries to pay a shop from her account on shard 3. What happens to that payment, and what can shard 3 do about the stuck transfer?</>}>
        <p>
          Shard 3 holds the lock on Asha’s row, so her new payment waits behind it, and eventually
          times out.
        </p>
        <p>
          Shard 3 cannot abort on its own, because the coordinator might have recorded commit and
          told shard 11, which would then have credited Ravi with money Asha never paid. It cannot
          commit on its own either, because the coordinator might have decided to abort, for
          example if shard 11’s yes vote never arrived. Asking shard 11 helps only if shard 11 has
          heard the decision; if it is also waiting, neither knows more than the other.
        </p>
        <p>
          So shard 3 waits, holding the lock, until the coordinator recovers and reads its log. If
          the coordinator’s disk is lost, a human decides. A participant that has voted yes is in
          doubt, and the protocol gives it no way out. One machine’s failure has frozen an account on
          another.
        </p>
      </Predict>

      <h3>What two-phase commit costs on a busy account</h3>
      <p>
        The blocking case is rare. The everyday cost is lock duration. Each participant holds its
        lock from prepare until it hears the decision: at least two round trips plus the forced
        log writes at every step. Inside one data centre, that might total around 5 ms.
      </p>
      <p>
        For Asha, 5 ms is invisible. For a busy merchant receiving payments from thousands of users,
        it sets a ceiling. Every payment to the merchant locks the merchant’s row for the duration
        of its two-phase commit, and payments to that row are processed one at a time. At 5 ms per
        transaction, the merchant can receive at most about 200 payments per second (1,000 ms ÷ 5
        ms), however many machines we add. If each participant is itself a replicated group across
        two data centres, as our shards are, each prepare and each commit must be replicated
        before it counts, adding about 30 ms each. The lock is held for something like 65 ms, and
        the ceiling drops to roughly 15 payments per second.
      </p>
      <p>
        That ceiling has nothing to do with total system capacity. It is a property of one hot row.
        The usual mitigation is to split the merchant’s balance across several sub-accounts and
        spread incoming payments over them, which raises the ceiling at the cost of a more
        complicated balance read.
      </p>

      <h3>Making the coordinator impossible to lose</h3>
      <p>
        The blocking problem comes from the coordinator being a single machine whose decision might
        be unavailable. Two well-known designs remove that.
      </p>
      <p>
        Google’s Spanner makes every participant and the coordinator a Paxos group, a replicated
        state machine of the kind from the consensus chapter. The coordinator’s decision is not on
        one disk; it is committed in a replicated log. If the coordinator’s leader crashes, its group
        elects another leader that has the decision. The participants still wait, but they wait for
        an election measured in seconds, not for a human. Atomic commit is still two-phase; it is
        just run between groups that do not disappear.
      </p>
      <p>
        Google’s Percolator, built on Bigtable, removes the coordinator process altogether. Each
        transaction picks one of its rows as the primary. In the first phase, it writes a lock on
        every row it touches, and every lock points to the primary. The commit point is a single-row
        write that replaces the primary’s lock with a commit record, and single-row writes in
        Bigtable are atomic. If the client crashes, any later reader that finds a stale lock on
        Ravi’s row follows the pointer to the primary. If the primary has committed, the reader rolls
        the transaction forward; if the primary’s lock is still there and has timed out, it rolls
        the transaction back. The decision lives in the data, so any survivor can finish the work.
        CockroachDB and TiDB use descendants of this idea.
      </p>
      <p>
        Both designs keep atomicity and remove the indefinite block. Neither removes the lock
        duration, and both still need a way to order transactions, which Spanner gets from its
        clocks and Percolator from a central timestamp service.
      </p>

      <h3>Sagas: a transfer as a sequence of honest states</h3>
      <p>
        The other approach gives up atomic visibility and makes the in-between state part of the
        design. A saga is a sequence of local transactions, each on one shard, with a compensating
        action for each step that can undo its effect if a later step fails.
      </p>
      <p>
        For the transfer, the trick that makes it honest comes from double-entry bookkeeping. Each
        shard has an internal account for money in transit. Step one runs on shard 3 as one local
        transaction: debit Asha ₹500, credit shard 3’s in-transit account ₹500, record the transfer
        with status <code>debited</code>, and write an outbox event. Conservation holds after this
        step, because the ₹500 sits in a named account, not in a gap.
      </p>
      <p>
        Step two runs on shard 11, driven by that event: credit Ravi ₹500, record that transfer
        t-9001 has been credited, and emit an event. The credit is keyed by the transfer id, so if
        the event is delivered twice, the second delivery finds the record and does nothing. Step
        three, back on shard 3, moves the ₹500 out of the in-transit account and marks the transfer
        complete.
      </p>
      <p>
        If shard 11 refuses the credit, perhaps because Ravi’s account has been closed, the saga
        compensates. Shard 3 moves ₹500 from the in-transit account back to Asha and marks the
        transfer refunded. The compensation is also keyed by transfer id, so it too can be retried
        safely. Between the steps, Asha sees ₹1,500 and a transfer marked pending; Ravi sees nothing
        yet, or the same transfer as incoming. Every state is true, and the app can show it.
      </p>
      <p>
        The weakness is that compensation is not rollback. A rollback makes it as if the step never
        happened. A compensation is a new action that happens later, after others may have seen and
        acted on the earlier state. Here is how that goes wrong. Suppose the team adds a fraud check
        as a step after the credit. Asha pays Ravi, step two credits him, and Ravi immediately
        spends the ₹500 at a shop. Then the fraud check flags the transfer, and the saga tries to
        compensate by debiting Ravi. His balance is zero. The compensation fails, and the money has
        left the system.
      </p>
      <p>
        The fix is to order the steps so that anything that might fail or be refused comes before
        anything that cannot be undone. The fraud check runs before the credit, while the money is
        still in shard 3’s in-transit account and can be returned cleanly. The step after which the
        saga can only move forward, here the credit to Ravi, should be as late as possible, and
        every step after it must be one that can always eventually succeed by retrying. The cost is
        latency, since the check now sits before Ravi gets his money, and the discipline of
        reviewing step order whenever someone adds a step.
      </p>

      <h3>Keeping a saga moving when nobody is watching</h3>
      <p>
        A saga is a sequence of steps spread over time, so something has to remember where each
        transfer is and push it forward after failures. In the wallet, that memory is the transfer
        record on shard 3, with its status: <code>debited</code>, <code>credited</code>,{' '}
        <code>complete</code>, <code>refunding</code>, <code>refunded</code>. Each step updates the
        status in the same local transaction as its effect, and each status change writes an outbox
        event that triggers the next step.
      </p>
      <p>
        Events can be delayed, lost by a buggy consumer, or stuck behind a poison event in a
        partition. So the wallet also runs a sweeper: a periodic job that looks for transfers whose
        status has not changed for longer than expected, say two minutes in <code>debited</code>,
        and re-emits the event for the next step. Because every step is keyed by transfer id, a
        re-emitted event for a step that already happened does nothing. The sweeper is what turns
        “at least once, eventually” into a bound that can be monitored: the number of transfers
        older than two minutes and not yet finished should be close to zero, and an alert should
        fire when it is not.
      </p>
      <p>
        The sweeper also needs a rule for transfers that cannot finish. If shard 11 has been
        unreachable for an hour, retrying the credit every two minutes achieves nothing, and Asha
        has been looking at a pending transfer all that time. It is tempting, after some
        limit, to refund Asha and move on. That is unsafe. A credit event may still be sitting in a
        queue, and if shard 11 comes back and processes it, Ravi is credited and Asha refunded: ₹500
        created from nothing. This race between two branches of the same saga is exactly the kind of
        interleaving the last chapter’s model checking is good at finding.
      </p>
      <p>
        The safe version cancels on the far side first. The saga asks shard 11 to record that
        transfer t-9001 is cancelled, as a row keyed by the transfer id. Any credit for t-9001 that
        arrives later finds that row and is refused. Only once shard 11 has acknowledged the
        cancellation does shard 3 refund Asha. The uncomfortable consequence is that while shard 11
        is unreachable, the transfer can be neither completed nor refunded; it stays pending, and the
        best the app can do is tell both users that it is delayed. The saga has not escaped the
        first chapter’s ambiguity. It has only made the ambiguity visible and given it a name.
      </p>
      <p>
        Finally, sagas weaken isolation in a way that is easy to miss. While a transfer sits in{' '}
        <code>debited</code>, a reader who sums Asha’s and Ravi’s balances sees ₹500 less than
        before. Anything that reads across shards, such as a family-account view or the
        reconciliation job, must know to include in-transit accounts, or it will report money
        missing that is merely moving.
      </p>

      <h3>Choosing between them</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Approach</th><th>In-between state visible?</th><th>On coordinator failure</th><th>What the design must also handle</th></tr>
          </thead>
          <tbody>
            <tr><td>Classic 2PC</td><td>No</td><td>Participants block, holding locks</td><td>Coordinator recovery; hot-row throughput ceilings</td></tr>
            <tr><td>2PC over consensus groups</td><td>No</td><td>Wait for an election</td><td>Replication latency inside lock hold time</td></tr>
            <tr><td>Percolator-style</td><td>No</td><td>Any reader resolves from the primary</td><td>A timestamp source; stale locks found lazily</td></tr>
            <tr><td>Saga with in-transit accounts</td><td>Yes, as explicit pending states</td><td>Saga resumes from its last recorded step</td><td>Compensations, step order, idempotent steps</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The choice comes down to one question: can the in-between state be made honest? “₹500 in
        transit, transfer pending” is a state a user understands and a ledger can account for, so a
        saga fits a wallet well, and many payment systems are built this way. A seat on a flight
        sold to two passengers, or a stock trade where one side settled and the other did not, may
        have no acceptable in-between state, and then atomic commit is worth its locks.
      </p>
      <p>
        If you choose a distributed SQL database such as Spanner or CockroachDB, it runs atomic
        commit for you, and the question becomes whether its latency and hot-row behaviour fit your
        workload. If you build on separate databases per shard, sagas are usually the practical
        choice, because classic two-phase commit across independently operated databases inherits
        the blocking problem in its worst form.
      </p>

      <h3>When to avoid the question</h3>
      <p>
        The cheapest distributed transaction is the one the data layout makes unnecessary. A
        merchant’s orders, refunds and balance can usually live on the same shard, keyed by
        merchant, so that the operations touching them are local transactions. Transfers between
        arbitrary users cannot be co-located that way, which is why the wallet needs one of the
        designs above at all.
      </p>
      <p>
        Revisit the decision when the proportion of cross-shard operations changes. If a resharding
        puts most related accounts together, a saga’s pending states may become rare enough that
        users never notice them. If a regulator requires that no observer ever see money in
        transit, the saga’s honest in-between state is no longer allowed, and atomic commit becomes
        a requirement rather than a preference.
      </p>
      <p>
        We now have the full set of pieces: idempotent RPCs, ordering without clocks, replication,
        event delivery, consensus, leases with fencing and cross-shard transactions. The next
        chapter, <em>Systems that shipped</em>, reads Dynamo, Spanner, Kafka and etcd as sets of
        choices among these pieces, and asks what our wallet would get from building on each.
      </p>
      <Notes
        items={[
          'Write down the invariants first: conservation, no negative balance, exactly-once effect, and whether the in-between state may be seen.',
          'In two-phase commit, a participant that has voted yes cannot commit or abort on its own until it learns the decision.',
          'Lock hold time in two-phase commit caps the throughput of a single hot row, regardless of cluster size.',
          'Replicating the coordinator’s decision (Spanner) or storing it in the data (Percolator) removes the indefinite block but not the locks.',
          'A saga stays honest when the in-between state is an explicit account and every step and compensation is idempotent.',
          'Put steps that can be refused before the step that cannot be undone; compensation is a new action, not a rollback.',
        ]}
      />
    </>
  ),

  /* ── 09 · Systems that shipped ────────────────────────────────────── */
  shipped: (
    <>
      <p>
        This chapter lets you read a well-known distributed system as a set of decisions, each
        made for a particular workload, and judge whether those decisions fit yours. We will read
        Dynamo, Spanner, Kafka and etcd, with a short look at MapReduce, and for each one ask what
        the wallet would get if we built on it.
      </p>
      <p>
        Every system in this chapter uses ideas from the previous eight. None of them uses all of
        them, and the ones each leaves out are as informative as the ones it adopts. A useful way
        to read any such paper or design document is to answer five questions in the margin: what
        failures does it assume, where does order come from, what is a read promised, what happens
        during a partition, and what did it make cheap at whose expense?
      </p>

      <h3>Dynamo: never refuse a write</h3>
      <p>
        Amazon’s 2007 Dynamo paper describes the store behind the shopping cart and similar
        services. Its requirement is stated plainly: a customer must always be able to add an item
        to the cart, even when servers are failing or the network is partitioned. The paper also
        sets latency targets at the 99.9th percentile, a choice that pushes every design decision
        towards avoiding waits on slow nodes.
      </p>
      <p>
        Data is spread across nodes using consistent hashing. Keys and nodes are both hashed onto
        a ring, and each key belongs to the next few nodes clockwise. The point is what happens when
        the cluster changes. With the simpler rule of “node = hash mod N”, growing from 10 nodes to
        11 keeps a key in place only when its hash gives the same remainder for both, which is true
        for about 1 key in 11. The other 91 percent of the data moves. On a ring, the new node takes
        over only the arcs next to its positions, about one eleventh of the keys. Each physical node
        holds many positions on the ring, called virtual nodes, so that load and data spread evenly.
      </p>
      <p>
        Writes go to N replicas with the quorum rules from the replication chapter. When some of
        the intended replicas are unreachable, Dynamo writes to other healthy nodes instead and
        records a hint saying where the data really belongs; those nodes hand it back when the
        intended replicas recover. This sloppy quorum keeps writes available and gives up the
        overlap guarantee while it is in use. Concurrent versions are tracked with vector clocks,
        and when a read finds several, it returns them all and the application merges them. For the
        cart, the merge is the union of items, which occasionally makes a deleted item reappear.
        Amazon judged that a fair price for never losing an addition.
      </p>

      <Predict q={<>Suppose we stored wallet balances in a Dynamo-style store. Asha has ₹1,000. During a partition, she pays a shop ₹800 from her phone, which reaches replicas on one side, and a scheduled bill payment of ₹800 runs against replicas on the other side. Both succeed. When the partition heals, the store presents two versions. What should the merge produce?</>}>
        <p>
          The two versions both say ₹200, each having seen one debit and not the other. A merge
          that picks either one loses ₹800. A merge that replays both debits gives −₹600, which is
          the true outcome and violates the rule that balances never go negative.
        </p>
        <p>
          No merge can fix this, because the damage is not in the data. Both payments were approved
          and both recipients have been paid. The decision to allow each debit needed to see the
          other, and a design that never refuses a write cannot provide that.
        </p>
        <p>
          The cart’s invariant, “do not lose items”, survives concurrent writes; it is preserved by
          taking the union. The wallet’s invariant, “do not overspend”, does not. That difference,
          not the scale or the technology, decides whether Dynamo’s design fits.
        </p>
      </Predict>
      <p>
        One point of confusion is worth clearing up. Amazon DynamoDB, the managed service, is a
        different design from the 2007 paper. Its 2022 USENIX paper describes partitions that each
        elect a leader using Multi-Paxos, with optional strongly consistent reads and transactions.
        The name carried over; much of the architecture did not.
      </p>

      <h3>Spanner: paying for real time</h3>
      <p>
        Google’s Spanner, described in a 2012 paper, makes the opposite choice. It offers
        transactions across shards and data centres, and a guarantee called external consistency:
        if transaction T1 commits before T2 starts, by real time anywhere in the world, T2 gets a
        larger timestamp and sees T1’s effects. The time chapter argued that ordinary clocks cannot
        support that. Spanner agrees, and changes the clocks.
      </p>
      <p>
        Its TrueTime API returns not a time but an interval, earliest and latest, guaranteed to
        contain the true time. GPS receivers and atomic clocks in each data centre keep the
        interval narrow; the paper reports an uncertainty that varies between about 1 and 7 ms. When
        a transaction commits, Spanner picks a timestamp at least as late as the current interval’s
        latest bound, then waits until TrueTime’s earliest bound has passed that timestamp before
        making the writes visible. After the wait, the timestamp is certainly in the past, so any
        transaction that starts later, anywhere, gets a larger one. This commit wait is a few
        milliseconds on average, and it largely overlaps with the time spent replicating the commit.
      </p>
      <p>
        Underneath, each shard is a Paxos group, and transactions across shards use two-phase
        commit between groups, the design from the last chapter that does not block on a single
        coordinator. Because timestamps match real order, a read-only transaction can pick a
        timestamp and read a consistent snapshot of every shard without taking any locks.
      </p>
      <p>
        A worked example makes the commit wait concrete. A transfer is ready to commit, and
        TrueTime reports that the current time lies between 10:00:00.000 and 10:00:00.008, an
        uncertainty of 4 ms either side of the midpoint. Spanner assigns the commit timestamp
        10:00:00.008, the latest possible current time, so no clock anywhere can yet have passed it.
        It then waits until TrueTime’s earliest bound is later than 10:00:00.008, which with the
        same uncertainty takes about 8 ms. Only then does it release locks and report success.
        Any transaction that starts after that moment, in any data centre, will see a TrueTime
        interval whose latest bound is after 10:00:00.008, and will be given a later timestamp.
        Meanwhile, the commit has been replicating through Paxos, which across data centres takes
        tens of milliseconds, so the 8 ms wait is usually hidden inside time the transaction was
        spending anyway. The cost of the guarantee scales with the clock uncertainty, which is why
        Google invested in making it small.
      </p>
      <p>
        For the wallet, this is a close fit. Cross-shard transfers become real transactions with no
        pending states. A monthly statement becomes a snapshot read at one timestamp, consistent
        across every shard. The costs are commit latency, which includes Paxos replication across
        whatever distance the replicas span plus the commit wait, the hot-row ceiling from two-phase
        commit, and dependence on a managed service, since the clock hardware is not something most
        teams can build. CockroachDB offers a similar model on ordinary clocks by assuming a maximum
        clock offset and, when two timestamps are too close to order safely, restarting the read at
        a later timestamp.
      </p>

      <h3>Kafka: order by partition, durability by in-sync replicas</h3>
      <p>
        Kafka is the system the wallet’s outbox events most likely flow through. Each topic is split
        into partitions; each partition is an ordered log with one leader and several followers.
        Producers write to the leader; followers fetch from it. Order is per partition, which is
        why the broadcast chapter keyed events by account id.
      </p>
      <p>
        Durability is controlled by the in-sync replica set: the followers that have kept up with
        the leader within a configured time. A producer that sets <code>acks=all</code> gets an
        acknowledgement only when every in-sync replica has the record. Combined with a replication
        factor of 3 and <code>min.insync.replicas=2</code>, a write is refused if fewer than two
        replicas are in sync, which is the replication chapter’s choice of refusing writes rather
        than risking their loss. If every in-sync replica is lost, Kafka can either wait for one to
        return or elect an out-of-date replica and lose records; the setting for the second option,
        unclean leader election, has been off by default for years, for the reasons in that
        chapter.
      </p>
      <p>
        Kafka’s idempotent producer is the RPC chapter’s idempotency key in another form. Each
        producer gets an id, numbers its records per partition, and the broker discards a record
        whose sequence number it has already written. A producer retry after a lost acknowledgement
        no longer creates a duplicate. Kafka transactions extend this to writes across partitions
        together with the consumer’s position, which gives exactly-once processing as long as both
        input and output are Kafka topics. When a consumer’s effect is outside Kafka, such as Ravi’s
        push notification, duplicates are again the consumer’s problem, solved with event ids.
      </p>
      <p>
        Deciding which replica leads each partition is consensus. Kafka originally delegated it to
        ZooKeeper and now uses its own Raft-based controller, KRaft; recent major versions have
        removed the ZooKeeper option. The simple-looking partition log rests on the equivalence
        between total order and consensus from the broadcast chapter.
      </p>

      <h3>etcd: a small Raft for everyone’s control plane</h3>
      <p>
        etcd is the coordination service from the last chapter, and the data store behind
        Kubernetes. It is a Raft group, usually of three or five members, holding a key-value store.
        Every change increments a single cluster-wide revision number. That number does two jobs the
        wallet needs. It is a fencing token, since the revision at which a server acquired shard 7
        is larger than any earlier acquisition. And it makes watches reliable: a client can ask for
        every change since revision 81,200, so a watcher that disconnects and reconnects misses
        nothing.
      </p>
      <p>
        Reads are linearizable by default, using the read-index check from the consensus chapter,
        and can be made serializable, answered locally by any member and possibly stale, when a
        client prefers speed. Leases attach a time limit to keys, which is how ownership expires.
        All of this is designed for small amounts of data that change modestly and are read often.
        etcd clusters get into trouble when they are used as a general database: large values,
        millions of keys, or thousands of clients each watching broad key ranges. Its documentation
        sets a default storage quota of a couple of gigabytes for this reason.
      </p>

      <h3>MapReduce: making failure cheap by making work repeatable</h3>
      <p>
        Google’s 2004 MapReduce paper is about computation, not storage, but its approach to failure
        applies directly to a job the wallet runs every night: reconciliation. Read every ledger
        entry, group by account, sum, and compare the result with each stored balance.
      </p>
      <p>
        A MapReduce job expresses this as a map function that turns each ledger entry into an
        (account, amount) pair, and a reduce function that sums each account’s amounts. The
        framework splits the input into thousands of tasks across many machines. When a machine
        dies, its tasks simply run again elsewhere. When a machine is merely slow, the framework
        starts a backup copy of its remaining tasks near the end of the job and uses whichever
        finishes first. Both are safe for the same reason: the functions have no side effects and
        each task’s output becomes visible in one atomic step, by renaming a finished file. Running
        a task twice is harmless, so the framework never needs to know whether the first attempt
        succeeded. It is the first chapter’s ambiguity, removed by making the work idempotent.
      </p>

      <h3>What changed after these systems met production</h3>
      <p>
        Papers describe a system at one moment. The more instructive record is how designs changed
        afterwards, because those changes show which costs turned out larger than expected.
      </p>
      <p>
        The clearest trend is a move towards a leader per partition, chosen by consensus. DynamoDB
        replaced the 2007 paper’s leaderless writes with a Multi-Paxos leader for each partition.
        Cassandra, which inherited Dynamo’s leaderless design, added lightweight transactions that
        run Paxos when a write needs a compare-and-set, such as “create this user name only if
        nobody has it”. MongoDB moved its replication to a protocol modelled on Raft. Kafka
        replaced its dependence on ZooKeeper with its own Raft-based controller.
      </p>
      <p>
        The reasons are visible in the earlier chapters. Leaderless designs push conflict handling
        onto every application that reads the data, and merge logic is easy to get subtly wrong;
        the cart’s reappearing items were tolerable, most other data is less forgiving. Meanwhile,
        consensus implementations matured, and networks inside a region became reliable enough that
        the availability given up by having a leader is a few seconds of failover now and then. For
        most workloads within a region, that trade favours the leader: simpler reasoning for every
        reader, at the cost of short pauses during elections.
      </p>
      <p>
        The trade still goes the other way in some places. Across regions, where round trips are
        tens to hundreds of milliseconds and links fail more often, waiting for a remote majority
        on every write is expensive, and many systems replicate asynchronously between regions and
        resolve conflicts afterwards. Data with a natural merge, such as counters, sets and
        collaborative documents, still suits merge-based replication well.
      </p>
      <p>
        The second trend is the separation of control and data that the coordination chapter
        argued for. Kafka keeps metadata in a small Raft log and leaves the records themselves in
        partition logs. Kubernetes keeps cluster state in etcd and leaves application data
        elsewhere. Spanner places a consensus group per shard rather than one for the whole
        database. In each case, the expensive agreement is applied to the smallest thing that needs
        it.
      </p>

      <h3>Reading them side by side</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>System</th><th>What it sells</th><th>Order comes from</th><th>In a partition</th><th>Fit for the wallet</th></tr>
          </thead>
          <tbody>
            <tr><td>Dynamo (2007)</td><td>Writes always accepted</td><td>Vector clocks; app merges</td><td>Both sides accept writes</td><td>Carts and preferences, not balances</td></tr>
            <tr><td>Spanner</td><td>Transactions in real-time order, globally</td><td>TrueTime timestamps over Paxos logs</td><td>Minority side cannot write</td><td>Balances and cross-shard transfers</td></tr>
            <tr><td>Kafka</td><td>Durable ordered logs at high throughput</td><td>Partition leader; controller by Raft</td><td>Refuses writes below min in-sync replicas</td><td>Balance-change events</td></tr>
            <tr><td>etcd</td><td>Small, linearizable, watchable state</td><td>Raft log and revision numbers</td><td>Minority side cannot write</td><td>Shard ownership and fencing</td></tr>
            <tr><td>MapReduce</td><td>Large batch jobs that survive failures</td><td>Not needed; tasks are independent</td><td>Rerun affected tasks</td><td>Nightly reconciliation</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        A real wallet ends up combining several of these. Balances live in a store with a leader
        per shard and consensus underneath. Events flow through a partitioned log. Ownership and
        configuration live in a small coordination service. Batch jobs check the books overnight.
        Each component sells one guarantee, and the system design is in how they are joined: the
        outbox that ties a balance change to its event, the fencing token that ties ownership to
        storage, the idempotency key that ties a retry to its first attempt.
      </p>

      <h3>When a famous design is the wrong model</h3>
      <p>
        The common mistake with these systems is copying a design without its requirement.
        Dynamo-style replication is attractive because it never refuses writes, and wrong for a
        balance for the reason in the worked answer above. Spanner-style guarantees are attractive
        because they are strong, and unnecessary for a blog’s comment counts, where they would add
        latency and cost for nothing. A Kafka topic is attractive as a universal integration layer,
        and a poor fit for request-reply interactions where the caller is waiting for an answer.
      </p>
      <p>
        The test is the one this chapter started with. Write down your answers to the five
        questions for your own data, then for the system you are considering, and look for the row
        where they disagree. That row is where the incident will come from.
      </p>
      <p>
        Each of these systems also has a public history of bugs found after it shipped, many of
        them in exactly the failure paths described in this pathway. The final chapter,{' '}
        <em>Breaking it on purpose</em>, is about finding those bugs in our wallet before users do.
      </p>
      <Notes
        items={[
          'Read a system by asking what failures it assumes, where its order comes from, what reads promise, how it behaves in a partition, and who pays for what it made cheap.',
          'Dynamo keeps writes available by merging concurrent versions, which suits a cart and cannot protect a balance from overspending.',
          'Spanner turns clock uncertainty into a bounded wait, which buys real-time ordered transactions at the cost of commit latency and special hardware.',
          'Kafka orders records per partition, and its idempotent producer is an idempotency key enforced by the broker.',
          'etcd’s revision numbers serve as both fencing tokens and resumable watch positions.',
          'MapReduce survives failures by making every task safe to run twice.',
        ]}
      />
    </>
  ),

  /* ── 10 · Breaking it on purpose ──────────────────────────────────── */
  testing: (
    <>
      <p>
        This chapter lets you turn the wallet’s guarantees into checks a machine can run, and
        choose testing methods by the kinds of bugs each can find. The aim is to find the failure
        paths that are wrong before a partition in production finds them for you.
      </p>
      <p>
        Over nine chapters we have made claims about the wallet. An acknowledged transfer is never
        lost. A retry never moves money twice. Money is conserved across shards. A balance never
        goes below zero. A read after “Sent” shows the new balance. Every one of those claims was
        argued in prose, and prose arguments have gaps. The bugs that slip through those gaps tend
        to need several unlikely things at once: a partition during an election while one server is
        paused. Unit tests do not produce that combination, and waiting for production to produce
        it is expensive.
      </p>

      <h3>Write the guarantees down as checks</h3>
      <p>
        The first step is to restate each claim as something a program can check against what the
        system did. Most fall into one of two families. Safety properties say that nothing bad ever
        happens, and a single counterexample disproves them. Liveness properties say that something
        good eventually happens, and they can only be checked with a time bound.
      </p>
      <p>
        For the wallet, the safety properties are concrete. At every consistent snapshot, the sum
        of all balances plus all in-transit accounts equals the starting total plus top-ups minus
        withdrawals. No balance is ever observed below zero. Every transfer that a client saw
        acknowledged appears exactly once in the ledger. Every read that started after a transfer
        was acknowledged reflects it. The liveness property is that, once faults stop, every
        pending saga reaches completed or refunded within, say, two minutes.
      </p>
      <p>
        Writing these down usually exposes a vague claim. “No transfer is lost” is ambiguous until
        you say what to do with transfers whose outcome the client never learned. Those are the
        timeouts from the first chapter. A correct checker must allow them either to have happened
        or not, but not both, and not twice.
      </p>

      <h3>Record a history, then check it</h3>
      <p>
        The approach Kyle Kingsbury’s Jepsen made widely known is to test the system the way it is
        used, from the outside, while breaking its environment. Several client processes run a
        workload against a real cluster. A separate component, which Jepsen calls the nemesis,
        injects faults: it cuts network links, kills processes, pauses them, and skews their
        clocks. Every operation is recorded with its start, its end, and its outcome: succeeded,
        failed, or unknown. At the end, a checker examines the whole history against the
        properties.
      </p>
      <p>
        Jepsen has a workload that is almost exactly our wallet. It is called bank: clients make
        transfers between a handful of accounts and read all balances at once, and the checker
        verifies that every read sees the same total and no negative balance. Jepsen analyses of
        several databases that claimed snapshot isolation have found exactly these violations
        under partitions and process pauses.
      </p>
      <p>
        The unknown outcomes need care in the checker. A transfer whose client timed out is
        recorded as indeterminate, and the checker must consider both histories, the one in which
        it happened and the one in which it did not, accepting the run if either is consistent.
        For a simple invariant such as the bank total, that is easy. For linearizability, where
        the checker searches for some order of all operations consistent with what every client
        observed, each indeterminate operation multiplies the orders to consider, and the general
        problem is computationally hard. Checkers such as Jepsen’s Knossos and the Porcupine
        library cope by checking each key independently and keeping histories short, which is one
        reason these tests use a handful of accounts rather than millions. The small scale is a
        deliberate choice: it raises contention, which makes violations more likely, and keeps the
        checking feasible.
      </p>

      <Predict q={<>We run a bank-style test against the wallet for ten minutes, with the nemesis partitioning the network every thirty seconds. At the end, the total across all accounts equals the starting total. Does that show the wallet conserves money?</>}>
        <p>
          No, for three reasons. First, a final total only checks the end. A read in the middle of
          the test might have seen Ravi’s credit without Asha’s debit, a total ₹500 too high. That
          is a real bug, since a statement generated at that moment would be wrong, and the final
          check cannot see it. The checker has to examine every read.
        </p>
        <p>
          Second, errors can cancel. A transfer lost in one partition and a different transfer
          applied twice in another leave the total unchanged. Checking that each acknowledged
          transfer appears exactly once catches what the sum misses.
        </p>
        <p>
          Third, the test only explores the faults it injected. If the bug needs a process pause
          during an election, and the nemesis only partitions, ten minutes or ten hours will not
          find it. A passing test says the system survived these faults, in these timings, this
          time.
        </p>
      </Predict>
      <p>
        Here is the kind of bug such a test finds. The nemesis pauses the wallet’s Raft leader for
        twelve seconds with <code>SIGSTOP</code>. The other two replicas elect a new leader, which
        commits several transfers, including one of Asha’s, and acknowledges them. The nemesis
        resumes the old leader. Just before it was paused, it had received a balance read, checked
        that its leader lease was valid, and gathered Asha’s balance. Now it sends that reply. The
        client, whose read began after Asha’s transfer was acknowledged, receives ₹2,000. The
        checker flags a read that missed an acknowledged write.
      </p>
      <p>
        This is the coordination chapter’s check-then-act gap again, inside the read path. The
        lease was valid when checked and expired before the reply left. Possible fixes are to check
        the lease again after assembling the reply, with a margin larger than any expected delay
        before sending, or to use a read index, which confirms leadership with a majority round
        trip per read or batch of reads. The first is cheap and narrows the window; the second
        closes it and adds latency. The test is what makes that tradeoff visible at all.
      </p>

      <h3>Inject faults into the real system</h3>
      <p>
        The nemesis’s tools are ordinary Linux facilities, and they are worth knowing because the
        same tools work in a staging environment and in a game day. <code>iptables</code> rules
        drop traffic between chosen machines, including in one direction only, producing the
        asymmetric partition where A can hear B but B cannot hear A. <code>tc netem</code> adds
        latency, jitter and packet loss. <code>kill -9</code> crashes a process without cleanup.{' '}
        <code>SIGSTOP</code> and <code>SIGCONT</code> pause and resume it, which is the closest
        imitation of a long garbage-collection pause. Clock skew can be injected by setting a
        machine’s clock directly or by intercepting time calls with a library such as libfaketime.
        Slow disks can be simulated with a device-mapper target that delays I/O.
      </p>
      <p>
        Some faults are realistic only in production, because staging lacks its traffic, data
        volume and network topology. Chaos engineering, as described in the Principles of Chaos
        Engineering, runs fault experiments there under strict rules. State a hypothesis in terms of
        a steady-state metric users would notice, such as “transfers completed per minute stays
        within 5 percent when one wallet replica is killed”. Limit the blast radius to one replica,
        one shard, or a small share of traffic. Keep an abort switch. Expand only when the
        hypothesis holds.
      </p>
      <p>
        The largest single experiment for the wallet is a data-centre failover. If it was last run
        at launch, the configuration, the runbook and the people have all changed since. A failover
        that has not been rehearsed recently should be treated as untested, and rehearsing it on a
        schedule, with the steady-state metric watched throughout, is how teams find that the DNS
        record has a one-hour time-to-live or that the standby lacks a new table.
      </p>

      <h3>Deterministic simulation: the bug you can replay</h3>
      <p>
        Fault injection against a real cluster has a frustrating property. When it finds a bug that
        depends on exact timing, rerunning the test usually does not reproduce it. Deterministic
        simulation testing removes that problem by removing every source of randomness the test
        does not control.
      </p>
      <p>
        The system is written so that all interactions with the outside world, the network, the
        disk, the clock, random numbers and the scheduling of concurrent tasks, go through
        interfaces. In production, the interfaces call the real operating system. In testing, a
        simulator implements them, running every replica of the wallet in a single process on a
        single thread, with a random number generator seeded from one integer. The simulator decides
        when each message is delivered, dropped or duplicated, when each disk write completes or is
        torn, and what time each node’s clock reports.
      </p>
      <pre><code>{`for seed in 1..1_000_000:
    sim = Simulator(seed)
    wallet = sim.start_cluster(replicas=3, shards=4)
    sim.run(workload=random_transfers,
            faults=random_partitions_crashes_pauses,
            steps=50_000)
    if not sim.check_invariants():
        report(seed)    # rerunning this seed reproduces the run exactly`}</code></pre>
      <p>
        Because everything flows from the seed, a failing run can be replayed exactly, step by step,
        under a debugger, as many times as needed. Because simulated time does not wait for real
        time, a simulated hour in which nodes sleep on timeouts can pass in seconds, and a farm of
        machines can explore millions of seeds overnight. FoundationDB’s team built their simulator
        before the database itself and credit it for the database’s reliability; TigerBeetle, a
        financial ledger database, runs a similar simulator continuously.
      </p>
      <p>
        The cost is architectural. Every source of nondeterminism must go through the interfaces,
        including those inside third-party libraries, and a library that opens its own sockets or
        reads the clock directly breaks the property. The simulator also only produces faults it was
        written to produce; a disk that silently returns stale data after a power loss will not
        appear unless someone modelled it. This is a decision to make early in a system’s life. Adding
        it to an existing codebase is possible but slow.
      </p>

      <h3>Cheaper tests that catch most retry bugs</h3>
      <p>
        Not every bug needs a cluster and a nemesis. A large share of the bugs in this pathway are
        in idempotency and retry handling, and those can be tested in an ordinary integration suite
        by making the network misbehave in targeted ways.
      </p>
      <p>
        Put a fault-injecting proxy, such as Toxiproxy, between the API and the wallet in the test
        environment. Then write tests for each case from the first chapter. Drop the request before
        it reaches the wallet, and check that a retry with the same key moves the money once. Let
        the request through and drop the reply, and check the same. Delay the request until after
        the caller’s deadline, and check that the wallet refuses to start it. Send the same request
        twice at the same moment, from two threads, and check that exactly one transfer exists and
        both callers receive the same answer. Send the same key with a different amount, and check
        for the key-conflict error.
      </p>
      <p>
        Each of those tests is short, deterministic and runs in seconds. Together they cover the
        bugs that produced the double charges on the slow afternoon. They would also have caught the
        colleague’s separate check-then-insert version in the RPC chapter, because the concurrent
        test makes both requests pass the check.
      </p>
      <p>
        Property-based testing extends this. Instead of writing individual scenarios, the test
        generates random sequences of operations, such as transfers, retries, duplicated deliveries
        and restarts of a consumer, runs them against the code, and checks the invariants after each
        sequence. When a sequence fails, the framework shrinks it to the shortest sequence that
        still fails, which often reads like a bug report: transfer, deliver event, restart
        consumer, deliver event again, history shows two rows. This sits between hand-written tests
        and full simulation, and it is cheap to adopt in an existing codebase.
      </p>

      <h3>Check the design before the code exists</h3>
      <p>
        Some bugs are in the design rather than the code. A saga whose compensation can run while
        a retry of the forward step is still in flight is wrong however carefully it is
        implemented. For the few protocols at the centre of the system, a formal specification
        finds these before any code is written.
      </p>
      <p>
        In TLA+, we describe the saga as a state machine: the variables (balances, in-transit
        accounts, each transfer’s status, messages in flight), the actions that change them
        (debit, deliver an event, credit, compensate, crash, duplicate a message), and the
        invariants that must hold in every reachable state. The TLC model checker then explores
        every possible ordering of those actions for a small instance, perhaps three accounts, two
        concurrent transfers and one crash, and if any ordering breaks an invariant, it prints the
        exact sequence of steps that does so.
      </p>
      <p>
        Engineers at Amazon described this in a 2015 article on their use of formal methods. Model
        checking found serious bugs in designs for DynamoDB and other services, one of which needed
        a sequence of 35 steps to trigger, far beyond what testing or review would plausibly hit.
        The limitation is the gap between specification and code: the model checker proves things
        about the design, and the implementation can still diverge from it.
      </p>

      <h3>Choosing what to use</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Technique</th><th>What it finds</th><th>What it misses</th><th>What it costs</th></tr>
          </thead>
          <tbody>
            <tr><td>History checking under faults</td><td>Real violations in the real binary</td><td>Faults and timings it never produced</td><td>A test cluster, a nemesis, a checker</td></tr>
            <tr><td>Fault injection and chaos</td><td>Operational gaps: timeouts, runbooks, config</td><td>Rare interleavings; hard to reproduce</td><td>Careful experiment design; production risk</td></tr>
            <tr><td>Deterministic simulation</td><td>Rare interleavings, with exact replay</td><td>Faults the simulator does not model</td><td>Architecture built around it from early on</td></tr>
            <tr><td>Model checking</td><td>Design flaws in protocols</td><td>Implementation bugs; anything outside the model</td><td>Learning a specification language; keeping the spec current</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        These complement each other. Model checking finds problems in the saga’s design.
        Simulation finds the interleavings in our implementation of it. History checking confirms
        that the database underneath behaves as its documentation claims. Chaos experiments confirm
        that the deployed system, with its real configuration and runbooks, recovers as planned.
      </p>

      <h3>How much is enough</h3>
      <p>
        The effort should follow the code you own and the cost of being wrong. A service that
        stores user preferences in a managed database inherits most of its correctness from that
        database; checking its own retry logic with fault injection is probably enough. The wallet
        owns its idempotency handling, its saga, its fencing and its read path, and an error in any
        of them moves money. That justifies history checking in continuous integration and a model
        of the saga, and, if the team is building the replication layer itself, simulation from the
        start.
      </p>
      <p>
        Revisit the level whenever a new protocol enters the system, such as a new kind of
        cross-shard operation, and after any incident whose cause was in a failure path. An
        incident is evidence that the existing tests did not explore that path, and the first
        change after it should be a test that would have caught it.
      </p>
      <p>
        That completes the wallet: a transfer that survives timeouts, replicas that agree, a leader
        that can be replaced, ownership that is fenced, transfers across shards that stay
        conserved, and tests that try to break all of it. The next pathway, System Design, takes
        these tools up a level and applies them to whole products, where the question becomes which
        of them a given feature needs at all.
      </p>
      <Notes
        items={[
          'Each guarantee should be written as a property a program can check against a recorded history.',
          'A checker must allow operations with unknown outcomes to have happened or not, but never twice.',
          'A final total that balances does not prove conservation; every intermediate read must be checked, and transfers counted individually.',
          'Fault injection only explores the faults it injects, so pauses, clock skew and one-way partitions belong in the nemesis.',
          'Deterministic simulation makes rare interleavings reproducible, at the cost of routing all I/O, time and randomness through interfaces from the start.',
          'Model checking finds design flaws before code exists; it says nothing about whether the code matches the design.',
        ]}
      />
    </>
  ),
}
