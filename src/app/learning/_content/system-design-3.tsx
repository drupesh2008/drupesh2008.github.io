/**
 * System Design pathway, part 3 of 3: background jobs, rate limiting,
 * security, failure, multi-region, delivery, the worked design and the
 * problem atlas. Keyed by stage id; every chapter follows Dabba, the
 * food-ordering example whose brief is set in the first chapter.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
import { CircuitStates } from './system-design-diagrams'
import {
  JobLease,
  TokenBucket,
  RetryAmplification,
  CityHoming,
  ExpandContract,
  AssignmentFlow,
} from './system-design-3-diagrams'

export const sections: Record<string, ReactNode> = {
  /* ── Background work ─────────────────────────────────────────── */
  jobs: (
    <>
      <p>
        This chapter lets you move work out of the request without losing it, doing it twice in a
        way that hurts, or letting it pile up unseen. The tools are a queue, a worker, a retry
        policy and a scheduler. Most of the design is about what happens when each of them fails.
      </p>
      <p>
        Here is the situation in Dabba. When a customer taps “Place order”, the first version of the
        handler did everything in line: it wrote the order, confirmed the payment, pushed a
        notification to the restaurant tablet, sent the customer an SMS, emailed a receipt and
        updated the loyalty points. On a quiet afternoon that took about 400 ms. At dinner, the SMS
        provider began answering in two seconds, and checkout became a two-second operation for
        reasons the customer could not see or care about. On one bad evening the email provider
        returned errors, the handler raised, and orders that had been paid for were reported to
        the customer as failed.
      </p>
      <p>
        The fix is to answer the customer once the order is safely recorded, and to do the rest
        afterwards. That sentence is easy. The rest of this chapter is about making “afterwards”
        as dependable as the request it replaced, because nobody is watching it.
      </p>

      <h3>Decide what the customer must wait for</h3>
      <p>
        Start with a question per step: does the customer’s next screen depend on its result? The
        order row must exist before we say “order placed”, or a crash leaves the customer with a
        confirmation for nothing. The payment authorisation must have an answer, because the next
        screen is either “paid” or “try another method”. Everything else on the list changes no
        decision the customer makes in the next second. The restaurant notification matters a
        great deal, but it matters within seconds, not within the request.
      </p>
      <p>
        So the handler keeps two things and hands off the rest: writing the order and obtaining the
        payment result. Restaurant notification, customer SMS, receipt email and loyalty points
        become <strong>jobs</strong>: units of work described by a small message (“notify
        restaurant 4471 about order 9182”) and executed by a separate fleet of workers.
      </p>
      <p>
        This moves latency, not work. A queue does not create processing capacity. If the SMS
        provider can only accept 300 messages a second and we produce 400, the queue grows by 100
        a second until dinner ends. What the queue buys is that the customer no longer pays for
        that backlog with a spinning button, and that a slow provider slows only the work that
        depends on it.
      </p>
      <p>
        It is worth sizing the work before building for it. The brief from the first chapter gives
        about a million orders a day, and about six notifications per order (placed, accepted,
        rider assigned, picked up, nearby, delivered): some 6 million notification jobs a day. The
        dinner hour carries 15% of orders, so it carries about 900,000 notifications, 250 a
        second, and spikes within the hour run two to three times that, so plan for around 600 a
        second. Refunds are rarer: if 2% of orders end in a full or partial refund, that is 20,000
        refund jobs a day. Rider payouts are a nightly batch for every rider who worked that day,
        tens of thousands of them. Three
        very different shapes of work, which will matter when we decide whether they share a queue.
      </p>

      <h3>Write the order and the job together, or lose one of them</h3>
      <p>
        The first bug in almost every hand-off is in the hand-off itself. Commit the order, then
        publish “notify restaurant” to the queue, and a crash between the two lines leaves an
        order the restaurant never hears about. Swap the lines and the restaurant hears about an
        order that then rolled back. The writes chapter met exactly this problem when a paid order
        had to reach the kitchen, and its answer applies unchanged: the outbox table.
      </p>
      <p>
        As a short recap, the job is written as an <code>outbox</code> row in the same transaction
        as the order, so both commit or neither does, and a relay ships unsent rows afterwards.
        The only difference here is the destination. The streams chapter extended the relay to
        append to the order-events log for many readers; here it feeds a work queue, where each job should
        be done once by one worker. The relay can still crash after sending and before marking a
        row sent, so a job can be enqueued twice. That is a duplicate, not a loss, and the rest of
        this chapter exists to make duplicates harmless.
      </p>
      <pre><code>{`BEGIN;
  INSERT INTO orders (id, customer_id, restaurant_id, status, ...) VALUES (...);
  INSERT INTO outbox (event_id, aggregate_id, type, payload)
       VALUES (gen_id(), :order_id, 'notify.restaurant', '{"order_id": ...}');
COMMIT;
-- the relay sends unsent rows to the work queue, then marks them sent`}</code></pre>
      <p>
        The cost is small next to the order itself: a few extra rows per order, at a design target
        of 150 orders a second. The relay is one more process that can lag, so the age of the oldest
        unsent row gets a dashboard and an alert, as it did for the event log. Many teams run one
        relay for both destinations, routing each row by its type.
      </p>

      <h3>A queue hands out leases, not messages</h3>
      <p>
        It helps to be exact about what a queue promises. When a worker receives a job, the queue
        does not delete it. It hides it for a period called the <strong>visibility
        timeout</strong> (or lease) and waits. If the worker acknowledges the job before the lease
        ends, the job is deleted. If the lease ends without an acknowledgement, the job becomes
        visible again and another worker can take it. That is the whole mechanism, and it is how a
        queue survives a worker that crashes, hangs or loses its network.
      </p>
      <Fig caption="Fig · A queue lends a job to one worker at a time. An ack deletes it, an expired lease redelivers it, and repeated failure parks it in a dead-letter queue">
        <JobLease />
      </Fig>
      <p>
        Look at what the queue cannot know. It sees “acked” or “not acked”. It does not see whether
        the refund call reached the payment provider. A worker that called the provider, received
        success, and then crashed before acking looks identical, from the queue’s side, to a
        worker that crashed before calling. Both get redelivered. This is why every queue you will
        use offers <em>at-least-once</em> delivery: the alternative would be to delete the job
        before the work, and then a crash loses it.
      </p>
      <Predict q={<>Dabba’s refund worker has a 30-second visibility timeout. At dinner the payment provider’s refund API slows to around 40 seconds per call. Workers are healthy and nobody crashes. What happens to refund #8812, and what does the customer see?</>}>
        <p>
          Worker A takes the job and calls the provider. At 30 seconds the lease expires while A is
          still waiting, so the job becomes visible and worker B takes it and calls the provider
          too. At 40 seconds A’s call succeeds and A tries to ack, but the ack is for a lease it no
          longer holds; depending on the queue it is rejected or ignored. At about 70 seconds B’s
          call returns. Without protection the provider has now processed two refunds, and the
          customer receives ₹800 back on a ₹400 order.
        </p>
        <p>
          Nothing failed. Slowness alone produced the duplicate. Two fixes are needed together:
          a lease comfortably longer than the slowest normal call (and a worker that extends its
          lease while it waits, which most queues support), and a refund call that the provider
          will only execute once however many times it arrives. The second is the subject of the
          next section, and it is the one that actually makes the system correct.
        </p>
      </Predict>

      <h3>Exactly-once is a property of the effect, not the delivery</h3>
      <p>
        Vendors and blog posts sometimes promise “exactly-once delivery”. Read those claims
        carefully. A queue can guarantee that, within its own storage, a message is processed and
        its result recorded once (Kafka’s transactions do this for work that reads and writes only
        Kafka). Nothing the queue does can stop a worker from calling an external API, crashing,
        and calling it again. What we can build is exactly-once <em>effect</em>: deliveries may
        repeat, but the second one changes nothing. The term for a handler with that property is{' '}
        <strong>idempotent</strong>.
      </p>
      <p>
        Each of Dabba’s jobs gets idempotency in the way that suits its effect.
      </p>
      <p>
        <em>Refunds</em> go to the payment provider with an idempotency key. The key must name the
        logical refund, not the attempt: <code>refund-8812</code>, created when the refund was
        decided and stored in the job payload. A key generated inside the worker
        (<code>uuid()</code> at call time) is useless, because the retry generates a different key.
        Payment providers keep idempotency keys for a limited window, often a day or so, which is
        another reason retries should not stretch for days.
      </p>
      <p>
        <em>Payouts</em> are made idempotent by the database. A payout ledger has a unique
        constraint on <code>(rider_id, period)</code>. The worker inserts the ledger row first,
        inside a transaction, and only the transaction that wins the insert proceeds to call the
        bank. A second delivery hits the constraint and stops. The bank transfer itself also
        carries the payout ID as its reference, so a crash after the insert and during the
        transfer can be reconciled by asking the bank whether that reference was paid.
      </p>
      <pre><code>{`def handle_payout(job):
    with db.transaction():
        inserted = db.execute("""
            INSERT INTO payouts (rider_id, period, amount, status)
            VALUES (%s, %s, %s, 'PENDING')
            ON CONFLICT (rider_id, period) DO NOTHING
        """, job.rider_id, job.period, job.amount).rowcount
    row = db.get_payout(job.rider_id, job.period)
    if row.status == 'PAID':
        return ack(job)                 # an earlier delivery finished
    bank.transfer(ref=row.id, amount=row.amount)   # bank dedupes on ref
    db.mark_paid(row.id)
    ack(job)`}</code></pre>
      <p>
        <em>Notifications</em> are the awkward case, because an SMS cannot be un-sent and most SMS
        gateways do not deduplicate. Here we keep a small record of what has been sent, keyed by{' '}
        <code>(order_id, event)</code>, and check it before sending. That narrows the duplicate
        window to the moment between sending and recording, which is acceptable for “your rider is
        nearby” and is the honest limit of what can be done with a provider that offers no key.
        Writing down which jobs are only “nearly once” is part of the design.
      </p>
      <p>
        Some effects are idempotent without help. Setting <code>{`status = 'NOTIFIED'`}</code> is the
        same however many times it runs. Overwriting a resized dish photo at a fixed path is the
        same. Incrementing loyalty points is not: “add 20 points” twice adds 40. Rewriting it as
        “record that order 9182 earned 20 points” (an insert keyed by order) and computing the
        balance as a sum turns an unsafe increment into a safe insert. That rewrite, from
        “change the value” to “record the fact”, is the move to reach for first.
      </p>

      <h3>Retries, and the message that will never succeed</h3>
      <p>
        Jobs fail for two very different reasons, and the retry policy has to tell them apart.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Failure</th><th>Dabba example</th><th>What the worker should do</th></tr>
          </thead>
          <tbody>
            <tr><td>Transient</td><td>SMS gateway timeout, provider 503, database failover</td><td>retry later with growing delay and jitter</td></tr>
            <tr><td>Rate limited</td><td>provider returns 429 with Retry-After</td><td>wait at least as long as asked; slow the whole queue, not one job</td></tr>
            <tr><td>Permanent</td><td>refund for an order with no captured payment; malformed payload</td><td>stop retrying, record why, send to the dead-letter queue</td></tr>
            <tr><td>Unknown outcome</td><td>bank transfer timed out after sending</td><td>reconcile first (ask the bank by reference), then decide</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Now walk through what happens without that distinction. A bug in an older app version
        produces refund requests whose amount field is a string. The refund worker raises an
        exception on parse, the job is not acked, and the lease expires. The job is redelivered,
        raises again, and is redelivered again. One such job is a nuisance. Two thousand of them,
        produced over an evening, behave like a capacity leak: each one occupies a worker for a
        parse attempt every lease period, forever. If the queue preserves order within a partition,
        as Kafka does, it is worse: the bad message sits at the head of its partition and every
        refund behind it waits. This is a <strong>poison message</strong>.
      </p>
      <p>
        The fix has three parts. First, a maximum attempt count (five is common), after which the
        job moves to a <strong>dead-letter queue</strong> with its last error attached. Second, an
        alert on the first arrival in the dead-letter queue, not on its size, because a refund
        that will never process is a customer who has not been paid back. Third, a tool to replay
        dead-lettered jobs once the bug is fixed. Without the replay tool, a dead-letter queue is
        a place where work goes to be forgotten. The cost is real: someone owns that queue, reads
        its errors, and decides for each class of failure whether to fix and replay or to discard.
      </p>
      <p>
        Retry timing matters as much as the count. Retrying immediately turns a provider’s brief
        hiccup into a burst of our own traffic exactly when it is weakest. The usual schedule is
        exponential backoff (1 s, 2 s, 4 s, 8 s…) with random jitter so that a thousand jobs that
        failed at the same moment do not all return at the same moment. The chapter on failure
        works through why jitter matters with numbers. For now, note that a queue gives us
        backoff almost for free: a job can be re-enqueued with a delay rather than retried in a
        loop inside the worker, which keeps the worker free for other jobs.
      </p>

      <h3>Work that must happen at a particular time</h3>
      <p>
        Some of Dabba’s jobs are triggered by the clock rather than by an event. The writes
        chapter already has one: the sweeper that releases stock reservations still unpaid after
        10 minutes. It is the simplest form, a periodic job that finds everything overdue and
        handles it. Two more show the harder cases.
      </p>
      <p>
        The first is the acceptance timeout. If a restaurant has not accepted an order within five
        minutes, we cancel it and refund the customer. The natural implementation is a delayed job:
        when the order is placed, enqueue “check acceptance of 9182” to become visible in five
        minutes. Most managed queues support delays directly; otherwise a table of due times,
        polled every second for rows that are due, does the same. The trap is in what the job does
        when it runs. By then the restaurant has usually accepted. The job must not cancel blindly;
        it must cancel only if the order is still waiting, in one conditional statement:
      </p>
      <pre><code>{`UPDATE orders SET status = 'CANCELLED_NO_ACCEPT'
 WHERE id = 9182 AND status = 'PLACED';
-- 0 rows updated: the restaurant got there first, do nothing`}</code></pre>
      <p>
        A check-then-act version (read status, see PLACED, then update) loses the race when the
        restaurant taps “accept” between the read and the write. The conditional update makes the
        database decide which of the two transitions happened first, and the other one finds
        nothing to do. We will use the same shape again for rider offers in the worked design.
      </p>
      <p>
        The second is the nightly payout at 02:00. Run the scheduler on one machine and the payout
        does not happen on the night that machine is being replaced. Run it on three for
        availability and, unless they coordinate, the payout is triggered three times. The usual
        design is to elect one scheduler as leader using a lease in a coordination service (the
        Distributed Systems pathway covers leases and fencing), have the leader enqueue one job
        per rider rather than doing the payouts itself, and record that the 02:00 run for a given
        date has been triggered. If the leader dies halfway through, the new leader sees the run is
        incomplete and enqueues again. Because each payout is idempotent on{' '}
        <code>(rider_id, period)</code>, enqueuing some riders twice is harmless. This is the
        general pattern: make the scheduler’s job small (decide what is due, emit jobs) and let the
        idempotency of the jobs absorb the scheduler’s mistakes.
      </p>
      <p>
        Time zones are mostly simple for Dabba, since India uses one, but the design should still
        store due times in UTC and convert at the edges. The day Dabba opens in Dubai or
        Singapore, “02:00” stops being one moment.
      </p>

      <h3>Give urgent work its own lane</h3>
      <p>
        Suppose all jobs share one queue and one pool of workers. At 20:10 the marketing team
        sends a promotional push to 2 million customers, which enters the queue as 2 million jobs
        ahead of the “rider assigned” and “your order is nearby” notifications for every order in
        the country. At 600 jobs a second the promotion takes almost an hour to drain, and every
        order notification behind it is up to an hour late, which for “your rider is at the door”
        means useless. The bulk work did not fail; it simply stood in front.
      </p>
      <p>
        Separate queues by urgency and by kind of work: one for time-sensitive order notifications,
        one for refunds, one for payouts, one for low-value work such as receipts and analytics.
        Each gets its own workers, sized independently. Little’s law sizes them: the number of
        jobs in progress equals arrival rate times time per job. At 600 notifications a second and
        about 150 ms per provider call, we need around 90 calls in flight; with headroom for a slow
        provider (say calls stretch to 500 ms), around 300. Those can be threads in a few
        processes, but the number should come from this arithmetic, not from a default.
      </p>
      <p>
        Within a queue, one tenant can still crowd out the rest. If a chain’s kitchen outage
        triggers a few thousand refunds in minutes, a per-chain concurrency cap stops it from occupying every refund worker
        while a single customer elsewhere waits for theirs. The cost of lanes and caps is more
        moving parts: more queues to monitor, more pools to size, and capacity that sits idle in one
        lane while another is busy. That is the trade, and for a system where some messages expire
        in usefulness within a minute it is usually worth making.
      </p>
      <p>
        The metric that tells you a lane is in trouble is the age of its oldest job, not its
        depth. A depth of 10,000 is fine if workers clear it in five seconds and alarming if they
        clear it in ten minutes. Age says “late” directly, and it maps onto a promise you can
        state: order notifications leave within 10 seconds, refunds start within 5 minutes,
        payouts finish by 06:00. Each promise gets an alert on its own lane.
      </p>

      <h3>When a queue is the wrong tool</h3>
      <p>
        A queue is wrong when the caller needs the answer. Payment authorisation stays in the
        request: putting it behind a queue would mean telling the customer “order placed” before
        knowing whether they can pay, and then chasing them afterwards. Some products choose that
        trade deliberately (accept the order, collect payment later), but it is a product decision,
        not a performance trick.
      </p>
      <p>
        A queue is also the wrong shape when many consumers need the same events in order. If the
        search index, the analytics pipeline and the fraud model all need every order event,
        three work queues fed by three outbox rows is a poor copy of the replayable log from the
        streams chapter. Use a work queue for chores that one worker should do once; use a log for
        facts that several readers consume at their own pace. And when the work is small, fast and
        reliable, such as writing an audit row to the same database, keep it in the transaction.
        Every hop to a queue adds an outbox row, a relay, a worker and a dashboard.
      </p>
      <p>
        Revisit this design if the shape of the jobs changes. Workflows with many steps and
        compensations (“place order, reserve rider, charge, and undo each if a later step fails”)
        outgrow hand-written queue jobs, and a workflow engine that persists each step’s state
        starts paying for itself.
      </p>
      <Callout>
        A queue promises that a job will be handed to some worker at least once. Everything else,
        from not losing it at the hand-off to not refunding twice, is our design: an outbox at the
        start, idempotent effects in the middle, and a dead-letter queue someone reads at the end.
      </Callout>
      <p>
        Background work protected the order request from slow dependencies behind it. The next
        chapter, on rate limiting, protects the API from callers in front of it: scripts that
        request login OTPs for thousands of phone numbers, scrapers walking every menu, and our own
        app retrying in a tight loop.
      </p>
      <Notes
        items={[
          'A queue moves latency out of the request; it does not add capacity, so producers above the consumption rate still build a backlog.',
          'Write the job in the same transaction as the business row (an outbox), or a crash between the two loses the job or invents one.',
          'Delivery is at-least-once because the queue cannot see whether an external call happened; correctness comes from idempotent effects.',
          'Idempotency keys name the logical operation (refund-8812), never the attempt.',
          'Cap attempts, park failures in a dead-letter queue, alert on the first arrival, and keep a replay tool.',
          'Separate lanes for urgent and bulk work, sized with Little’s law and watched by the age of the oldest job.',
        ]}
      />
    </>
  ),

  /* ── Rate limiting and abuse protection ─────────────────────── */
  ratelimit: (
    <>
      <p>
        This chapter lets you decide how much each caller may ask of Dabba, enforce that decision
        at the right layer, and keep enforcing it when the API runs on many machines. It also
        separates two jobs that are often confused: limiting a caller, and protecting the whole
        system when it is overloaded.
      </p>
      <p>
        The situation that forces the question is the login screen. Dabba logs customers in with a
        one-time password sent by SMS. Each OTP costs Dabba a fraction of a rupee and lands on a
        real person’s phone. One Tuesday night a script calls <code>POST /auth/otp</code> for
        hundreds of thousands of phone numbers, a few hundred a second, from a few thousand IP
        addresses. By morning the SMS bill for the night is several times the monthly budget,
        thousands of people have received codes they did not request, and the SMS gateway has
        throttled Dabba’s account, which means real customers at breakfast cannot log in.
      </p>
      <p>
        Nothing in the system was broken. Every request was well formed and every one did exactly
        what the code said. What was missing was a rule about how much is too much, written down
        before someone else decided it for us.
      </p>

      <h3>Start from what a request costs</h3>
      <p>
        A single limit for “the API” cannot be right, because Dabba’s endpoints cost very different
        amounts and attract very different abuse. The design starts by pricing them.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Endpoint</th><th>What one call costs</th><th>Abuse it attracts</th><th>Who should share a limit</th></tr>
          </thead>
          <tbody>
            <tr><td><code>POST /auth/otp</code></td><td>money per SMS, a stranger’s phone</td><td>SMS pumping, harassment, account probing</td><td>the phone number; also device and IP</td></tr>
            <tr><td><code>POST /auth/verify</code></td><td>little, but guesses unlock accounts</td><td>brute-forcing 6-digit codes</td><td>the phone number’s pending OTP</td></tr>
            <tr><td><code>GET /restaurants</code>, menus</td><td>cheap, mostly cached</td><td>competitors scraping prices</td><td>device or API client</td></tr>
            <tr><td><code>POST /orders</code></td><td>payment call, restaurant load</td><td>fake orders, card testing</td><td>the account, and the payment instrument</td></tr>
            <tr><td>Order tracking (SSE)</td><td>an open connection, plus a status fetch on reconnect</td><td>our own app reconnecting in a loop</td><td>the session</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Two things fall out of the table. The key (who shares a bucket) differs per endpoint, and
        for the most expensive endpoint it is not the caller at all but the victim: the phone
        number receiving the SMS. And the most abused endpoints are not the busiest ones. Menu
        browsing is the bulk of Dabba’s traffic and needs only coarse limits. The OTP endpoint is a
        tiny fraction of the traffic and needs the most careful ones.
      </p>
      <p>
        Brute force on verification deserves its own arithmetic. A 6-digit code has a million
        values. If an attacker may try 10 codes per minute against one phone number and the code
        lives for 5 minutes, they get 50 guesses, a 1 in 20,000 chance per code issued. If the
        verify endpoint has no limit and the attacker can try 1,000 a second, they will find the
        code in about eight minutes on average, which a 5-minute expiry only partly blocks. The
        right limit here is per pending code, not per minute: five wrong guesses and the code is
        burned, and a new one must be requested, which runs into the send limit.
      </p>

      <h3>A rate and a burst: the token bucket</h3>
      <p>
        Most limiters in production are some form of <strong>token bucket</strong>. Each key has
        a bucket holding at most <em>b</em> tokens. Tokens are added at a steady rate <em>r</em>.
        A request takes one token if there is one and is refused if there is not. The two numbers
        answer the two real questions: what long-run rate do we allow, and how large a burst do we
        forgive. A customer who opens the app and taps through five restaurants in three seconds
        is a burst, and that is normal. A script that does it every three seconds all night is a
        rate, and that is not.
      </p>
      <Fig caption="Fig · A bucket of 5 refilling one token every 30 seconds. Five quick requests pass, the sixth is refused, and later requests pass as tokens trickle back">
        <TokenBucket />
      </Fig>
      <p>
        The implementation stores only two numbers per key: the token count and the time of the
        last update. There is no background process adding tokens. Each request computes how many
        tokens would have arrived since the last update, adds them up to the cap, and then spends.
      </p>
      <pre><code>{`def allow(key, now, rate, burst):
    tokens, last = store.get(key, default=(burst, now))
    tokens = min(burst, tokens + (now - last) * rate)
    if tokens < 1:
        store.put(key, (tokens, now))
        return False, (1 - tokens) / rate      # seconds until next token
    store.put(key, (tokens - 1, now))
    return True, 0`}</code></pre>
      <p>
        The second return value is not decoration. It is the honest <code>Retry-After</code> for
        a refused request, and it lets a well-written client wait exactly as long as it needs to.
      </p>
      <Predict q={<>An older Dabba service uses a fixed window instead: “at most 10 requests per key per calendar minute”, with a counter that resets at :00. What is the most requests one key can make within any 2-second span?</>}>
        <p>
          Twenty. The client sends 10 requests at 20:00:59 and 10 more at 20:01:00. Each batch is
          within its own minute’s limit, and together they are twice the intended rate inside two
          seconds. For a coarse cap on browsing traffic that may not matter. For an OTP endpoint
          it means the limit is really 20, not 10, at the moment an attacker chooses.
        </p>
        <p>
          The sliding-window variants fix this. A sliding log keeps the timestamp of every request
          in the last minute and counts them; it is exact and costs memory per request. A sliding
          window counter keeps this minute’s and last minute’s counts and estimates the rolling
          total as <em>current + previous × (fraction of the previous window still inside the
          last 60 s)</em>; it is approximate, costs two numbers per key, and is accurate enough for
          almost every use. The token bucket avoids the boundary entirely, because it has no
          windows.
        </p>
      </Predict>
      <Tbl>
        <table>
          <thead>
            <tr><th>Algorithm</th><th>State per key</th><th>What it gets right</th><th>What it gets wrong</th></tr>
          </thead>
          <tbody>
            <tr><td>Fixed window</td><td>one counter</td><td>trivial, cheap to explain</td><td>allows 2× the limit across a boundary</td></tr>
            <tr><td>Sliding log</td><td>a timestamp per request</td><td>exact</td><td>memory grows with the limit; costly for high limits</td></tr>
            <tr><td>Sliding window counter</td><td>two counters</td><td>smooth, cheap, close to exact</td><td>an estimate; can be off when traffic is very uneven</td></tr>
            <tr><td>Token bucket</td><td>count and timestamp</td><td>separate knobs for rate and burst</td><td>a full bucket allows a burst some endpoints should not</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        For Dabba’s OTP send we use small buckets with slow refill and a hard daily ceiling: per
        phone number, a burst of 3 and one new token every 10 minutes, plus no more than 10 per
        day. For menu browsing, per device, a generous burst of 60 and a rate of 5 a second. These
        numbers are not derived from first principles. They come from looking at what real
        customers do (the 99.9th percentile of honest users) and setting the limit comfortably
        above it, then watching how many honest users hit it.
      </p>

      <h3>Walk-through: the limit that did not stop the attack</h3>
      <p>
        After the Tuesday incident, Dabba adds a per-phone-number limit on OTP sends: three per
        10 minutes. It works against the first script, which retried the same numbers. A week
        later the bill rises again. Walk through what the attacker changed.
      </p>
      <p>
        The new traffic sends exactly one OTP per number, so no number ever reaches its limit. The
        numbers are not random. They fall in a few ranges, many outside India, that belong to
        carriers paying a share of termination fees to whoever generates traffic to them. This is{' '}
        <strong>SMS pumping</strong> (also called toll fraud): the attacker does not want the
        codes at all; they are paid per message that Dabba sends. A per-number limit cannot stop
        it, because every number is fresh. A per-IP limit fails too: the traffic comes through
        residential proxies, a few requests per IP.
      </p>
      <p>
        The fix comes from asking what the attack needs rather than who sends it. It needs
        Dabba to send messages to many numbers in a few ranges. So the design adds limits keyed on
        the thing the attacker cannot vary cheaply. Dabba only operates in India, so OTPs to
        non-Indian numbers are refused outright. Sends are counted per number prefix (the first
        several digits), with alerts when a prefix suddenly sees far more sends than its history.
        A global ceiling on OTP sends per minute, set at a few times the busiest honest minute,
        acts as a circuit breaker on spend: when it trips, new OTP requests get a challenge
        (a CAPTCHA or app-attestation check) instead of an SMS. And the conversion rate is
        watched: honest OTPs are mostly verified within a minute, pumped ones almost never are.
      </p>
      <p>
        Each of these has a cost. The country restriction blocks a customer visiting from
        abroad with a foreign SIM. The prefix alert produces false alarms when a new carrier
        range is legitimately popular. The global ceiling, when it trips, puts a challenge in
        front of honest users at the worst moment, so it is set high and treated as an alarm
        rather than a routine control. The general lesson is that a rate limit is keyed on an
        identity, and an attacker chooses which identities to present. The limits that hold are
        the ones keyed on something expensive for them to change.
      </p>
      <p>
        A note on IP addresses in India in particular. Most mobile users sit behind carrier-grade
        NAT, where thousands of phones share a small pool of public IPv4 addresses. A per-IP limit
        tight enough to slow an attacker will block a neighbourhood of honest customers during
        dinner. Per-IP limits are still useful as a very coarse outer layer (no single address
        should send 500 requests a second), but they cannot be the main control. Devices, accounts
        and phone numbers are better keys, and IPv6 addresses, which are more often per device,
        help a little.
      </p>

      <h3>Enforce where the request is still cheap</h3>
      <p>
        A limit enforced after the work is done protects nothing. If the order service checks the
        limit after it has called the payment provider, the expensive part has already happened.
        The rule is to enforce each limit at the earliest point that has the information it needs.
      </p>
      <p>
        That gives three layers in Dabba. At the edge (the CDN or a web application firewall),
        coarse per-IP limits and known-bad-client rules absorb floods before they reach any of our
        machines; the edge knows only the IP, headers and path, so that is all it can key on. At
        the API gateway, after the access token has been checked, per-account and per-device
        limits run; this is where most limits live, because the gateway knows who the caller is
        and has not yet spent anything. Inside the services, business limits run, the ones that
        need domain data: no more than three unpaid orders per account, no more than five
        cancellations a day, at most one refund request per order. These are not about request
        rates at all. They are invariants, and they belong next to the data they protect.
      </p>

      <h3>Counting across thirty API servers</h3>
      <p>
        Dabba’s API tier, from the first chapter, is 30 servers behind a load balancer. A
        customer’s requests land on different servers. If each server keeps its own buckets in
        memory, a limit of 5 per second per device becomes, in the worst case, 5 per second per
        server: 150 per second. In practice the load balancer spreads one client’s requests across
        several servers, not all 30, so the real error is smaller, but it is unpredictable.
      </p>
      <p>
        The usual fix is a shared counter store, typically Redis, holding the buckets. The check
        and the spend must happen as one atomic operation. A gateway that reads the count, decides,
        and then writes back lets two machines both read “1 token left”, both allow, and both
        write 0. Redis makes the atomic version easy with a short script that runs the
        refill-and-spend logic server side, or with an atomic increment for window counters.
      </p>
      <p>
        The shared store has costs we should state. Each request now waits for a network round
        trip to Redis, typically well under a millisecond inside one data centre, but not zero.
        In the dinner hour Dabba’s API handles about 4,200 requests a second and is designed for
        10,000, plus 10,000 rider location updates a second, and each request checked against
        Redis is one Redis operation. That is comfortably within what a small Redis cluster
        handles, but it is a cluster to run, shard by key, and monitor. Rider location updates,
        which come from authenticated riders on a fixed 5-second schedule, are a reasonable place
        to skip the shared check and use a local, generous limit instead.
      </p>
      <p>
        The harder question is what happens when Redis is unavailable. If the limiter fails
        closed, refusing all requests, a cache outage becomes a full outage. If it fails open,
        allowing everything, the OTP endpoint is unprotected exactly when something is already
        wrong. Dabba chooses per endpoint: browsing and order tracking fail open, falling back to
        each gateway’s local buckets; OTP sending falls back to strict local limits plus the global
        spend ceiling, which is tracked separately. A limiter is a dependency like any other, and
        the failure chapter’s rules about timeouts apply to it too: a 2 ms timeout on the limiter
        call, after which the fallback decides.
      </p>
      <p>
        A middle path avoids the per-request round trip. Each gateway keeps local buckets and
        periodically (every few hundred milliseconds) reports its counts to the shared store and
        pulls back the global totals. Limits become approximately right within that sync
        interval. For a limit like “5 per second per device” that error is acceptable; for “10
        OTPs per day per number” it is irrelevant, since the window is a day. Precision is a cost
        to buy where it pays.
      </p>

      <h3>Refuse in a way clients can obey</h3>
      <p>
        When a request is refused, the response is part of the API and will be depended on. Dabba
        returns <code>429 Too Many Requests</code> with a <code>Retry-After</code> header taken from
        the limiter’s calculation, and on the endpoints partners use, headers stating the limit,
        what remains and when it resets. The point is to let a well-behaved client slow down before
        it is refused, not only after.
      </p>
      <p>
        The most frequent abuser of an API is often its own client. Imagine a Dabba app release
        with a bug: when the order-tracking SSE connection drops, it reconnects and refetches the
        order immediately, with no delay. A small backend hiccup at 20:00 drops every open tracking
        screen, tens of thousands of them at dinner (about 88,000 orders are in flight at peak), and they all reconnect as fast as the network
        allows, over and over. The per-session limit on tracking
        turns that into a bounded load the backend can survive, and the 429 with{' '}
        <code>Retry-After</code> tells the app how to recover. The real fix is in the app (backoff
        with jitter, and honouring <code>Retry-After</code>), but app updates take weeks to reach
        most phones, and the server-side limit is what protects Dabba during those weeks.
      </p>
      <p>
        One distinction to keep. A rate limit protects the system from one caller using more than
        its share. It does nothing when the total of everyone’s fair share exceeds capacity, as on
        a festival night when every customer is honestly ordering. That needs load shedding:
        refusing some work, chosen by priority, based on how loaded the system is rather than who
        is asking. Stripe’s engineering post in this chapter’s reading describes running both
        side by side. Dabba’s version appears in the failure chapter.
      </p>

      <h3>When a rate limit is the wrong tool</h3>
      <p>
        Do not rate limit traffic you must not drop. The payment provider’s webhook, telling Dabba
        a payment was captured, arrives in bursts at dinner. A limiter that refuses some of those
        calls causes paid orders to sit as unpaid until the provider retries, if it retries.
        Webhook endpoints need capacity and a queue behind them, not a limit in front.
      </p>
      <p>
        Rate limits also do little against slow, distributed attacks. Credential stuffing across a
        million accounts at one attempt per account per day, from a million IPs, stays under every
        per-key limit. That is a detection problem (unusual success-to-failure ratios, device
        fingerprints, impossible travel) more than a limiting one. And limits that are tighter
        than honest peak behaviour create the outage they were meant to prevent: a festival
        evening when many customers retry a slow checkout is not abuse. Revisit limits after every
        large sale or festival using the real distribution of honest traffic, not the numbers
        chosen at launch.
      </p>
      <p>
        Every limit in this chapter is keyed on an identity: an account, a device, a phone number.
        A limit keyed on an identity is only as good as our confidence in that identity. The next
        chapter, on security, is about establishing who is calling, and what each of Dabba’s three
        kinds of user may see and do once we know.
      </p>
      <Notes
        items={[
          'Price each endpoint before limiting it; the costliest endpoint (OTP send) is rarely the busiest.',
          'A token bucket has two separate knobs, a long-run rate and a forgivable burst, and needs only a count and a timestamp per key.',
          'Fixed windows allow twice the limit across a boundary; use a bucket or a sliding window where that matters.',
          'Key limits on something the attacker cannot cheaply vary; per-IP limits are weak behind Indian carrier-grade NAT.',
          'Enforce each limit at the earliest layer that has the information it needs, and decide per endpoint whether the limiter fails open or closed.',
          'Rate limits share capacity fairly between callers; load shedding protects the system when the honest total is too much.',
        ]}
      />
    </>
  ),

  /* ── Identity, authorisation and the security basics ────────── */
  security: (
    <>
      <p>
        This chapter lets you decide how Dabba knows who is calling, what each kind of caller is
        allowed to see and change, and how to trust messages that arrive from outside, such as a
        payment provider telling us an order is paid. It is not a security course. It covers the
        decisions a system designer cannot hand to someone else.
      </p>
      <p>
        Dabba has three kinds of user, and they want different things from the same data. A
        customer wants to see their own orders. A restaurant wants to see the orders placed with
        it, including what was ordered, but not the customer’s card. A rider wants to see the
        pickup and drop-off for the order they are delivering right now, including an address and
        a way to call the customer, and nothing about any other order. An order row contains all
        of this at once. Security for Dabba is mostly the question of which slice of that row each
        caller gets, and when.
      </p>
      <p>
        The failure to keep in mind is unusual. Most broken systems stop working, and someone
        notices. A broken authorisation check keeps working perfectly, for the wrong person, and
        nobody notices until the data is somewhere it should not be.
      </p>

      <h3>From an OTP to a credential on every request</h3>
      <p>
        <strong>Authentication</strong> establishes who the caller is. Dabba customers and riders
        prove control of a phone number with an OTP; restaurant staff log in to a tablet app with
        a phone number and OTP too, tied to a restaurant account. After that one proof, the app
        needs something to present on every request that says “this is customer 551” without
        repeating the OTP. There are two common shapes.
      </p>
      <p>
        A server-side session is an opaque random string. The app sends it with each request and
        the server looks it up in a session store to find the user. Revoking it means deleting the
        row. Its cost is that lookup on every request: a cache read, around a millisecond, and a
        session store that every service depends on.
      </p>
      <p>
        A signed token, typically a JWT, carries the claims itself (“subject: customer 551, role:
        customer, expires 20:15”) and a signature. Any service holding the public key can verify
        it locally with no lookup. Its cost is the reverse of the session’s: the server cannot
        take it back. A token signed at 20:00 with a 15-minute life is valid until 20:15 whatever
        happens in between.
      </p>
      <p>
        Dabba uses the common combination. A short-lived access token (a JWT, 15 minutes) is sent
        on every API call and verified locally by the gateway and services. A long-lived refresh
        token (an opaque string stored server side, valid for, say, 60 days) is used only to obtain
        new access tokens. Every refresh rotates it: the old refresh token is marked used and a
        new one issued. If an old refresh token is ever presented again, someone has a copy, and
        the whole chain for that device is revoked. On the phone, tokens live in the platform’s
        secure storage (Keychain on iOS, Keystore-backed storage on Android). On the restaurant web
        dashboard, the session lives in a cookie marked <code>HttpOnly</code> (scripts cannot read
        it), <code>Secure</code> (sent only over TLS) and <code>SameSite</code> (not sent on
        requests started by other sites).
      </p>
      <Predict q={<>A rider is suspended for fraud at 20:00. Their app received a fresh 15-minute access token at 19:58, and their refresh token is revoked at 20:00. Until when can they act as a rider, and what should the design do about it?</>}>
        <p>
          The access token stays valid until 20:13. Any endpoint that checks only the token’s
          signature and role will treat them as an active rider until then. They cannot get a new
          access token after that, because the refresh is refused.
        </p>
        <p>
          Whether 13 minutes matters depends on the action. Reading their own earnings page for
          13 minutes is harmless. Accepting a new order and collecting a cash-on-delivery payment
          is not. So the actions that matter check the rider’s current state, not just the token:
          the assignment service already reads the rider’s row when offering an order, and that
          row says <code>{`status = 'SUSPENDED'`}</code>. The general rule is that a token proves who
          the caller was when it was issued; decisions with consequences read the current state.
          Shortening the token to two minutes is the other lever, at the cost of more refresh
          traffic.
        </p>
      </Predict>

      <h3>Authorisation is a relationship, not a role</h3>
      <p>
        <strong>Authorisation</strong> decides whether this caller may perform this action on
        this object. The first instinct is roles: customers can call customer endpoints, riders
        rider endpoints. Roles are necessary and nowhere near sufficient. Every rider is allowed
        to call <code>GET /rider/orders/:id</code>. The question that matters is whether{' '}
        <em>this</em> rider is assigned to <em>this</em> order.
      </p>
      <p>
        Write down, per resource, the relationship that grants access. For an order in Dabba:
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Caller</th><th>May see the order when</th><th>Sees</th><th>Never sees</th></tr>
          </thead>
          <tbody>
            <tr><td>Customer</td><td>they placed it</td><td>everything about their order</td><td>rider’s personal phone number</td></tr>
            <tr><td>Restaurant staff</td><td>it was placed with their restaurant</td><td>items, notes, customer first name</td><td>address, phone, payment details</td></tr>
            <tr><td>Rider</td><td>currently assigned, from acceptance until delivery + 30 min</td><td>pickup, drop-off address, masked phone</td><td>order history, other orders, payment</td></tr>
            <tr><td>Support agent</td><td>a ticket references it</td><td>what the ticket needs, logged</td><td>full card data (Dabba never has it)</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Two features of this table carry most of the design. Access is time-bound: a rider who
        delivered an order at 20:40 has no reason to see that customer’s address at 23:00, or next
        week. And access is shaped: different callers get different projections of the same row,
        so the check is not only yes or no but also which fields. The phone number a rider sees is
        a masked relay number that forwards to the customer for the life of the delivery, so the
        customer’s real number never reaches the rider’s phone at all. Not holding data is the
        strongest protection for it.
      </p>
      <p>
        The rule that makes the table enforceable is that each resource type has one function that
        answers the question, and every handler calls it.
      </p>
      <pre><code>{`def can_view_order(principal, order, now):
    if principal.role == 'customer':
        return order.customer_id == principal.id
    if principal.role == 'restaurant':
        return order.restaurant_id in principal.restaurant_ids
    if principal.role == 'rider':
        a = order.assignment
        return (a is not None and a.rider_id == principal.id
                and (a.delivered_at is None or now < a.delivered_at + minutes(30)))
    return False`}</code></pre>
      <p>
        When authorisation logic is copied into each handler, every new handler is a fresh chance
        to forget it. One function, tested with a table of cases like the one above, can be
        reviewed once and changed once.
      </p>

      <h3>Walk-through: the order ID that opened every order</h3>
      <p>
        Here is how it typically goes wrong. A developer adds a “share your order status” feature
        and a new endpoint, <code>GET /orders/:id/summary</code>, used by the customer app. The
        gateway checks that the request carries a valid customer token. The handler loads the order
        by ID and returns its summary: restaurant, items, delivery address, the customer’s name and
        phone. Tests pass, because the tests request the tester’s own orders.
      </p>
      <p>
        Order IDs in Dabba follow the layout from the IDs chapter: 41 bits of milliseconds, 13 bits
        of logical shard and 10 random bits. They are not sequential, so subtracting one from your
        own ID finds nothing. That does not make them secret. The first leak is ordinary: IDs
        appear in shared tracking links, screenshots, support chats and logs, and a rider who has
        made 300 deliveries has 300 real IDs in the app’s history. A former rider with that list,
        calling the new endpoint with an ordinary customer token, gets 300 names, addresses and
        phone numbers, weeks after the deliveries ended.
      </p>
      <p>
        The second leak is a narrowed search. Someone who wants one person’s address and knows
        they ordered from a particular restaurant around 20:15 already knows the shard bits (any
        order of their own from that restaurant carries them) and the time to within a minute.
        That leaves 60,000 milliseconds × 1,024 random values, about 61 million candidates, which
        a botnet at 2,000 requests a second covers in roughly eight hours. Ten random bits stop
        casual counting; they do not stop a search with a target in mind, and they do nothing for
        IDs that have already leaked. This class of bug is called an insecure direct object reference (IDOR),
        and broken access control of this kind sits at the top of the OWASP Top Ten for good
        reason. The bug was not in authentication. The caller was a genuine, logged-in customer.
        The missing check was the relationship: is this caller the order’s customer?
      </p>
      <p>
        The fix has layers, in order of importance. First, the handler calls{' '}
        <code>can_view_order</code>, and returns 404 rather than 403 when it fails, so that the
        response does not confirm which IDs exist. Second, we make the check hard to forget by
        putting it in the data access layer: customer-facing code never calls “load order by ID”,
        only “load order by ID for this principal”, which adds <code>AND customer_id = :caller</code>{' '}
        to the query. A missing check then shows up as a function that does not exist rather than
        a line someone forgot. Third, a test that runs every customer endpoint with a second
        customer’s token and expects 404, so a new endpoint without the check fails CI.
      </p>
      <p>
        Making IDs fully random (128-bit UUIDs instead of Dabba’s layout) is often proposed as the
        fix. It would make the narrowed search impractical, at the cost of the shard routing and
        index locality the IDs chapter wanted, and it is still not a fix.
        IDs leak: they appear in shared links, screenshots, support tickets and logs. An endpoint
        that returns any order to anyone holding its ID is only as private as every place the ID
        has ever been written. The check is the fix; the unguessable ID buys time when the check
        is missing somewhere.
      </p>
      <p>
        The costs of the fix are worth naming. Every query now carries the caller, which
        complicates code that legitimately crosses customers, such as support tools and batch jobs.
        Those get separate, explicitly named access paths with their own audit logs, so the
        exception is visible rather than accidental. And per-relationship checks sometimes need
        data the handler did not have, such as the current assignment, which is another read on
        the request path.
      </p>

      <h3>A webhook is an anonymous request until you prove otherwise</h3>
      <p>
        Dabba does not handle card numbers. Customers pay on the payment provider’s hosted page
        or SDK, which keeps card data out of Dabba’s systems and most of the card industry’s
        compliance scope with it. When the provider captures a payment, it calls Dabba’s webhook,{' '}
        <code>POST /webhooks/payments</code>, with a body like{' '}
        <code>{`{"event": "payment.captured", "order_id": 9182, "amount": 41800}`}</code>.
        On that message, Dabba marks the order paid and sends it to the restaurant. The writes
        chapter built this handler to cope with webhooks that arrive late, twice or out of order,
        with a reconciliation job behind it for those that never arrive. Here the question is a
        different one: who sent it.
      </p>
      <p>
        That endpoint is on the public internet, and anyone can send it a request. If the handler
        trusts the body, anyone can mark their own order paid and eat for free. The provider solves
        this by signing each webhook: it computes an HMAC of the raw request body (and usually a
        timestamp) with a secret shared only with Dabba, and sends the result in a header. Dabba
        recomputes the HMAC and compares.
      </p>
      <pre><code>{`def verify(raw_body: bytes, header_sig: str, header_ts: str, secret: bytes):
    if abs(now() - int(header_ts)) > 300:          # 5 min: blocks replays
        return False
    expected = hmac_sha256(secret, header_ts.encode() + b"." + raw_body)
    return constant_time_equals(expected, header_sig)`}</code></pre>
      <p>
        Three details in those lines are where real integrations go wrong. The signature is over
        the raw bytes as received; a framework that parses the JSON and re-serialises it changes
        whitespace or key order and the signatures stop matching, and someone under pressure
        “temporarily” disables the check. The comparison is constant-time, so an attacker cannot
        learn the signature byte by byte from response timings. And the timestamp check, plus
        recording each event ID as processed, stops someone from replaying a genuine old webhook
        (say, a captured ₹418 payment) against a new order.
      </p>
      <p>
        Dabba adds one more step for money: before marking an order paid, the handler asks the
        provider’s API for the payment’s status by its ID and checks the amount and the order
        reference. That costs an extra call per payment, about 42 a second in the dinner hour and
        150 at the design target, and it turns
        a forged or misrouted webhook into a harmless no-op. The same idea applies to any
        message that triggers an irreversible effect: treat the message as a hint that something
        happened, and confirm it with the source.
      </p>

      <h3>Secrets, and the places they leak from</h3>
      <p>
        Dabba holds a handful of secrets that would be expensive to lose: the payment provider API
        key (which can issue refunds), the webhook signing secret, the SMS gateway key, database
        credentials, and the key that signs access tokens. Each needs a home, an owner and a way
        to be replaced.
      </p>
      <p>
        The home is a secret manager (the cloud provider’s or a dedicated one), not a config file
        in the repository and not an environment variable baked into an image. Services fetch
        secrets at start-up with their own workload identity, so the notification service can read
        the SMS key and cannot read the payment key. That is least privilege, and it limits what a
        compromised notification service can do.
      </p>
      <p>
        The mobile apps cannot hold secrets at all. Anything shipped in an APK or IPA can be
        extracted by anyone with the file. So the apps hold only keys that are designed to be
        public (a maps SDK key restricted to Dabba’s app signature, a payment provider’s
        publishable key), and anything privileged happens on Dabba’s servers. A design that
        needs the app to call the SMS gateway directly is a design with a public SMS key.
      </p>
      <p>
        Replacement is the part teams skip until they need it. Suppose a developer commits the
        payment API key to a public repository by mistake. Deleting the commit does not help:
        scanners find keys in public repositories within minutes, and the key is in clones and
        caches. The only fix is rotation, and rotation must not cause an outage. The pattern is to
        support two valid secrets at once: create the new key, deploy services that use it,
        confirm traffic has moved, then revoke the old one. For the webhook secret, Dabba
        verifies against both old and new for the overlap period. A rotation that has been
        rehearsed takes an hour. One that has not tends to be done at 2 a.m. while the old key is
        being used to issue refunds to strangers.
      </p>
      <p>
        Inside Dabba’s network, services talk over TLS and authenticate each other, typically
        with mutual TLS issued by a service mesh or the platform. The point is not that the
        network is hostile today, but that “internal” stops meaning “trusted” the first time any
        one service is compromised.
      </p>

      <h3>What would make us revisit this</h3>
      <p>
        These decisions fit a consumer app with three roles. They change when the shape of access
        changes. Corporate meal accounts, where a company admin sees all employees’ orders, add a
        new relationship and a new kind of tenant, and the single-function rule earns its keep.
        A support team of hundreds needs just-in-time access, field masking and audit review, not
        a role that reads everything. India’s Digital Personal Data Protection Act places duties
        on how long personal data is kept and what it is used for, which argues for deleting
        delivery addresses from old orders and for keeping analytics on pseudonymous IDs.
        And if Dabba ever stores card data itself, the compliance scope grows by an order of
        magnitude; the hosted payment page is worth a lot of product compromise to avoid that.
      </p>
      <p>
        Equally, some controls are not worth it at Dabba’s scale. A full policy engine with its
        own language is overkill for four roles and a dozen resource types; a tested function per
        resource is easier to read. Revisit when the number of rules outgrows what one person can
        hold in their head.
      </p>
      <Callout>
        Authentication tells you who sent the request. Every endpoint must still ask whether this
        caller has a relationship with this object right now, and that question belongs in one
        place per resource, enforced where the data is read.
      </Callout>
      <p>
        So far each chapter has assumed that the services Dabba depends on answer promptly. The
        next chapter, on designing for failure, takes that away: the payment provider slows down
        at dinner peak, and we follow the slowness as it spreads, and design the timeouts,
        retries, breakers and fallbacks that stop it.
      </p>
      <Notes
        items={[
          'A signed token cannot be revoked before it expires, so keep access tokens short and make consequential actions read current state.',
          'Roles say which endpoints a caller may use; the relationship to the specific object decides whether they may use it on this one.',
          'Put each resource’s access rule in one tested function and enforce it in the data access layer, returning 404 on failure.',
          'Unguessable IDs slow enumeration but are not access control, because IDs leak.',
          'Verify webhooks with an HMAC over the raw body, a timestamp window and event deduplication, then confirm money events with the provider.',
          'Secrets live in a manager, are scoped per service, never ship in a mobile app, and can be rotated with two valid at once.',
        ]}
      />
    </>
  ),

  /* ── Designing for failure ───────────────────────────────────── */
  failure: (
    <>
      <p>
        This chapter lets you predict how a slow dependency turns into a full outage, and design
        the small set of mechanisms that stop it: timeouts, careful retries, circuit breakers,
        bulkheads, load shedding and planned degradation. Each one is a way of giving up on some
        work early so that the rest can finish.
      </p>
      <p>
        The situation is a Friday in Dabba. At 20:25, near the top of the dinner peak, the payment
        provider’s latency rises. Its p99, normally around 300 ms, reaches 8 seconds. It is not
        down; most calls still succeed, slowly. By 20:31 Dabba’s checkout is failing, which is
        expected. What is not expected is that restaurant menus will not load, order tracking
        shows spinners, and riders cannot mark orders as picked up. None of those touch the
        payment provider.
      </p>
      <p>
        We will work out why, then design the defences, then replay the evening with them in
        place. First, though, we need to say what “working” means, because every defence in this
        chapter trades some failures for others.
      </p>

      <h3>Decide what “working” means before the incident</h3>
      <p>
        A service level indicator (SLI) is a measurement of something users notice, and a service
        level objective (SLO) is the target for it. The first chapter set Dabba’s: placing an order
        answers within 1.5 s at the 99th percentile (not counting time in the customer’s UPI app),
        and 99.95% of order attempts between 11:00 and 23:00 succeed. The gap between the
        objective and 100% is the error budget: at a million orders a day, about 500 failed
        attempts a day before the objective is missed. That is a small budget, and an evening like
        the one below can spend a week of it in minutes.
      </p>
      <p>
        SLOs matter here for one reason. During an incident the system will be making choices
        about which requests to fail, and those choices need a ranking. Dabba ranks them as
        follows: rider actions (pickup, delivery confirmation) above checkout, checkout above order
        tracking, tracking above browsing, browsing above recommendations. A rider stuck at a
        restaurant door is worse than a customer seeing a generic menu instead of a personalised
        one. That ranking will reappear in every mechanism below.
      </p>

      <h3>Why a slow payment provider stopped the menus</h3>
      <p>
        Little’s law says that the number of requests in progress equals the arrival rate times
        the time each one takes. It is the most useful single equation for this kind of incident.
      </p>
      <p>
        The writes chapter already learned part of this lesson: a database transaction no longer
        waits on the payment provider, so the connection pool survives a slow provider. The
        request slots do not. Each of Dabba’s 30 API servers handles checkout, order tracking and
        the rider actions, with, say, 200 concurrent request slots. Take a festival evening near
        the design target of 150 orders a second: each server receives about 5 checkouts a
        second, each making a payment-creation call, and about 330 other requests a second (the
        10,000 a second design target spread over 30 servers), each taking around 20 ms. Normally
        the payment calls occupy 5 × 0.3 s = 1.5 slots and the other requests 330 × 0.02 s ≈ 7.
        Under ten of 200 slots busy; plenty of headroom.
      </p>
      <p>
        Now the payment calls take 8 seconds. They occupy 5 × 8 = 40 slots. Still fine, it seems.
        But customers whose checkout spins for 8 seconds tap “Pay” again, and the app has its own
        retry, so checkout arrivals triple: 15 a second, holding 120 slots. The extra calls load
        the provider further, its latency drifts towards 12 seconds, and the payment calls hold
        180 slots. The remaining 20 slots must carry 330 other requests a second, which works
        only if each finishes in 60 ms; each request now also waits for a free slot, so its time
        grows, so it holds its slot longer. Within a minute every slot is waiting on the payment provider and
        every tracking and rider request is queued behind them. The slots were shared, so the
        slowness was shared.
      </p>
      <p>
        There is a second, quieter effect. The menu service does not call the payment provider,
        but the API gateway in front of everything has its own connection pool and timeouts. As
        order-service requests hang, gateway connections hang with them, and the gateway’s
        capacity to serve menu requests shrinks too. Then health checks start failing on the
        busiest order-service instances, the load balancer removes them, and the survivors receive
        their traffic. The defences we already had (retries, health checks) pushed the failure
        outwards.
      </p>

      <h3>A timeout is a decision about what a request is worth</h3>
      <p>
        The first defence is to stop waiting. Most HTTP clients default to very long timeouts,
        sometimes none at all. A timeout should come from the budget of the request it serves. The
        order SLO allows 1.5 seconds at p99. The order service needs some of that for its own
        transaction, the app needs some for the network, and the payment-creation call gets the
        rest. With the provider’s normal p99 at 300 ms, a 500 ms timeout cuts off only the
        slowest few calls in a thousand and leaves room for one retry inside the 1.5-second
        budget.
      </p>
      <p>
        Timeouts along a call chain must shrink as they go deeper. If the app gives up after 3
        seconds but the order service waits 10 seconds for the provider, the order service keeps
        working (and holding a slot) for 7 seconds after anyone is waiting for the answer. That
        is pure waste at exactly the moment capacity is scarce. A simple way to enforce this is to
        pass a deadline with each request (“answer needed by 20:31:04.200”) and have each service
        refuse to start work that cannot finish in time.
      </p>
      <p>
        A payment timeout raises a harder question than most: when the call times out, did the
        payment happen? We do not know. The provider may have charged the card and the response
        was lost, or the request may never have arrived. The order service must not tell the
        customer “payment failed”, because they may pay again and be charged twice. It records
        nothing new: the order simply stays in <code>PAYMENT_PENDING</code>, the app shows
        “confirming your payment”, and the webhook handler and reconciliation job from the writes
        chapter settle it, using the order ID that Dabba passed as the provider’s idempotency key. A timeout ends our waiting; it does not end the
        operation.
      </p>
      <Predict q={<>The Dabba app retries a failed checkout call up to 3 times. The order service retries a failed payment call up to 3 times. The payment client library, configured by a different team, also retries up to 3 times. The provider is overloaded and failing. How many calls reach the provider for one customer tap?</>}>
        <p>
          Twenty-seven. Each of the app’s 3 attempts produces 3 order-service attempts, and each of
          those produces 3 client-library attempts: 3 × 3 × 3. On an ordinary dinner hour of 42
          orders a second, the provider receives up to about 1,130 calls a second from Dabba
          instead of 42, at the moment it is already failing because of load.
        </p>
        <p>
          Retries look harmless at each layer, because each layer sees only its own three. The
          multiplication is only visible from above. The fix in the next section is to retry at
          one layer only, and to budget those retries.
        </p>
      </Predict>
      <Fig caption="Fig · Three layers that each retry three times turn one tap into twenty-seven calls on a provider that is already overloaded">
        <RetryAmplification />
      </Fig>

      <h3>Retry once, at one layer, with backoff, jitter and a budget</h3>
      <p>
        Retries are worth having. Many failures are brief: a connection reset, a pod restarting,
        one bad host behind the provider’s load balancer. A single retry turns most of these into
        successes the customer never sees. The danger is in retrying the wrong failures, too soon,
        at too many layers.
      </p>
      <p>
        Dabba’s rules for the payment call are these. Only the order service retries; the app and
        the client library are configured not to, and the app shows a clear state instead of
        retrying silently. The order service retries only errors that suggest the request did not
        take effect or that a retry might succeed (connection failures, 503, 429), never a decline
        or a validation error. Every attempt carries the same idempotency key, so a retry after an
        unknown outcome cannot charge twice. And retries wait: exponential backoff with full
        jitter, meaning each wait is a random time between zero and a growing cap.
      </p>
      <pre><code>{`delay = random.uniform(0, min(cap, base * 2 ** attempt))
# base = 100 ms, cap = 1 s  →  attempt 0: 0–100 ms, 1: 0–200 ms, 2: 0–400 ms`}</code></pre>
      <p>
        The jitter matters more than it looks. When the provider has a two-second blip, a few
        hundred Dabba requests fail in the same instant. Without jitter, they all retry after
        exactly 100 ms, arriving as a synchronised burst, then again at 200 ms, and so on. The
        provider sees spikes at the moments it is trying to recover. With jitter, the same retries
        are spread across each interval and arrive as a gentle increase. The AWS Builders’
        Library article on timeouts and backoff shows this effect with simulations and is worth
        reading for the plots alone.
      </p>
      <p>
        Finally, a retry budget. The order service tracks the ratio of retries to first attempts
        over the last few seconds and stops retrying once retries exceed, say, 10% of calls. When
        the provider is having a brief blip, the budget is not reached and retries help. When the
        provider is failing broadly, the budget caps Dabba’s extra load at 1.1× normal rather than
        3× or 27×. Retries help when failures are rare and hurt when they are common, and the
        budget switches between those cases automatically.
      </p>

      <h3>Circuit breakers: stop calling what is not answering</h3>
      <p>
        Timeouts and budgets bound the damage per call. When the provider is clearly unhealthy,
        we would rather not call it at all for a while. A <strong>circuit breaker</strong> wraps
        the payment client and watches outcomes. While failures are rare it is closed and calls
        pass through. When the failure rate crosses a threshold (for example more than half of the
        last 50 calls failed or timed out, within 10 seconds) it opens: calls fail immediately,
        without touching the network. After a cool-down it lets a few probe calls through; if they
        succeed it closes, and if not it opens again.
      </p>
      <Fig caption="Fig · A breaker refuses calls while the dependency is failing and probes before trusting it again">
        <CircuitStates />
      </Fig>
      <p>
        An open breaker is only useful if failing fast leads somewhere better than failing slowly.
        For Dabba the breaker’s open state triggers a fallback for checkout. Dabba integrates a
        second payment provider for UPI and cards, used for a small share of traffic normally so
        that it stays warm and tested. When the primary’s breaker opens, new checkouts go to the
        secondary. If both are failing, there is a further option that the first chapter left out
        of scope on purpose: cash on delivery. Offering it only while both breakers are open, and
        only to customers whose account history makes it a reasonable risk, is a product decision
        we make here, and it has a price. Riders must carry and reconcile cash, a share of cash
        orders are refused at the door after the food is cooked, and the payout and support
        processes need a cash path that is otherwise unused. In exchange, “cannot order dinner”
        becomes “pay the rider”. Dabba accepts that trade for outages of the payment providers and
        for nothing else.
      </p>
      <p>
        Breakers have their own failure modes. A breaker with too low a threshold opens on a
        handful of unlucky timeouts and sends traffic to the more expensive secondary for no
        reason. A breaker per process sees only that process’s calls; with 30 API servers each
        seeing about 1.4 calls a second in an ordinary dinner hour, each breaker has little data
        and they open at
        different times. Dabba sets thresholds from the provider’s normal error rate (a few tenths
        of a percent) with a minimum call count before the breaker may open, and exports breaker
        state as a metric so the 30 servers’ breakers can be seen together.
      </p>

      <h3>Bulkheads: keep the payment problem inside the payment pool</h3>
      <p>
        The menus failed because one pool of request slots was shared by work with very different
        dependencies. A <strong>bulkhead</strong>, named after the walls that divide a ship’s hull
        so that one leak does not sink it, gives each dependency its own bounded pool. In the order
        service on each server, payment calls get at most 30 concurrent slots. If those are full, a new checkout
        is refused immediately with “payments are slow, try again in a minute” (or routed to the
        fallback) instead of taking a slot from tracking and rider actions.
      </p>
      <p>
        Where does 30 come from? Little’s law again. Normal need at the design target is 1.5
        slots; 5 checkouts a second at a slow but survivable 2 seconds each need 10, and with the
        retry allowance about 11. Thirty leaves room for a bad minute, while guaranteeing that at
        least 170 slots stay available for everything else. The cost is that during a real
        surge of healthy checkouts, the pool may refuse some that would have succeeded. Sizing a
        bulkhead is choosing which mistake to make.
      </p>
      <p>
        Bulkheads also apply at larger scale. Rider actions can run on a separate deployment of
        the order service, with its own instances and its own database connection pool, so that
        nothing a customer does can starve the riders. That doubles some operational work, which
        is why it is usually done only for the traffic ranked highest.
      </p>

      <h3>Shed load before the queues grow</h3>
      <p>
        Even with timeouts, retries, breakers and bulkheads, there are evenings when total demand
        simply exceeds capacity: a festival, a cricket final, a rain storm across Mumbai. If every
        request is accepted, every request waits in a queue, and when the wait exceeds the
        client’s timeout, the server finishes work nobody is waiting for. Throughput stays high
        while useful throughput (goodput) falls towards zero.
      </p>
      <p>
        <strong>Load shedding</strong> refuses some work early, deliberately, so the rest completes
        in time. Each service watches a signal of overload, such as concurrent requests or the
        time requests spend queued, and when it crosses a limit, rejects the lowest-priority
        requests first with a fast 503. Dabba tags each request with a priority at the gateway
        from the ranking above, so the order service sheds recommendation and browsing calls
        before tracking, and tracking before checkout and rider actions. A rejected request costs
        microseconds; a request that times out after queueing for 5 seconds costs a thread for 5
        seconds and still fails.
      </p>
      <p>
        Degradation is the planned version of shedding: each feature has a cheaper mode that the
        system can switch to by flag when under pressure.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Degraded mode</th><th>What the user loses</th><th>What it saves</th></tr>
          </thead>
          <tbody>
            <tr><td>Generic restaurant list instead of personalised ranking</td><td>relevance</td><td>the recommendation service’s whole load</td></tr>
            <tr><td>Menus from a cache up to 10 minutes old</td><td>occasional stale price or item</td><td>most menu database reads</td></tr>
            <tr><td>Rider location every 10 s instead of 5 s</td><td>smoothness of the tracking map</td><td>half of 10,000 writes/s</td></tr>
            <tr><td>Customer map falls back from SSE to a poll every 30 s</td><td>smoothness of the live map</td><td>open connections and per-update fan-out</td></tr>
            <tr><td>Pause new orders in one overloaded zone</td><td>ordering, for that zone only</td><td>rider and kitchen capacity for orders already placed</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Each mode is built and tested in advance. A degraded mode invented during an incident is
        new, untested code deployed under pressure, which is how one incident becomes two. Dabba
        runs each switch in production on a quiet afternoon every quarter to check that it still
        works and still saves what it claims.
      </p>

      <h3>The same Friday, with the defences in place</h3>
      <p>
        Replay the evening. At 20:25 the provider’s latency climbs. Payment calls start hitting
        the 500 ms timeout; those orders stay in payment-pending and the reconciliation job
        settles them within a couple of minutes, so no customer is told “failed” for a charge
        that went through. Retries rise, reach the 10% budget within seconds, and stop. The app,
        no longer retrying on its own, shows “confirming payment”.
      </p>
      <p>
        At 20:26 the bulkhead fills: 30 payment calls in flight on each server. New checkouts
        beyond that are refused quickly. Tracking and rider actions keep their own slots and do not notice.
        Menus load normally, because nothing is holding gateway connections for 8 seconds any
        more. At 20:27 the breaker’s failure rate crosses its threshold and it opens; new
        checkouts go to the secondary provider. Checkout latency is slightly higher and a few
        percent of customers whose saved payment method only works with the primary are asked to
        choose another. At 20:40 the breaker’s probes succeed; it closes and traffic returns to
        the primary.
      </p>
      <p>
        The cost of the evening: some checkouts refused during the first minutes, a higher
        transaction fee on the secondary for fifteen minutes, and a few hundred payments left
        pending for a minute or two before reconciliation settled them. The evening spent several
        days of error budget, which is what the budget is for. Without the
        defences, the cost was the whole of Dabba for the same fifteen minutes.
      </p>

      <h3>When these tools hurt</h3>
      <p>
        Each mechanism adds a new way to fail. A fallback to a secondary provider is a second
        integration that must be kept working; one that has not carried real traffic for months
        will fail when it is needed, which is why Dabba sends it a small share all the time. Load
        shedding thresholds set too low refuse traffic on a normal busy evening. Breakers that
        open on a dependency’s brief blip cause more disruption than the blip. Timeouts set from
        guesses rather than measured latency either never fire or fire on healthy calls.
      </p>
      <p>
        The principle for when not to add them is proportion. A service with one dependency and
        modest traffic needs timeouts and a single retry, not a breaker and three pools. Add each
        mechanism when a specific failure in this chapter’s style (walk it through, step by step,
        with Little’s law) shows that it would have changed the outcome. Revisit the numbers after
        each incident: the thresholds that were right at 10 cities will be wrong at 50.
      </p>
      <Callout>
        Concurrency equals arrival rate times latency. When a dependency slows down, the request
        slots waiting on it multiply, and anything sharing those slots fails with it. Every mechanism
        in this chapter exists to put a bound on that product.
      </Callout>
      <p>
        This chapter dealt with one dependency failing while Dabba itself was healthy. The next
        chapter, on multi-region design, asks the larger question: what if the whole region Dabba
        runs in becomes unavailable, and is it worth paying to survive that?
      </p>
      <Notes
        items={[
          'Use Little’s law to predict an incident: a dependency that gets 25× slower needs 25× the request slots waiting on it.',
          'Derive timeouts from the request’s deadline, shrink them down the call chain, and treat a timed-out payment as pending, not failed.',
          'Retry at one layer only, with the same idempotency key, full jitter and a retry budget of about 10%.',
          'A circuit breaker is useful only if the open state leads to a tested fallback.',
          'Bulkheads give each dependency its own bounded pool so its slowness cannot take request slots from unrelated work.',
          'Shed the lowest-priority work first and build degraded modes before the incident that needs them.',
        ]}
      />
    </>
  ),

  /* ── Multi-region and disaster recovery ──────────────────────── */
  multiregion: (
    <>
      <p>
        This chapter lets you decide whether Dabba should run in more than one region, choose
        between the main ways of doing it, and estimate what each costs in money, complexity and
        lost orders. The honest answer for many systems is “not yet”, and the chapter should leave
        you able to defend that answer as well as the opposite one.
      </p>
      <p>
        Dabba today runs in one cloud region, in Mumbai, spread across three availability zones
        (separate data centres a few kilometres apart, with independent power and networking). A
        board member asks a reasonable question after reading about a cloud outage: “What happens
        to Dabba if the Mumbai region goes down at dinner?” The truthful answer is that Dabba stops,
        everywhere, until the region returns. Whether that is acceptable is a business question
        with an engineering price attached. Our job is to make the price clear.
      </p>

      <h3>Put a number on an hour without Dabba</h3>
      <p>
        Start with what an outage costs. The brief from the first chapter gives about a million
        orders a day, 15% of them in the dinner hour: about 150,000 orders, 42 a second. With an
        assumed average order of ₹400, that is about ₹6 crore of orders in the hour, of which
        Dabba’s commission might be a fifth: about ₹1.2 crore of revenue, plus the harder-to-price loss of restaurants and riders who had a
        bad evening and customers who installed a competitor.
      </p>
      <p>
        Now the likelihood. Losing a single zone is a routine event over a year; losing a whole
        region for hours is rare, with major providers having a handful of notable regional
        incidents across all their regions per year. Suppose Dabba should expect one multi-hour
        regional outage every few years. A second region costs, at minimum, a standing copy of the
        data and the capacity to take over, and in practice a large share of the engineering
        team’s attention for a year to build and then a steady tax to keep working. Spread over
        years, the expected loss from regional outages may be smaller than the cost of preventing
        them.
      </p>
      <p>
        That arithmetic changes with scale and with promises. If Dabba grows to 50 cities and
        three million orders a day, the hour costs three times as much. A contract with a large restaurant chain or a
        corporate meals customer may include an availability commitment. A regulator may ask for
        a tested disaster-recovery plan. And reputation does not scale linearly: one long outage
        on the evening of a cricket final is remembered for longer than its revenue suggests. The
        decision should be revisited when any of these change, not made once.
      </p>
      <p>
        Before any of that, there is a cheaper step that covers the common case. Running every
        tier across three zones, with databases replicating synchronously between zones and
        capacity to lose one zone without autoscaling, survives the failures that actually happen
        most years. Many teams who believe they need two regions have not yet finished doing this
        well in one.
      </p>

      <h3>Two numbers per kind of data</h3>
      <p>
        Disaster recovery is specified with two numbers. The recovery point objective (RPO) is how
        much recent data we can afford to lose, measured in time: an RPO of 5 seconds means
        anything written in the 5 seconds before the disaster may be gone. The recovery time
        objective (RTO) is how long until service is back. Both have a price, and the price falls
        steeply as the numbers relax. The useful move is to set them separately for each kind of
        data, because Dabba’s data is not equally precious.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Data</th><th>If lost</th><th>Reasonable RPO</th><th>Recovery approach</th></tr>
          </thead>
          <tbody>
            <tr><td>Orders and payments</td><td>customers charged for food that never comes</td><td>seconds</td><td>continuous replication; reconcile the gap with the provider</td></tr>
            <tr><td>Rider payouts ledger</td><td>riders paid wrongly</td><td>seconds</td><td>replicated; rebuildable from orders and bank records</td></tr>
            <tr><td>Menus and restaurants</td><td>recent menu edits lost</td><td>minutes</td><td>replicated; restaurants re-edit</td></tr>
            <tr><td>Rider live locations</td><td>nothing lasting</td><td>not applicable</td><td>rebuilt from the next pings in 5 seconds</td></tr>
            <tr><td>Dish photos</td><td>broken images</td><td>hours</td><td>object storage replicated across regions</td></tr>
            <tr><td>Analytics events</td><td>gaps in dashboards</td><td>hours</td><td>replay from the source of truth</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        This table already reduces the problem. Of the 10,000 rider location writes a second,
        none need to cross a region at all; the new region rebuilds its geo index from pings
        within seconds of riders being routed to it. The part that needs care is small in volume
        (tens of order and payment writes a second) and large in consequence.
      </p>

      <h3>The map is drawn by data residency</h3>
      <p>
        Before choosing a design, check where the data may live. India’s rules here come from
        more than one place. The Reserve Bank of India’s 2018 directive on storage of payment
        system data requires payment system operators to store that data only in India, and
        payment providers typically pass matching obligations to merchants in their contracts.
        The Digital Personal Data Protection Act allows transfers of personal data abroad except
        to countries the government restricts, but sector regulators can be stricter, and
        enterprise customers often require Indian hosting in their contracts. The legal detail
        belongs to counsel. The design consequence is simple: Dabba’s second region should also be
        in India.
      </p>
      <p>
        That is convenient. Cloud providers offer more than one Indian region (AWS has Mumbai and
        Hyderabad, Google Cloud has Mumbai and Delhi, Azure has several), and the regions are
        close. Mumbai to Hyderabad is a few hundred kilometres; a round trip between regions is on
        the order of 15 to 25 ms, compared with 100 ms or more between continents. At that
        distance some choices that are impractical elsewhere, such as waiting for a remote copy
        before confirming a payment write, cost tens of milliseconds rather than hundreds.
      </p>

      <h3>Active-passive: a standby you have to keep honest</h3>
      <p>
        In <strong>active-passive</strong>, Mumbai serves all traffic and Hyderabad holds a
        continuously updated replica of the databases, plus enough infrastructure to take over.
        Replication is asynchronous, so writes are confirmed to customers as soon as Mumbai has
        them. Failover means: decide that Mumbai is gone, promote the Hyderabad replicas to
        primaries, start or scale up the services there, and point traffic at them.
      </p>
      <Predict q={<>Dabba runs active-passive with asynchronous replication. At the dinner peak, replication lag to Hyderabad averages about 2 seconds. Mumbai becomes unreachable at 20:15:00. Roughly how many orders are affected, and what state are they in?</>}>
        <p>
          At about 42 orders a second, the last 2 seconds hold around 85 orders that Mumbai
          confirmed and Hyderabad never received. Some of those customers saw “order placed” and
          were charged by the payment provider; some restaurants received the order on their
          tablets and started cooking. In Hyderabad, after failover, those orders do not exist.
        </p>
        <p>
          The design must be able to find and repair them. The payment provider still has the
          captured payments with Dabba’s order references, so a reconciliation job after failover
          lists captures with no matching order and either recreates the order (if the restaurant
          has it) or refunds it. This is one reason earlier chapters insisted on idempotency keys
          and references that live outside Dabba: they make the lost tail recoverable. Lag also
          rises under load, so the RPO is worst exactly at peak, which is when to measure it.
        </p>
      </Predict>
      <p>
        The RTO of active-passive is the sum of steps people tend to underestimate: noticing the
        outage and deciding it is regional rather than a blip (a few minutes, and the decision is
        usually made by a person), promoting databases (a minute or two), scaling up services if
        the standby was kept small (several minutes, if the cloud’s control plane is healthy),
        moving traffic (DNS changes take effect as resolvers’ caches expire, so a 60-second TTL
        means a few minutes in practice), and warming cold caches while traffic arrives. Fifteen
        to thirty minutes is a realistic first target; under five requires most of this to be
        automated and rehearsed.
      </p>
      <p>
        The standby’s main weakness is that it serves no traffic, so nothing tells you when it has
        stopped working. Configuration drifts: a new service is deployed to Mumbai and nobody adds
        it to Hyderabad. A secret is rotated in one region’s secret manager only. The standby was
        sized for last year’s traffic. Each of these is found on the day of the disaster unless it
        is found earlier on purpose.
      </p>

      <h3>Active-active, and why Dabba can home cities</h3>
      <p>
        In <strong>active-active</strong>, both regions serve traffic. The difficulty is writes. If
        a customer’s order can be modified in both regions at once, the two regions must either
        coordinate on every write (paying the inter-region round trip each time) or accept
        conflicting writes and merge them later, which for orders and payments is not acceptable.
        Most systems that call themselves active-active avoid the problem by giving every piece of
        data one home region at a time.
      </p>
      <p>
        Dabba has an unusually clean way to do this, because almost everything it does is local
        to a city. A Bengaluru order involves a Bengaluru customer address, a Bengaluru restaurant
        and a Bengaluru rider. So each city is homed in one region, and the region holds what the
        city writes: the logical order shards for that city’s restaurants, and its riders in the
        region’s rider store. Everything is replicated asynchronously to the other region. A thin
        routing layer maps each request to a city (by the delivery address, the restaurant or the
        rider’s registered city) and sends it to that city’s home.
      </p>
      <p>
        Notice that the city is not the shard key. The sharding chapter rejected city as a key,
        because Bengaluru alone would overload one database at a cricket-final peak, and chose a
        hash of <code>restaurant_id</code> over 8,192 logical shards. City homing is a placement
        layer above that key: it decides which region a logical shard lives in, while the hash
        still decides which logical shard a restaurant’s orders live in, and Bengaluru still
        spreads over many databases inside its region. The two nest because a restaurant belongs
        to exactly one city. They nest cleanly only if each logical shard holds restaurants of a
        single city, which a plain hash over all 8,192 does not give; the fix is to give each city
        a block of logical shards in proportion to its size and hash a restaurant within its
        city’s block. Since every order id carries its logical shard in 13 bits, this is a choice
        to make before ids are issued, not after: moving a restaurant to a different logical shard
        later would leave its old order ids pointing at the wrong place.
      </p>
      <Fig caption="Fig · Each city is written in exactly one region and replicated to the other. Moving a city is the unit of failover">
        <CityHoming />
      </Fig>
      <p>
        A small amount of data is not city-shaped: customer accounts, saved addresses, payment
        method references, and the customer who orders in Mumbai on Monday and Pune on Friday.
        The <code>customer_orders</code> table, sharded by customer id, is derived from the order
        shards, so each region can rebuild its copy from the order events of both. The rest are
        global but small and rarely written. They can be homed in one region and read
        from replicas everywhere, accepting that a profile edit in the non-home region takes one
        inter-region round trip.
      </p>
      <p>
        When a region fails, its cities are re-homed to the survivor: fence the old home so it
        cannot accept writes if it comes back confused, promote the replicas of those cities, and
        update the routing entries. The orders lost in replication lag are the same tail as in
        active-passive, and are repaired the same way. What active-active buys is that the
        surviving region was already running hot, with warm caches, current configuration and
        proven deployment. It is not a standby that might not work; it is production.
      </p>
      <p>
        The step that needs the most care is “fence the old home”. Imagine Mumbai is not dead but
        cut off: its servers run, but the rest of the world cannot reach them reliably. Hyderabad
        takes over Jaipur and starts accepting Jaipur orders. Some Jaipur riders’ apps, on
        networks that can still reach Mumbai, keep talking to it, and Mumbai keeps accepting
        their updates. Now two regions both believe they own Jaipur, and the same order can be
        assigned to two riders, one in each region’s database. Dabba prevents this with an epoch
        number per city, stored in a small, strongly consistent configuration store. Re-homing a
        city increments its epoch, and each region’s database writes for that city carry the
        epoch they were made under; a region holding a stale epoch refuses Jaipur writes until it
        learns the new one. The city-to-region map itself is small enough to be held in every
        region and at the edge, so the router does not become a new single point of failure in
        the region it is meant to route around.
      </p>
      <p>
        The price is capacity and complexity. Each region must be able to carry every city if the
        other fails, so in normal operation each runs at no more than about half its capacity,
        roughly doubling the compute bill relative to one region. Every service must be
        city-aware in its routing. Cross-city features (a corporate account spanning cities,
        nationwide leaderboards) need explicit design. And deployments now go to two regions, which
        the next chapter turns into an advantage: one region becomes a natural canary for the
        other.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Posture</th><th>RPO</th><th>RTO</th><th>Running cost</th><th>Fits Dabba when</th></tr>
          </thead>
          <tbody>
            <tr><td>One region, three zones, tested backups</td><td>minutes (backups) to seconds (zone replicas)</td><td>hours for a regional loss</td><td>1×</td><td>10 cities, no external availability promises</td></tr>
            <tr><td>Pilot light (data replicated, little running)</td><td>seconds</td><td>30–60 min</td><td>~1.2×</td><td>a regulator or contract asks for a DR plan</td></tr>
            <tr><td>Warm standby (scaled-down copy running)</td><td>seconds</td><td>10–30 min</td><td>~1.5×</td><td>an hour of outage clearly costs more than the standby</td></tr>
            <tr><td>Active-active, homed by city</td><td>seconds</td><td>minutes</td><td>~2×, plus engineering</td><td>50 cities, peak hours worth crores, a team to run it</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>A failover nobody has run is a hypothesis</h3>
      <p>
        The value of any of these designs depends on whether failover works on the day, and the
        only evidence is having done it. Here is what Dabba’s first drill, moving the single city
        of Jaipur from Mumbai to Hyderabad at 04:00 on a Tuesday, actually found.
      </p>
      <p>
        The database promotion worked in 90 seconds. Then the Jaipur riders’ apps kept sending
        locations to Mumbai for eleven minutes: the app cached the resolved IP address of the API
        host and ignored the DNS TTL. The payment provider’s webhooks kept going to a hostname that
        pointed only at Mumbai, so payments captured in Hyderabad were not confirmed until someone
        updated the provider’s dashboard by hand. The secret manager holding the SMS key had never
        been replicated, so OTP logins failed in Hyderabad. And the runbook step “scale up the
        assignment workers” called the cloud’s autoscaling API in Mumbai, which, in a real
        regional outage, would not have answered.
      </p>
      <p>
        None of these were exotic. Each was a dependency on the failed region hidden inside the
        recovery path. The fixes followed a principle that the Amazon Builders’ Library calls{' '}
        <strong>static stability</strong>: the surviving region should be able to carry the load
        without making any changes through the control plane during the event. That means the
        capacity is already running, the secrets are already present, the webhook hostname
        already routes to both regions, and the apps reconnect through a global endpoint that
        does not depend on client DNS behaviour.
      </p>
      <p>
        After the fixes, the drill became routine: one small city a month, then a large city a
        quarter, always at low traffic and always timed. The measured RTO becomes the number
        reported to the board, replacing the one in the design document. Moving the city back
        (the fail-back) is drilled too; it is often riskier, because the returning region has cold
        caches and has to catch up on replication before it can take writes.
      </p>

      <h3>When to stay in one region</h3>
      <p>
        At ten cities, with no contractual availability promise and a small team, Dabba should
        probably not build active-active. It should run across three zones in one region, keep
        backups in a second Indian region, restore them on a schedule to prove they work, keep
        infrastructure as code so that the region could be rebuilt, and write down a realistic
        RTO of several hours. That is a defensible position, and it is far better than an
        untested second region that gives false confidence.
      </p>
      <p>
        Note also what multi-region does not fix. It does not help when the cause is a bad deploy,
        a corrupting bug or an expired certificate, because those reach both regions. It does not
        help when a shared dependency, such as the payment provider, fails. For Dabba those causes
        are far more frequent than regional loss. The triggers to revisit the decision are
        specific: an hour of peak outage costing more than a year of the second region, a contract
        or regulator requiring a tested recovery time, or growth to the point where city homing
        is also needed for capacity.
      </p>
      <p>
        That last point about deploys deserves its own chapter. The next one, on shipping safely,
        deals with the cause behind most of Dabba’s real incidents: changes we make ourselves,
        and how to make them in small, reversible steps.
      </p>
      <Notes
        items={[
          'Compare the expected cost of regional outages with the full cost of a second region, and revisit when scale or promises change.',
          'Set RPO and RTO per kind of data; rider locations need no replication, orders and payments need seconds.',
          'Asynchronous replication loses the last few seconds of writes on failover, so design a reconciliation path using references held outside your system.',
          'Active-active is practical when data has a natural home; for Dabba each city is written in one region and the city is the unit of failover.',
          'Static stability means the survivor needs no control-plane changes to take over: capacity, secrets and routes are already in place.',
          'A failover is only as real as its last timed drill, and fail-back needs drilling too.',
        ]}
      />
    </>
  ),

  /* ── Shipping safely ─────────────────────────────────────────── */
  delivery: (
    <>
      <p>
        This chapter lets you change a running Dabba many times a day without the changes being
        the main cause of outages. It covers the pipeline that builds and tests a change, the
        rollout that exposes it gradually, the flags that separate shipping code from turning it
        on, the database migrations that let old and new code run side by side, and the rollback
        that has to work when everything else did not.
      </p>
      <p>
        Here is the kind of incident this chapter is about. On a Tuesday at 19:40, a deploy goes
        out with a change to delivery-fee calculation. It passed its tests. Within minutes, orders
        in Pune are being charged a delivery fee of zero, because the new code reads the city’s
        fee table by a key that Pune’s configuration spells differently. The deploy went to every
        machine at once, so every Pune order is affected. Rolling back takes twenty minutes,
        because the previous build has to be found and redeployed, and by then roughly 2,500
        Pune orders have gone out without a fee.
      </p>
      <p>
        No dependency failed and no region went down. Across the industry, a large share of
        incidents follow a change to code or configuration, and that is good news in one sense:
        unlike hardware failure, the timing and size of changes are under our control.
      </p>

      <h3>What the pipeline must prove, and what it cannot</h3>
      <p>
        Continuous integration runs on every change: compile, unit tests, integration tests
        against real dependencies in containers, static checks, and a scan for secrets and known
        vulnerable libraries. Its output is a single artefact, a container image with an
        immutable version, and that same artefact moves through staging to production. Rebuilding
        for production from the same commit is not the same thing; a dependency may have changed
        in between.
      </p>
      <p>
        It is worth being honest about what tests can catch. They catch logic errors in the cases
        someone thought to write down. The Pune fee bug passed because no test used Pune’s
        configuration, and in general production differs from any test environment in data,
        configuration, traffic shape and scale. Tests reduce the number of bad changes that
        reach production. The rest of this chapter limits how much damage the remaining ones do,
        and how quickly they are undone.
      </p>
      <p>
        Dabba has one constraint that web services do not: mobile apps. A release of the customer
        or rider app cannot be rolled back. Once a phone has version 5.2, it keeps it until the
        user updates, which for some users takes months. So the server must keep working with
        every app version still in meaningful use, API changes must be additive, and the server
        holds a minimum supported version below which the app is asked to update. New app
        features ship turned off and are enabled from the server, which brings us to flags.
      </p>

      <h3>Let a small slice of traffic disagree first</h3>
      <p>
        A <strong>canary</strong> deploy sends a small share of traffic to the new version while
        the rest stays on the old one, compares the two, and only then continues. Dabba’s order
        service rolls out in steps: 1% of traffic, then 10%, then 50%, then all of it, pausing at
        each step and comparing the canary’s metrics against the old version over the same
        minutes. If the canary is worse beyond a threshold, the rollout stops and traffic returns
        to the old version automatically, without waiting for a person to notice a graph.
      </p>
      <p>
        Had the fee change gone out this way, the damage would have been bounded by the canary’s
        share. But only if the canary was measuring the right thing.
      </p>
      <Predict q={<>The order service’s canary runs at 1% of traffic for 10 minutes in the dinner hour (about 42 orders a second). Normally 0.5% of order placements fail. The new version has a bug that doubles that to 1%. Will the canary catch it?</>}>
        <p>
          Almost certainly not. One percent of 42 orders a second is 0.42 a second, about 250
          orders in 10 minutes. At 0.5% we expect one or two failures; at 1%, two or three. Counts that
          small vary by chance as much as they differ, so no sensible threshold separates them.
          The canary passes and the bug ships.
        </p>
        <p>
          At 10% for 15 minutes the canary sees about 3,800 orders: an expected 19 failures
          against 38, which is a clear difference. So the steps are set from the signal, not from
          habit. The 1% step catches what is visible in high-volume signals (crashes, HTTP 5xx
          across all endpoints, latency), where even 1% of traffic is thousands of requests a
          minute. Business metrics such as order failure rate, payment success and average
          delivery fee need the 10% step and enough minutes to accumulate data. A delivery-fee
          check would have caught the Pune bug: the canary’s average fee for Pune was zero.
        </p>
      </Predict>
      <p>
        The comparison should be against the old version running at the same time, not against
        yesterday. Dinner traffic differs from lunch, and a canary judged against last night’s
        numbers will be blamed for the weather. And a canary needs the two versions to be safely
        interchangeable: a customer’s requests may hit old and new versions within one session,
        so both must read and write data in compatible ways. That requirement is what makes
        database changes the hard part of shipping.
      </p>
      <p>
        With two regions, a region is a natural larger step. Dabba deploys to one city first (a
        small one, through city-aware routing), then to one region, then to the other, which also
        means a bad change cannot take out both regions in the same minute.
      </p>
      <p>
        The arithmetic above also says something about when to deploy. At the dinner peak a
        canary gathers evidence fastest, because traffic is highest, but a bad minute then costs
        the most orders. At 15:00 traffic is perhaps a third of peak, so each canary step must
        last about three times as long to see the same number of orders, and a bad minute costs a
        third as much. Dabba chooses the afternoon for anything touching checkout, payments or
        assignment, and accepts slower rollouts as the price. What it does not do is freeze
        deploys for weeks before a festival: a freeze lets changes pile up, and the first deploy
        after it is large, unfamiliar and released by people who have not deployed in a month.
        Small, frequent, well-observed changes are the safer habit, and each deploy is marked on
        the dashboards so that anyone looking at a graph can see which change preceded a bend in
        it.
      </p>

      <h3>Flags separate deploying code from releasing a feature</h3>
      <p>
        Suppose Dabba is building a new rider-assignment algorithm. It takes weeks, it touches the
        busiest path in the system, and the team wants to compare it with the old algorithm on
        real orders. Merging it to the main branch only when finished means a large, risky deploy.
        A <strong>feature flag</strong> lets the code ship in small pieces, turned off. When ready,
        the team turns it on for one city, compares delivery times and rider idle time, then
        widens it. If something goes wrong, turning it off takes seconds and needs no deploy.
      </p>
      <p>
        That last property is why flags are also the main tool for incidents. The degraded modes
        from the failure chapter (generic ranking instead of personalised, slower location
        updates) are flags that operations staff can flip. These operational flags live forever
        and should be tested regularly, unlike release flags, which should be removed once the
        feature is fully on.
      </p>
      <p>
        Flags have costs that grow quietly. Each flag doubles the number of possible
        combinations of behaviour, and nobody tests all of them. A flag left on for two years
        after its feature launched is dead code with a switch attached, and the day someone flips
        it by mistake, a two-year-old code path runs in production. Dabba gives each release flag
        an owner and an expiry date when it is created, and a weekly report lists flags past
        their date. Flag evaluation must also not become a dependency: services cache the flag
        configuration locally and keep using the last known values if the flag service is
        unreachable, and every flag has a safe default.
      </p>
      <p>
        Flags and canaries answer different questions. A canary asks whether the new build is
        healthy: does it crash, is it slower. A flag asks whether the new behaviour is good: do
        deliveries get faster. Most changes need the first; changes to product behaviour need both.
      </p>

      <h3>Change the schema while old and new code both run</h3>
      <p>
        During any rollout, and for the whole of a canary, two versions of the code serve traffic
        against one database. So every schema change has to be compatible with the code before it
        and the code after it. Consider a real Dabba change: orders need a{' '}
        <code>zone_id</code> (the delivery zone within the city), replacing a free-text{' '}
        <code>area</code> column that different services parse differently.
      </p>
      <p>
        The tempting version is one migration and one deploy: add <code>zone_id</code>, fill it,
        drop <code>area</code>, and release code that uses <code>zone_id</code>. During the
        rollout, old instances still read <code>area</code>, which no longer exists, and fail.
        Rolling back does not help, because the column is gone. The safe version is called{' '}
        <strong>expand and contract</strong>, and it takes several deploys.
      </p>
      <Fig caption="Fig · Expand, migrate, contract. Every step leaves the previous version of the code working, and the only irreversible step comes last">
        <ExpandContract />
      </Fig>
      <p>
        First, expand: add <code>zone_id</code> as a nullable column. Old code ignores it. Second,
        deploy code that writes both <code>area</code> and <code>zone_id</code> on every new order
        but still reads <code>area</code>. Third, backfill <code>zone_id</code> for existing rows.
        Fourth, deploy code that reads <code>zone_id</code>, still writing both, and compare the
        two for a while to catch parsing mistakes. Fifth, once nothing reads <code>area</code>,
        stop writing it, and in a later release, drop it. At every step before the last, rolling
        the code back one version is safe, because the previous version’s columns are all still
        there and still being written.
      </p>
      <p>
        The backfill deserves its own arithmetic. At a million orders a day, a year of orders is
        about 365 million rows. A single <code>UPDATE</code> across all of them would hold locks
        and generate an enormous transaction, competing with checkout for hours. Instead the
        backfill runs in batches of a few thousand rows by primary-key range, with a short pause
        between batches, and slows down automatically when replication lag or database latency
        rises. At 5,000 rows every 100 ms, that is 50,000 rows a second, so the year takes about
        2 hours, run overnight. It is boring, it is slow, and it does not cause an incident.
      </p>

      <h3>Walk-through: a millisecond migration that stopped checkout for six minutes</h3>
      <p>
        Even the “expand” step can hurt. Dabba runs PostgreSQL. Adding a nullable column is a
        metadata change that completes in milliseconds, so the team runs{' '}
        <code>ALTER TABLE orders ADD COLUMN zone_id bigint</code> at 19:45. Here is what happens.
      </p>
      <p>
        The <code>ALTER TABLE</code> needs an exclusive lock on <code>orders</code>, briefly. At
        19:45 an analyst’s report has been reading <code>orders</code> for six minutes and holds a
        shared lock. The <code>ALTER</code> waits for it. Every new query on <code>orders</code>,
        including every checkout insert and every tracking read, now queues behind the waiting{' '}
        <code>ALTER</code>, because PostgreSQL grants locks in order. For six minutes, until the
        report finishes, nothing touches the orders table. The migration itself then takes
        milliseconds. From the outside, Dabba was down for six minutes because of a change that
        was correct and fast.
      </p>
      <p>
        The fixes are small and worth making standard. Migrations set a short lock timeout
        (<code>{`SET lock_timeout = '2s'`}</code>), so a blocked migration gives up quickly and retries
        later instead of holding the queue. Long analytical queries run on a replica, not the
        primary. Indexes are built with <code>CREATE INDEX CONCURRENTLY</code>, which does not
        block writes. And schema changes run outside peak hours, through the same pipeline as code,
        reviewed by someone who knows which operations rewrite a table and which take an exclusive
        lock. The cost is process: migrations are slower to land and sometimes need several
        attempts. That is a fair price for not stopping checkout.
      </p>

      <h3>Rollback is a path you build and test</h3>
      <p>
        In the fee incident, rollback took twenty minutes because it was improvised. A rollback
        should be the same operation as a deploy, pointed at the previous artefact, and it should
        be exercised often enough that people trust it. With canaries, most rollbacks are
        automatic and touch only the canary’s share.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Kind of change</th><th>How it is undone</th><th>Time to undo</th><th>What can stop it</th></tr>
          </thead>
          <tbody>
            <tr><td>Server code</td><td>redeploy the previous artefact</td><td>minutes</td><td>the new code wrote data the old code cannot read</td></tr>
            <tr><td>Behaviour behind a flag</td><td>turn the flag off</td><td>seconds</td><td>the flag service unreachable with no local cache</td></tr>
            <tr><td>Configuration</td><td>revert the config version</td><td>seconds to minutes</td><td>config not versioned, changed by hand</td></tr>
            <tr><td>Schema (expand steps)</td><td>usually nothing to undo; old code still works</td><td>none</td><td>a destructive step taken too early</td></tr>
            <tr><td>Mobile app</td><td>cannot be undone; fix forward and disable by flag</td><td>days for a new release</td><td>the feature was not behind a flag</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The first row hides the most common trap. If version 2 writes a new status value,{' '}
        <code>{`'AT_PICKUP_COUNTER'`}</code>, and version 1 does not know it, rolling back to version 1
        leaves orders in a state the running code cannot handle. The rule that prevents this is the
        same one as for schemas: first deploy code that can read the new value, then, separately,
        deploy code that writes it. A change that is only safe to roll forward should be known to
        be so before it ships, and flagged off until the team is ready to commit to it.
      </p>
      <p>
        Configuration deserves the same care as code. The Pune bug was really a configuration
        mismatch, and many large public outages have come from a configuration change pushed
        everywhere at once. Dabba stores configuration in version control, validates it in CI, and
        rolls it out through the same staged process, one city first.
      </p>

      <h3>When the process is heavier than the risk</h3>
      <p>
        All of this costs time. A team of six shipping an internal admin page used by twenty
        support agents does not need a staged canary with automated statistical analysis; it
        needs tests, a quick rollback and someone watching after the deploy. The process should be
        proportional to the blast radius. Checkout, payments, rider assignment and anything that
        touches the orders table get the full treatment. A marketing banner gets a flag and a
        quick look.
      </p>
      <p>
        Expand and contract is the exception: it is never optional for a table that serving code
        reads, because the failure it prevents does not depend on how important the feature is.
        Revisit the rest when incidents tell you to. If several incidents in a quarter came from
        changes that a canary would have caught, the canary is worth its cost. If none did, the
        time might be better spent elsewhere.
      </p>
      <Callout>
        During every rollout, the old and new versions of the code run at the same time against
        the same data. Every change, to code, schema, configuration or messages, has to be safe in
        that overlap, and the irreversible step always comes last.
      </Callout>
      <p>
        That completes the toolkit. The next chapter is a worked design that uses all of it at
        once: we take one Dabba feature, assigning a rider to an order, and design it end to end
        as a design review would, from requirements and numbers to failure modes and rollout.
      </p>
      <Notes
        items={[
          'Build one immutable artefact and promote it; rebuilding for production is not the same build.',
          'Size canary steps from the signal: 1% catches crashes and latency, business metrics need enough orders to show a difference.',
          'Flags separate deploy from release and are the fastest rollback; release flags need owners and expiry dates.',
          'Change schemas by expand, migrate and contract so that every step is compatible with the code before and after it.',
          'Set a lock timeout on migrations and backfill in rate-limited batches, so a correct change cannot stall the orders table.',
          'Mobile releases cannot be rolled back, so the server must support old app versions and new features ship behind flags.',
        ]}
      />
    </>
  ),

  /* ── A worked design, end to end ─────────────────────────────── */
  worked: (
    <>
      <p>
        This chapter lets you run a design review from a one-line feature request to a design
        another engineer can challenge line by line. We use every earlier chapter, but only where
        the feature needs it, and we write each decision down with its alternative and the
        evidence that would change it.
      </p>
      <p>
        The feature is the one at the centre of Dabba: when a restaurant accepts an order, assign
        a rider to deliver it. It looks like a search (find a nearby rider) and is mostly a
        coordination problem (make sure one order gets one rider and one rider gets one order,
        while phones, networks and workers fail). It is also the feature where mistakes are most
        visible: food going cold on a counter, two riders arriving for one order, or a rider
        riding across the city for an order someone else already took.
      </p>
      <p>
        We will go in the order a good review goes: what must be true, the numbers, the data and
        the flow, the places it breaks, how earlier chapters apply, and the decisions written as
        a table.
      </p>

      <h3>Write down what must stay true</h3>
      <p>
        The functional requirement fits in a sentence: after a restaurant accepts an order, find
        a rider who can reach the restaurant about when the food is ready, offer them the order,
        and if they decline or do not answer within 30 seconds, offer it to someone else. The
        customer and restaurant see the assigned rider; the rider sees the drop-off only after
        accepting.
      </p>
      <p>
        The invariants matter more than the features, because they are what the design must
        defend under failure. We write three. An order has at most one assigned rider at any
        time. A rider has at most one pending offer and at most one active order (version one
        does not batch two orders on one trip). And no accepted order waits unassigned without
        someone knowing: after five minutes without a rider it is escalated to the city’s
        operations team.
      </p>
      <p>
        The non-functional requirements follow from what customers and riders notice. Ninety-five
        per cent of orders should have a rider within two minutes of acceptance. The time to
        choose a candidate should be small next to the time a rider takes to respond, so a few
        hundred milliseconds is plenty. Crashed workers, duplicated events and slow phones must
        not break the invariants. And we write down what is out of scope, so the review does not
        drift: batching, assigning before the restaurant accepts, and machine-learned arrival
        times are later reviews.
      </p>

      <h3>Do only the arithmetic that changes the design</h3>
      <p>
        From the brief: about a million orders a day, 42 a second in the dinner hour with the
        order path designed for 150, and 50,000 riders online at peak, each sending a location
        every 5 seconds.
      </p>
      <p>
        Assignments arrive at the order rate, about 42 a second nationally in the dinner hour and
        at most 150 at the design target. Not every offer is accepted; if roughly 60% are, an order
        needs about 1.7 offers on average, so around 70 offers a second, 255 at the target. Each offer and acceptance
        costs a handful of database writes (offer row, rider state, order state), so the assignment path writes a few hundred rows a
        second. That is modest for a single well-run database, so storage capacity does not drive
        this design.
      </p>
      <p>
        Locations are the volume: 50,000 riders ÷ 5 seconds = 10,000 updates a second. But each
        update overwrites the previous one for that rider, and the current position of every rider
        in India is 50,000 small records, a few megabytes. That fits in memory on one
        machine. Locations are therefore a write-rate problem with a tiny working set, which
        points to an in-memory geo index (the Redis geo set in the first chapter’s list of stores),
        fed from the rider-locations stream keyed by rider id, rather than to a database table
        updated 10,000 times a second.
      </p>
      <p>
        One more number tells us where the real pressure is. Use Little’s law on riders rather
        than on threads. An order takes about 35 minutes from placement to delivery, but a rider
        is occupied for perhaps 20 of them (1,200 seconds): riding to the restaurant, waiting,
        and delivering. At 42 orders a second, that is 42 × 1,200 ≈ 50,000 riders busy at once,
        which is the whole online fleet. Dabba is saturated in riders at an ordinary dinner peak,
        and a festival evening near the 150-a-second design target would need more than three
        times the riders it has. So the hard case is not a fast search
        through plenty of riders; it is a queue of orders waiting for scarce riders, at exactly the
        moment everything else is busiest. The design must behave well when the answer to “who
        is nearby and free?” is “nobody”.
      </p>

      <h3>The data, and the flow one arrow at a time</h3>
      <p>
        The order lives where the sharding chapter put it: in the logical shard of its
        restaurant, one of 8,192, chosen by a hash of <code>restaurant_id</code>. Riders are not
        orders, and a rider delivers for many restaurants in a day, so rider state cannot live in
        the order shards. It goes in a separate rider store, one database per region holding the
        riders of that region’s cities (50,000 riders and a few hundred writes a second fit one
        well-run database comfortably). Offers live next to the riders:
      </p>
      <pre><code>{`-- order shard (hash of restaurant_id)
orders  (id, restaurant_id, status, rider_id NULL, accepted_at, ready_at, ...)

-- rider store (one per region)
riders  (id, city_id, status  -- OFFLINE | IDLE | OFFERED | ON_ORDER
         current_offer_id NULL, current_order_id NULL)
offers  (id, order_id, rider_id, status  -- PENDING | ACCEPTED | DECLINED | EXPIRED
         expires_at)
-- at most one live offer per order, enforced by the database:
CREATE UNIQUE INDEX one_live_offer ON offers (order_id)
 WHERE status IN ('PENDING', 'ACCEPTED');`}</code></pre>
      <p>
        That split is the most important decision in this design. The order and the rider are in
        different databases, so “give this order to this rider” cannot be one local transaction.
        A distributed transaction across the two would put a coordinator on the busiest path in
        the system. Instead we choose one place where both invariants are decided, the rider
        store, and let the order shard follow. The unique index means an order can have only one
        live offer, so at most one rider can ever accept it; the conditional update on the rider
        row means a rider can hold only one offer. Once the rider store says “rider 4411 accepted
        order 9182”, updating the order is a consequence, not a decision, and a consequence can
        be applied later and more than once.
      </p>
      <Fig caption="Fig · The assignment path. Order events arrive by order id, candidates come from the in-memory geo index, each offer carries a timer, and the rider store decides; the order shard follows">
        <AssignmentFlow />
      </Fig>
      <p>
        The flow uses each earlier chapter once. When the restaurant taps “accept”, the order
        service updates the order and writes an <code>OrderAccepted</code> outbox row in the same
        transaction (the outbox from the streams chapter). A relay publishes it to the order-events log,
        whose 48 partitions are keyed by order id (the streams chapter), so every event for one
        order reaches the same assignment worker in order. Different workers handle different
        orders in parallel, and nothing about one busy city makes one partition hot.
      </p>
      <p>
        The worker asks the geo index for idle riders within a few kilometres of the restaurant
        whose last update falls within the 20-second freshness window (the geospatial chapter’s
        cells do the lookup). It ranks them by estimated arrival at the restaurant relative to when the food
        will be ready, with a fairness term for riders who have been idle longest, and takes the
        best.
      </p>
      <p>
        It then creates the offer and reserves the rider in one transaction on the rider store,
        using conditional updates so that the database, not the worker’s memory, decides whether
        the rider is still free:
      </p>
      <pre><code>{`BEGIN;  -- rider store
  UPDATE riders SET status = 'OFFERED', current_offer_id = :offer
   WHERE id = :rider AND status = 'IDLE';          -- 0 rows: taken, try the next candidate
  INSERT INTO offers (id, order_id, rider_id, status, expires_at)
       VALUES (:offer, :order, :rider, 'PENDING', now() + interval '30 s');
COMMIT;
-- then: schedule "expire :offer" at +35 s, send the offer to the rider's app`}</code></pre>
      <p>
        The offer reaches the rider’s phone over a WebSocket with acknowledgements, the mechanism
        the realtime chapter chose for restaurant tablets, because here too the server needs to
        know that the offer arrived, separately from whether it was accepted. Riders hold that
        socket only for offers, on a separate dispatch pool of connection servers, so a surge of
        customer connections cannot delay an offer. A push notification
        is the fallback when the socket is down. When the rider taps accept, the accept endpoint
        runs one transaction on the rider store: mark the offer accepted only if it is still
        pending and belongs to this rider, and move the rider to <code>ON_ORDER</code>. If either
        condition fails, the transaction rolls back and the app shows “this order is no longer
        available”.
      </p>
      <p>
        The same transaction writes a <code>RiderAssigned</code> row to the rider store’s outbox.
        Its consumer applies it to the order shard with{' '}
        <code>UPDATE orders SET rider_id = :rider WHERE id = :order AND rider_id IS NULL</code>,
        which is safe to run twice and cannot conflict, because the rider store has already made
        sure there is only one accepted offer. For a second or so the order shard lags the rider
        store; the customer’s screen shows “finding your rider” a moment longer, and the rider app,
        which reads from the rider store, already shows the pickup. That lag is the price of
        avoiding a cross-database transaction, and it is one worth paying.
      </p>

      <h3>Where it breaks: the races</h3>
      <p>
        Every arrow in the figure can be delivered twice, delivered late, or not delivered. Walk
        through each and check the invariants.
      </p>
      <p>
        The <code>OrderAccepted</code> event is delivered twice, because the relay crashed after
        publishing and before marking the outbox row sent. Two workers (or one worker, twice) try
        to create an offer for the same order. The unique index on live offers per order lets
        one insert succeed; the other fails and is discarded. Invariant one holds without any lock
        outside the database.
      </p>
      <p>
        Two different orders choose the same rider at once, because both restaurants are on the
        same street. Both workers run the conditional update on the rider. One sees one row
        updated; the other sees zero and moves to its next candidate. Invariant two holds.
      </p>
      <p>
        A worker crashes after creating an offer and before sending it to the rider. The offer is
        in the database and the expiry job is scheduled, so in 35 seconds the offer expires, the
        rider is released, and the order is offered again. Nothing is lost, but the order waited 35
        seconds for nothing. If that happens often, the worker can, on restart, resend its pending
        offers. We note it and move on; it is a latency cost, not a correctness one.
      </p>
      <Predict q={<>A rider taps “accept” with the countdown showing 1 second left. Their phone is on a weak network, and the request reaches Dabba 1.5 seconds later, after <code>expires_at</code>. At almost the same moment the expiry job runs. What should happen, and what does the rider see?</>}>
        <p>
          With the strict design, the accept transaction checks <code>expires_at &gt; now()</code>,
          finds the offer expired, and fails; or the expiry job has already marked it{' '}
          <code>EXPIRED</code> and the accept finds no pending offer. Either way the rider sees
          “offer expired” after doing exactly what the app asked, in time by their own screen.
          Riders learn that the last seconds are unsafe and the effective offer window shrinks.
        </p>
        <p>
          The fix is a grace period on the server. The app counts down 30 seconds; the server
          accepts until 30 + 5 seconds; the expiry job is scheduled at +35 seconds and expires
          the offer only if it is still pending, with the same conditional update as the
          restaurant-acceptance timeout in the background-work chapter. Whichever transaction
          commits first wins and the other finds nothing to do. The cost is that an offer nobody
          answers holds the order for 35 seconds instead of 30. That is the kind of
          trade worth writing into the review explicitly, with the measurement (accept requests
          arriving after the deadline) that would tune it.
        </p>
      </Predict>
      <p>
        One more race is human. Some riders run auto-clicker apps that accept offers within
        milliseconds and decline the ones they do not want, which breaks the fairness the ranking
        was designed for. Dabba’s defence uses earlier chapters: a per-rider rate limit on
        decisions, offers that are sent to one rider at a time (so there is nothing to snipe), and
        a monitor on accept latency distributions per rider.
      </p>

      <h3>Where it breaks: not enough riders</h3>
      <p>
        At 20:30 on a rainy evening in Bengaluru, orders arrive faster than riders free up. The
        worker finds no idle rider within 3 km for many orders. The first response is mechanical:
        the order goes back into a retry queue with a short delay, and each retry widens the
        search radius a little. That keeps the order alive, but it cannot create riders.
      </p>
      <p>
        Without a further response, the unassigned queue grows for as long as demand exceeds
        supply, customers wait 40 minutes for food that is ready in 15, and restaurants fill their
        counters with cooling bags. The response belongs upstream, before more orders are
        accepted: the backpressure idea from the failure chapter applied to a product. As the age
        of the oldest unassigned order in a zone rises, the app first shows longer delivery
        estimates for restaurants in that zone, then adds a rain surcharge (which both slows demand
        and attracts riders online), then stops accepting new orders in that zone for a few
        minutes. Each step is a flag that operations can also trigger by hand. The metric that
        drives it is the same one the background-work chapter recommended for any queue: the age
        of the oldest item, not the count.
      </p>

      <h3>The rest of the toolkit, applied</h3>
      <p>
        <em>Security.</em> The offer card shows the restaurant and a rough drop-off area, not the
        address. The address and masked phone number become visible only when the accept
        transaction commits, through the same access function as every other order read. The
        accept endpoint checks that the offer’s rider is the caller, because offer IDs, like order
        IDs, will leak.
      </p>
      <p>
        <em>Failure.</em> The geo index is soft state: if a city’s index process dies, a new one
        rebuilds from the next round of pings in five to ten seconds, and two replicas per city
        mean even that gap rarely shows. If the database primary for a city fails over, assignment
        in that city pauses for the seconds it takes; events wait in the log, and the worker
        resumes from its offset. If the push provider is slow, offers still reach riders over the
        dispatch WebSocket. The payment provider does not appear on this path at all, which is
        deliberate: payment is settled before the restaurant accepts.
      </p>
      <p>
        <em>Multi-region.</em> Assignment for a city runs in the city’s home region, next to the
        region’s rider store and the logical shards of that city’s restaurants. When a city is re-homed, offers that were pending in the old region
        expire and are reissued, and riders’ apps reconnect to the new region. A minute of slower
        assignment in one city is the planned cost of a failover.
      </p>
      <p>
        <em>Delivery.</em> A new ranking function is the most likely change to this feature, and
        the riskiest, because it changes who earns what. It first runs in shadow mode: the worker
        computes both the old and the new choice for every order, uses the old one, and logs both.
        A week of shadow data shows how the new ranking would have changed pickup waits and rider
        earnings before any rider is affected. Then a per-city flag turns it on in one city, and
        the comparison continues on real outcomes.
      </p>

      <h3>The decisions, written so they can be challenged</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Decision</th><th>Alternative</th><th>Why this one</th><th>What would change our mind</th></tr>
          </thead>
          <tbody>
            <tr><td>Offer to one rider at a time</td><td>broadcast to five, first to accept wins</td><td>fair, no wasted rider attention, nothing to snipe</td><td>assignment too slow in sparse zones; then offer to small batches there</td></tr>
            <tr><td>Workers consume order events by order id</td><td>a matcher per city</td><td>no hot partition for a busy city; per-order ordering is all assignment needs</td><td>batching, which needs a view of a whole zone at once</td></tr>
            <tr><td>Rider store decides; order shard follows</td><td>a cross-database transaction, or a lock in Redis</td><td>one database holds both invariants; no coordinator or lock expiry on the hot path</td><td>the order-shard lag becoming visible to customers</td></tr>
            <tr><td>In-memory geo index fed by pings</td><td>a geo query on the database</td><td>10,000 overwrites a second of state that is useless after a minute</td><td>needing location history; stream it to storage separately</td></tr>
            <tr><td>30 s offer, 35 s server deadline</td><td>longer offers, or strict 30 s</td><td>fits rider decision time; forgives weak networks</td><td>measured late accepts or long silent waits</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The last column is the most useful one in the table. It turns each decision from an
        opinion into a claim with a test, and it tells the next reviewer which measurements to
        look at before reopening the argument.
      </p>

      <h3>When this design would be wrong</h3>
      <p>
        At a tenth of the scale, most of this is unnecessary. A Dabba with one city and 300 riders
        could run assignment as a single process holding everything in memory, backed by one
        database, with a person dispatching difficult orders by hand. The event log, the
        separate rider store and the shadow-mode ranking would be cost without benefit.
      </p>
      <p>
        At a different shape, parts of it change. If Dabba batched two orders per rider, the
        rider’s state would no longer be a single active order, the invariant would change, and
        the matching would become an optimisation over a time window rather than a choice per
        order. That is a different design, and it would get its own review. Saying which changes
        would invalidate a design is part of finishing it.
      </p>
      <Callout>
        A design review is a list of decisions, each with its alternative, its cost and the
        evidence that would reverse it. The diagram is there to make the decisions visible; it is
        not the design.
      </Callout>
      <p>
        One feature, carried through every chapter, showed how the pieces fit. The final chapter,
        the problem atlas, goes the other way: it takes the well-known design problems (URL
        shorteners, feeds, chat, payments ledgers and others) and shows which chapters make each
        one hard, so a new problem can be placed on the map quickly.
      </p>
      <Notes
        items={[
          'Start a review with the invariants the design must defend under failure, not with the boxes.',
          'Do only the arithmetic that changes a decision; here it showed locations are a write-rate problem and riders, not machines, are the scarce resource.',
          'When two invariants live in different databases, decide them in one store and let the other follow idempotently.',
          'Let the database decide races with conditional writes and unique indexes, and make every event handler safe to run twice.',
          'Give clients a grace period on deadlines and expire only what is still pending.',
          'Write each decision with its alternative and the evidence that would change it.',
        ]}
      />
    </>
  ),

  /* ── The problem atlas ───────────────────────────────────────── */
  atlas: (
    <>
      <p>
        This chapter lets you take a design problem you have not seen before and place it quickly:
        which of this pathway’s chapters make it hard, which barely matter, and what the first
        three questions about it should be. It does this for the problems that come up most often
        in interviews and in industry writing, and it uses Dabba as the reference point for each.
      </p>
      <p>
        The atlas is not a set of answers to memorise. Each problem below has a familiar shape, and
        most published solutions share that shape, but the right design for a given team still
        comes from its requirements and numbers. What transfers between problems is the
        classification: knowing that a payments ledger is a problem about writes that must never
        be wrong, and a news feed is a problem about reads that may be a little stale, tells you
        where to spend the hour.
      </p>

      <h3>Three questions that place a problem on the map</h3>
      <p>
        Dabba’s chapters were driven by three questions, asked again and again. They work for any
        problem.
      </p>
      <p>
        <em>What must never be wrong?</em> For Dabba it was “one order, one rider” and “never
        charge twice”. The invariant decides where strong consistency, conditional writes and
        idempotency are needed, and by elimination, where staleness is acceptable. A design
        with no stated invariant usually has an accidental one.
      </p>
      <p>
        <em>What is the dominant ratio?</em> Reads to writes, writes to readers (fan-out), or
        events to state. Dabba’s menus were read thousands of times per edit; its rider
        locations were written 10,000 times a second and read only to answer “who is near?”. The
        ratio decides whether the design is built around caches, around fan-out, or around a
        write path.
      </p>
      <p>
        <em>What is scarce, and where is the hottest key?</em> For Dabba the scarce thing was
        riders at the dinner peak, not machines. In other problems it is a celebrity’s followers,
        a popular link, a single account receiving thousands of payments a second. The scarce
        thing is where queues form, and where rate limits, shedding and partitioning choices
        matter.
      </p>
      <Predict q={<>Before reading the section on ledgers: which of this pathway’s chapters does a payments ledger lean on most, and which could it almost ignore?</>}>
        <p>
          It leans hardest on getting writes right (transactions, isolation, invariants such as
          “every entry balances”), on background work (idempotent effects, reconciliation jobs,
          exactly-once effect rather than delivery), on security (who may move money, webhook
          verification, audit) and on IDs (stable references shared with banks and providers).
          Delivery matters more than usual, because a bad deploy can corrupt money, not just
          serve an error.
        </p>
        <p>
          It can almost ignore the edge and CDN chapter, geospatial indexing, blob storage and
          realtime push. A ledger’s read traffic is modest and its values are not cacheable in the
          usual sense, since a stale balance can authorise a payment that should be refused. If
          your first sketch of a ledger starts with a cache, the invariant has not been written
          down yet.
        </p>
      </Predict>

      <h3>Problems that are mostly reads</h3>
      <p>
        <strong>URL shortener.</strong> Create a short code for a long URL; redirect anyone who
        visits the code. Redirects outnumber creations by a hundred to one or more, links almost
        never change, and a redirect should take tens of milliseconds. So the read path is a cache
        in front of a key-value lookup, and because codes are immutable, caching is easy and
        replication lag is harmless. The interesting parts are elsewhere: generating short codes
        without coordination (random codes with a uniqueness check, as in the IDs chapter; seven
        characters of base 62, letters and digits, give 62⁷, about 3.5 trillion codes, so
        collisions stay rare for a long time), keeping click analytics
        off the redirect path (emit an event, count downstream, as in the derived-data chapter),
        and abuse, because a free shortener becomes a tool for hiding phishing links (rate limits
        on creation, scanning targets before activation). Compared with Dabba, it is a menu page
        with no menu edits.
      </p>
      <p>
        <strong>Search autocomplete.</strong> As a user types “bir”, suggest “biryani”, “biryani
        near me”, “Biryani Blues”. Every keystroke is a request, so the latency budget is tight
        (suggestions must appear within about 100 ms to feel attached to typing) and the request
        rate is several times the search rate. The standard design precomputes, for each prefix,
        the top few completions ranked by popularity, offline, from query logs: this is derived
        data, rebuilt hourly or daily. Counting popular queries over billions of log lines is a
        job for the sketches chapter (approximate heavy hitters). Short prefixes are few and very
        hot, so they are cached at the edge; long prefixes are many and cold, and are served from a
        prefix index sharded by prefix. Personalisation and freshness (a trending query today) are
        added as small overlays on the precomputed list, not by computing the list per request.
        Dabba’s own restaurant search would use exactly this, with the city as an extra key.
      </p>

      <h3>Problems that are mostly fan-out</h3>
      <p>
        <strong>News feed.</strong> When a user posts, their followers should see it in their
        feeds. The dominant ratio is fan-out: one write, many readers. Precomputing each
        follower’s feed at write time (push) makes reads cheap and writes expensive, and a user
        with 50 million followers makes a single post cost 50 million writes. Computing the feed
        at read time (pull) makes writes cheap and reads expensive, merging recent posts from
        hundreds of followees per page view. Published designs converge on a hybrid: push for
        ordinary accounts, pull for the few very large ones, merged at read time. The chapters that
        make it hard are scaling reads, sharding (by user, and the celebrity as a hot key), streams
        (fan-out as asynchronous work off a log) and derived data (the feed is a materialised view
        that can be rebuilt). Staleness of a few seconds is acceptable, which is why the design can
        be this asynchronous.
      </p>
      <p>
        <strong>Notification system.</strong> Dabba built a small one in the background-work
        chapter; at platform scale it becomes a product of its own. Events (“order out for
        delivery”, “new message”, “price drop”) fan out to channels (push, SMS, email, in-app)
        according to user preferences, quiet hours and per-user frequency caps. The hard parts are
        the ones Dabba met: idempotent sending (a duplicated “your order is delivered” is
        annoying; a duplicated “₹5,000 debited” causes support calls), separate lanes so bulk
        marketing never delays a security code, per-provider rate limits and failover between
        SMS gateways, and collapsing (“3 new messages” rather than three pushes). Rate limiting
        and failure chapters matter as much as jobs; a notification system’s worst day is usually a
        provider outage combined with a marketing campaign.
      </p>

      <h3>Problems that are mostly ordering and connections</h3>
      <p>
        <strong>Chat.</strong> Users send messages in one-to-one and group conversations, and each
        participant sees them in the same order, in real time when online and on reconnect when
        not. The invariant is per-conversation order: messages in a conversation must not appear
        in different orders to different members. The usual answer is to route each conversation
        through one partition (or one sequencer) that assigns increasing sequence numbers, which
        the streams chapter and the IDs chapter both prepare for. Delivery uses the realtime
        chapter’s persistent connections, with each conversation’s messages routed through
        subscriptions on a pub/sub backbone, and falls back to push notifications when the user is offline. Receipts
        (“delivered”, “read”) are state transitions that may arrive twice and out of order, so they
        are stored as “highest sequence number read” per member, which is naturally idempotent.
        Large groups bring back fan-out, and end-to-end encryption moves much of the logic to
        clients. Dabba’s rider–customer chat is a small version: two members, a lifetime of one
        delivery.
      </p>

      <h3>Problems that are mostly contention</h3>
      <p>
        <strong>Ride matching.</strong> This is the worked chapter with the food removed. The
        geospatial index finds nearby drivers, the 10,000-pings-a-second shape is the same, and
        the core invariant (one ride, one driver; one driver, one ride) is defended with the same
        conditional writes on a store that holds driver state. The differences are instructive. The
        customer waits on the street rather than at home, so assignment latency matters more and
        offers may go to a few drivers at once. Pricing responds to supply and demand in each area
        in near real time (surge), which is a feedback loop on the “not enough riders” problem. And
        trips cross city boundaries more than food orders do, which complicates partitioning.
      </p>
      <p>
        <strong>Payments ledger.</strong> Record every movement of money so that balances can be
        computed, audited and reconciled with banks. The invariant is absolute: every transaction
        is recorded as balanced entries (debits equal credits), entries are never edited or
        deleted (corrections are new entries), and the same instruction applied twice must not move
        money twice. Write volume is moderate for most companies; correctness is everything. That
        puts the weight on the writes chapter (serialisable transactions or carefully designed
        conditional writes per account), on idempotency keys shared with external parties, on
        reconciliation jobs that compare the ledger with bank and provider statements daily and
        raise every mismatch, and on security and audit. The hot key is a single very busy account
        (a merchant receiving thousands of payments a second), solved by splitting it into
        sub-accounts that are summed for reporting. Dabba’s payouts ledger from the background-work
        chapter is a small, honest example: a unique constraint per rider and period, and a bank
        reference that makes the unknown outcome recoverable.
      </p>
      <p>
        Two more problems belong in this group and appear often. A ticketing or flash-sale system
        is contention on inventory: reserve with an expiry, confirm on payment, release on timeout
        (Dabba’s offer timer, applied to seats), with a waiting room at the front door, which is
        rate limiting and load shedding by another name. A distributed rate limiter, asked as a
        problem in its own right, is the rate-limiting chapter’s counters, with the question of
        failing open or closed at its centre.
      </p>

      <h3>The atlas in one table</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Problem</th><th>What must never be wrong</th><th>Dominant pressure</th><th>Chapters that make it hard</th></tr>
          </thead>
          <tbody>
            <tr><td>URL shortener</td><td>a code points to one URL, forever</td><td>reads, a few viral links</td><td>reads, edge, IDs, rate limiting</td></tr>
            <tr><td>Search autocomplete</td><td>little; staleness is fine</td><td>a request per keystroke, tight latency</td><td>derived data, sketches, edge, sharding</td></tr>
            <tr><td>News feed</td><td>no lost posts; order roughly right</td><td>fan-out, celebrity hot keys</td><td>reads, sharding, streams, derived data</td></tr>
            <tr><td>Notification system</td><td>no duplicate or missing critical messages</td><td>bursts, provider limits</td><td>background work, rate limiting, failure</td></tr>
            <tr><td>Chat</td><td>same order for every member</td><td>connections, per-conversation order</td><td>realtime, streams, IDs</td></tr>
            <tr><td>Ride matching</td><td>one ride, one driver</td><td>location writes, scarce drivers</td><td>geo, writes, background work, failure</td></tr>
            <tr><td>Payments ledger</td><td>balanced, immutable, applied once</td><td>correctness, a few hot accounts</td><td>writes, background work, security, IDs, delivery</td></tr>
            <tr><td>Ticketing / flash sale</td><td>no seat sold twice</td><td>a stampede on few items</td><td>writes, background work, rate limiting, failure</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Read the last column down and two things stand out. Background work and the log appear in
        almost every row, because nearly every hard system answers quickly and finishes the work
        afterwards. And the second column predicts the architecture better than the problem’s
        name does: the rows whose invariants are strict (ledger, ticketing, matching) are designed
        around conditional writes and idempotency, and the rows whose invariants are loose (feed,
        autocomplete) are designed around precomputation and caches.
      </p>

      <h3>When the atlas misleads</h3>
      <p>
        A map of typical solutions tempts you to skip the requirements and draw the familiar
        picture. Resist it. A URL shortener for a company of 2,000 employees is a single table and
        a web server; drawing a sharded cache cluster for it is a failure to read the numbers. A
        chat feature for Dabba’s riders and customers needs none of the group-chat machinery. A
        ledger for a startup with a thousand transactions a day is a well-designed Postgres schema,
        not a distributed system. The atlas tells you where to look first. The brief, the
        arithmetic and the invariants tell you what to build.
      </p>
      <p>
        A good way to use it is the one this pathway used. Take one row, write a one-paragraph
        brief with numbers, do the arithmetic, sketch the simplest design that meets it, and find
        the two or three places where it breaks. Then read how a real company built it (the
        aggregated engineering blogs at <strong>/tech-blogs</strong> and this chapter’s reading
        list are good places to look) and compare their scars with your sketch. The differences
        are your next things to learn.
      </p>
      <Callout>
        Name the invariant, the dominant ratio and the scarce resource, and most problems
        reduce to a few chapters you already know. The rest of the design comes from the numbers.
      </Callout>
      <p>
        This is the end of the System Design pathway. Dabba started as a brief and a request
        crossing a few boxes, and finished with a reviewed design for its most delicate feature.
        The next pathway, AI Engineering, applies the same habits (requirements, numbers,
        failure paths, measurement) to systems built around models, where the component that
        misbehaves is often the one doing the most useful work.
      </p>
      <Notes
        items={[
          'Place a new problem by asking what must never be wrong, what the dominant ratio is, and what is scarce.',
          'Strict invariants lead to conditional writes and idempotency; loose ones allow precomputation and caching.',
          'Background work and the log appear in almost every hard design, because answering fast and finishing later is the common move.',
          'Fan-out problems turn on push versus pull and on what to do with the few huge accounts.',
          'Contention problems (matching, tickets, ledgers) are decided in the database with reservations, expiries and conditional updates.',
          'Use the atlas to choose where to look first, then let the brief and the arithmetic decide the design.',
        ]}
      />
    </>
  ),
}
