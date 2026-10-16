/**
 * System Design, part 1 of 3: request → writes. The running example is
 * Dabba, a food-ordering and delivery app across Indian cities; the brief
 * set up in the first chapter is the one every later chapter argues from.
 * Rendered one chapter per page by StageView.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
import { RequestAnatomy, BTreeVsLsm } from './system-design-diagrams'
import { ColdOpenWaterfall, IdempotentRetry, CacheAsideRace, OrderWritePath } from './system-design-1-diagrams'

export const sections: Record<string, ReactNode> = {
  /* ── The brief, and one request end to end ─────────────────────── */
  request: (
    <>
      <p>
        System design is the work of deciding where a request spends its time, where its data
        lives, and what happens when one of those places misbehaves. That work needs a product
        with users and numbers, because every choice in this course is argued from them. This
        chapter sets up the product, then follows its most common request from a customer’s
        thumb to the database and back.
      </p>
      <p>
        The product is Dabba, a food-ordering and delivery app that operates across Indian
        cities. A customer in Pune opens it at eight in the evening and sees the restaurants
        that deliver to her flat. She opens two or three menus, places an order and pays. A
        restaurant accepts the order on a tablet next to the kitchen pass, a rider picks it up,
        and she watches the rider’s dot move across the map until the doorbell rings. We will
        design all of that over the course. Here we write the brief and trace the first tap.
      </p>

      <h3>Write the brief before drawing a box</h3>
      <p>
        A brief turns “build a food delivery app” into something we can reason about. It names
        who uses the system, what they do, how often, and which assumptions we are making on
        their behalf. Without it, every design choice is defensible and none can be checked.
      </p>
      <p>
        Dabba has four groups of users. Customers use a phone app, mostly on Android, many on
        inexpensive handsets and many on an app version that is months old because they never
        update. Restaurants use a partner app on a tablet in the kitchen. Riders run a rider app
        for a whole shift with GPS switched on. Dabba’s own support and operations staff use
        internal tools to look up orders, issue refunds and move riders between zones.
      </p>
      <p>
        The core operations are: browse restaurants that deliver to an address; read a menu;
        place and pay for an order; accept or reject it and mark it ready; assign a rider, who
        picks up and delivers while sharing a live location; notify each party at each step; and
        let restaurants upload photos of their dishes. We leave out grocery, table bookings,
        advertising and cash on delivery. Each would add real work (cash on delivery, for
        example, brings its own reconciliation problem), and none is needed to teach what
        follows.
      </p>
      <p>Now the numbers. Each one is an assumption, and the right-hand column is what it implies.</p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Quantity</th><th>Assumption</th><th>What follows</th></tr>
          </thead>
          <tbody>
            <tr><td>Customers</td><td>2 million daily active, about 2 sessions each</td><td>4 million app sessions a day</td></tr>
            <tr><td>Orders</td><td>1 session in 4 ends in an order</td><td>1 million orders a day</td></tr>
            <tr><td>API calls</td><td>about 25 per session (home 8, four menus at 3 each, cart and checkout 5)</td><td>100 million calls a day</td></tr>
            <tr><td>Menu views</td><td>4 per session</td><td>16 million a day, 16 for every order</td></tr>
            <tr><td>Restaurants</td><td>50,000 active, about 80 menu items each</td><td>4 million menu items</td></tr>
            <tr><td>Dish photos</td><td>about 3 million, each in 4 sizes, ~60 KB at the size most screens use</td><td>about 100 image loads per session, 400 million a day</td></tr>
            <tr><td>Riders</td><td>50,000 online at the dinner peak, location sent every 5 s</td><td>10,000 location updates a second</td></tr>
            <tr><td>Order record</td><td>about 2 KB with items, address and price lines</td><td>about 2 GB a day, about 730 GB a year before indexes</td></tr>
            <tr><td>Notifications</td><td>about 6 per order across customer, restaurant and rider</td><td>about 6 million a day</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        A few assumptions sit outside the table. Dabba runs in one country with one time zone,
        so every city eats dinner at the same clock time; there is no geography to spread the
        peak. The backend runs in one cloud region in Mumbai with three availability zones (a
        second region comes much later, in the multi-region chapter). Payments go through an
        external payment provider that handles UPI, cards and wallets, and a UPI payment can be
        confirmed seconds or minutes after the customer approves it. A typical 4G round trip
        from a phone to Mumbai is around 60 ms, and often worse in a crowded area.
      </p>
      <p>
        Finally, the targets. The home screen and menu should answer within 300 ms at the 99th
        percentile, measured from when our edge receives the request. Placing an order should
        answer within 1.5 s at the 99th percentile, not counting the time the customer spends
        in their UPI app. And 99.95% of order placement attempts between 11:00 and 23:00 should
        succeed. These numbers are planning estimates. Their job is to make choices arguable:
        if someone believes the photo count is ten times higher, we can see exactly which
        decisions change.
      </p>

      <Predict q="Dabba takes a million orders a day. At 8:30 pm, which part of the system receives the most writes per second, and roughly how many?">
        <p>
          It is not orders. The rider app reports a location every 5 seconds from 50,000 phones,
          which is 10,000 writes a second. Orders, as the next section works out, peak at
          around 150 a second even with generous headroom. Order status changes add roughly six
          writes per order, still under a thousand a second.
        </p>
        <p>
          The entity at the centre of the business is not the heaviest load. The two streams
          also differ in what a lost write costs. Losing one rider location barely matters,
          because a newer one arrives five seconds later. Losing one paid order is a refund, a
          support call and a customer who may not return. They will end up in different
          stores, for reasons the storage chapter makes precise.
        </p>
      </Predict>

      <h3>Turn daily totals into the rate the system must survive</h3>
      <p>
        A million orders a day averages 1,000,000 / 86,400 ≈ 11.6 orders a second. That
        number is nearly useless, because Dabba is quiet at 4 am and busy at 8:30 pm. Systems
        fall over at their peak, so we need the peak.
      </p>
      <p>
        Assume the dinner hour, 8 to 9 pm, carries 15% of the day’s orders. That is 150,000
        orders in 3,600 seconds, about 42 a second. Inside that hour the rate is not flat
        either. Rain starts in Mumbai and nobody wants to go out. A cricket final reaches the
        innings break. Marketing sends a push notification to two million phones at 8:15. Any
        of these can double or triple the rate for a few minutes. So the order path should
        handle about 120 orders a second, and we will design and load-test it at 150.
      </p>
      <p>
        The same arithmetic gives the other design targets. API calls: 100 million a day, 15%
        in the peak hour, is 15 million in 3,600 seconds, about 4,200 a second; allowing about
        2.4 times for spikes gives a target of 10,000 requests a second. Menu views: 16 million
        a day gives about 670 a second in the peak hour, and we design for 2,000.
      </p>
      <p>
        The numbers are as useful for what they rule out. 150 orders a second is a small
        number for a single well-provisioned Postgres primary, which can sustain thousands of
        short transactional writes a second. So we will not split orders across machines on
        day one, and the hard part of ordering will be correctness, especially around an
        external payment provider, rather than raw throughput. On the other hand, 400 million
        image loads a day at about 60 KB each is 24 TB of data a day. Spread evenly that is
        24 × 10¹² × 8 / 86,400 ≈ 2.2 gigabits a second, and the peak is several times higher.
        That is a CDN problem from the first day, and the CDN chapter treats it as one.
      </p>

      <h3>Follow one tap: opening Dabba at 8 pm</h3>
      <p>
        The customer in Pune taps the icon. Before Dabba’s servers do any work at all, the phone
        has to reach them. If the app has not talked to <code>api.dabba.in</code> recently, it
        first needs the address: a DNS lookup, usually answered by the mobile operator’s
        resolver, costing one round trip if the resolver has the answer cached and more if it
        has to ask upstream. Then a TCP handshake, one round trip. Then a TLS 1.3 handshake,
        one more (TLS 1.2 needed two). Only then does the request leave, and the response comes
        back one round trip plus the server’s work later.
      </p>
      <Fig caption="Fig 1 · Opening the app at 60 ms per round trip. Cold, three round trips pass before the request is sent">
        <ColdOpenWaterfall />
      </Fig>
      <p>
        With a 60 ms round trip and 150 ms of server work, the cold open takes about 390 ms to
        the first byte of the response, and the warm one 210 ms. On a cold connection the
        handshakes cost more than everything our servers do. There is also a cost the figure
        leaves out: a phone that has been idle puts its cellular radio into a low-power state,
        and the first packet afterwards can wait tens of milliseconds more while the radio
        reconnects.
      </p>
      <p>
        This changes where effort pays. Shaving 20 ms off server time is worth less than
        keeping one connection open and reusing it for every call in the session, which HTTP/2
        does by carrying many requests over a single connection. Terminating TLS close to the
        customer, which a CDN does, turns three long round trips into three short ones. HTTP/3
        (over QUIC) folds the transport and TLS handshakes into one round trip and can resume
        a known server with none, which matters on lossy mobile networks. And asking for the
        home screen in one request instead of eight removes round trips that no amount of
        server tuning can remove. The API chapter returns to that last point.
      </p>
      <p>
        Once the request arrives, it passes a short chain of boxes in Mumbai. A load balancer
        picks one of many identical servers. An API gateway checks the customer’s login token
        and routes the request to the home service. The home service has to answer one
        question: which restaurants deliver to this address right now, in what order, and with
        what delivery time and offers. To answer it, it asks several other services.
      </p>
      <Fig caption="Fig 2 · The chain a request crosses. Each hop has a cost, and a cache hit can end the trip early">
        <RequestAnatomy />
      </Fig>

      <h3>Where the 300 ms goes on the server</h3>
      <p>
        A latency target only helps if we split it into a budget per step, because then each
        new hop has to justify its share. Here is the home request on a normal evening.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Step</th><th>Typical time</th><th>What it depends on</th></tr>
          </thead>
          <tbody>
            <tr><td>Edge to load balancer in Mumbai</td><td>5–20 ms</td><td>how far the edge location is from Mumbai</td></tr>
            <tr><td>Gateway: verify token, route</td><td>2–5 ms</td><td>a signature check, CPU only, no database</td></tr>
            <tr><td>Restaurants serving this delivery zone</td><td>~5 ms</td><td>a cached lookup keyed by zone</td></tr>
            <tr><td>Availability, delivery estimate, offers, recommendations</td><td>~60 ms</td><td>called in parallel, so the slowest of the four</td></tr>
            <tr><td>Rank and assemble the list</td><td>10–20 ms</td><td>number of candidate restaurants</td></tr>
            <tr><td>Serialise and compress</td><td>~5 ms</td><td>response size</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        That adds up to roughly 90 to 115 ms on a typical request, comfortably under 300. The
        remaining room is not spare. It is there for the tail: the slow garbage collection
        pause, the cache miss, the dependency that takes a second today. Two decisions in the
        table already protect it. The four calls in the middle row run in parallel; in series
        they would take about 240 ms and leave no room at all. And the gateway checks the
        token’s signature locally instead of calling an authentication service for every
        request.
      </p>

      <Predict q="The home service calls four services in parallel and waits for all of them. Each answers in 20 ms 99% of the time and takes 250 ms the other 1%. What share of home requests take at least 250 ms?">
        <p>
          A home request is fast only if all four calls are fast. The chance of that is
          0.99 × 0.99 × 0.99 × 0.99 ≈ 0.961, so about 3.9% of home requests wait 250 ms or
          more. Each dependency is slow for 1 in 100 calls, yet the page is slow for nearly 4 in
          100.
        </p>
        <p>
          With ten parallel dependencies the share is 1 − 0.99¹⁰ ≈ 9.6%. This is why fan-out
          is expensive at the tail even when it is cheap on average. The usual remedies are to
          make fewer dependencies required, to give each call a timeout with a sensible
          default, and, for idempotent reads, to send a second copy of a slow request to
          another replica after a short wait (Dean and Barroso’s paper “The Tail at Scale”
          describes this “hedged request” and its cost: a few percent of extra load).
        </p>
      </Predict>

      <h3>The evening the delivery-estimate service slowed down</h3>
      <p>
        Here is the failure that the budget is meant to prevent, followed step by step. At
        8:20 pm a slow query on the delivery-estimate service’s database pushes its response
        time from 20 ms to about 2 seconds. The estimate is a nice-to-have: customers like
        seeing “30 min”, but they can order without it.
      </p>
      <p>
        The home service calls the estimate service with its HTTP client’s default timeout,
        which is 30 seconds. Home requests arrive at about 170 a second (600,000 peak-hour
        sessions over 3,600 seconds). Little’s law says the number of requests in progress is
        the arrival rate times the time each one spends in the system. Normally that is
        170 × 0.1 s ≈ 17. Now each request waits 2 seconds for its estimate, so it is
        170 × 2 ≈ 340.
      </p>
      <p>
        The home service runs on ten instances, each allowing 32 requests at a time: 320
        slots. At 340 in progress, the slots are full. New requests queue behind them. The
        queue makes them older, so they hold slots longer, so the queue grows. At 8 seconds
        the gateway gives up and returns an error. Customers see a spinner, pull down to
        refresh, and send another request while the first still holds its slot. Within a
        couple of minutes the home screen is failing for almost everyone. Nothing required is
        broken. An optional number on each restaurant card took the page down.
      </p>
      <p>
        The fix has three parts. First, a timeout that matches the budget: the estimate call
        gets 100 ms, and if it misses, the card shows a zone-level average (“30–40 min”) that
        is recomputed every few minutes and cached. Second, a separate limit per dependency,
        sometimes called a bulkhead: each instance allows at most, say, 20 estimate calls in
        flight, and a request that would be the 21st skips the call and uses the fallback
        immediately. That stops one slow dependency from consuming every slot. Third, a
        written decision about which dependencies are required.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Dependency</th><th>Required?</th><th>If it is slow or down</th></tr>
          </thead>
          <tbody>
            <tr><td>Restaurants serving the zone</td><td>yes</td><td>serve the last cached list; fail only if there is none</td></tr>
            <tr><td>Availability (open, busy, closed)</td><td>yes, with a fallback</td><td>use state up to 60 s old; mark cards “may be busy”</td></tr>
            <tr><td>Delivery estimate</td><td>no</td><td>show the zone average</td></tr>
            <tr><td>Offers</td><td>no</td><td>omit them; checkout recomputes offers anyway</td></tr>
            <tr><td>Recommendations</td><td>no</td><td>order by popularity in the zone</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The fix has costs. Some customers see a coarse estimate on a bad evening. Every
        fallback is a code path that runs rarely, and a path that runs rarely tends to be
        broken when it finally runs, so the fallbacks need tests and occasional deliberate
        exercise in production. The table also has to be kept current as the product adds
        features to the home screen.
      </p>
      <p>
        The table also changes availability arithmetic. If a request needs five services and
        each is available 99.9% of the time, the request can be available at most
        0.999⁵ ≈ 99.5% of the time, which is about 3.6 hours of failure in a 30-day month.
        With only two required, it is 0.999² ≈ 99.8%. Every required dependency costs nines,
        so making a dependency optional is often the cheapest reliability work available.
        The failure chapter later in the course builds on this.
      </p>

      <h3>Count availability in orders, not minutes</h3>
      <p>
        “99.95% uptime” sounds precise, but minutes are the wrong unit for Dabba. A ten-minute
        outage at 8:30 pm on a Friday hits about 600 seconds × 42 orders a second ≈ 25,000
        order attempts. The same ten minutes at 4 am hits a few hundred. A minute-based
        measure rates the two outages as equal. The business does not.
      </p>
      <p>
        So we measure availability as the share of requests, or for the order path the share
        of order attempts, that succeed. At 99.95% and a million orders a day, the allowance is
        about 500 failed order attempts a day. That allowance is useful in practice: it tells
        the team how much risk a deploy at 7:45 pm is allowed to carry, and it makes a peak-hour
        incident visibly more expensive than a quiet-hour one.
      </p>

      <h3>When this much planning is more than the problem needs</h3>
      <p>
        If Dabba were a pilot in one neighbourhood taking 200 orders a day, the brief would
        still be worth writing, but its numbers would say one server and one database, and the
        right move would be to build and learn. Designing for 150 orders a second on day one
        means paying to run capacity nobody uses, and building fallbacks for services that do
        not exist yet.
      </p>
      <p>
        The brief is also a hypothesis. We should revisit it when measured traffic differs from
        an assumption by more than about a factor of two, when the peak hour’s share changes
        (a lunch business behaves differently from a dinner one), or when a new product such
        as grocery delivery arrives with a different shape. Keeping the brief as a living page,
        with measured numbers replacing assumptions as they arrive, is cheap and keeps later
        arguments honest.
      </p>
      <p>
        We now know what Dabba must do and how often. The next chapter, Designing the API,
        writes the contract for the most important of those operations, placing an order. It
        also faces the case this chapter kept stepping around: a request that succeeds on the
        server while the customer’s screen says it failed.
      </p>
      <Notes
        items={[
          'The Dabba brief sets the course’s numbers: 1 million orders a day, 15% of them in the dinner hour, and design targets of 150 orders/s, 10,000 API requests/s and 2,000 menu views/s.',
          'Daily averages hide the peak; convert totals to the busiest hour, then add room for minute-level spikes.',
          'On a mobile network a cold connection spends three round trips before the request leaves, so connection reuse and fewer requests often beat faster server code.',
          'When a request waits on several services in parallel, 1 − 0.99ⁿ of requests meet at least one dependency’s slow 1%.',
          'Every dependency needs a timeout and a written fallback, or an optional feature can take down a required page.',
          'Availability measured in failed requests or orders reflects the business; an outage at 8:30 pm costs far more than the same minutes at 4 am.',
        ]}
      />
    </>
  ),

  /* ── Designing the API ─────────────────────────────────────────── */
  api: (
    <>
      <p>
        A customer in Bengaluru taps “Place order” as she steps into a lift. The spinner turns,
        the signal drops, and after ten seconds the app says “Something went wrong”. She taps
        again on the way out of the lift. Has she ordered one biryani or two? Has her bank
        account been debited once or twice? The answer depends entirely on decisions made in
        the API contract, long before that evening.
      </p>
      <p>
        This chapter designs the contract between Dabba’s apps and its backend, with most of
        the attention on placing an order. By the end we will have a request format that the
        server can check, an idempotency scheme that makes the second tap harmless, status
        codes that tell each client exactly what to do next, and rules for changing the
        contract while millions of old app versions are still in use.
      </p>

      <h3>Start from the operations, not the URLs</h3>
      <p>
        The brief listed what customers do: browse restaurants near an address, read a menu,
        place and pay for an order, follow its progress, and look back at past orders. Each
        operation becomes an endpoint, and the resources fall out of them.
      </p>
      <pre><code>{`GET  /v1/restaurants?zone=pune-baner        list for the home screen
GET  /v1/restaurants/{id}/menu              one restaurant's menu
POST /v1/orders                             place an order
GET  /v1/orders/{id}                        one order and its status
GET  /v1/orders?cursor=...                  the customer's order history
POST /v1/orders/{id}/cancel                 ask to cancel`}</code></pre>
      <p>
        Two choices are already in that list. The first is that there is no cart on the
        server. The cart lives in the app until checkout, and the order request carries its
        contents. That saves a write for every “add item” tap, which matters at 16 menu views
        per order, and it means the server must check the whole cart once, at the moment it
        matters. The cost is that a customer cannot start a cart on her phone and finish it on
        the website. Dabba accepts that; if the product later wants shared or cross-device
        carts, a cart resource comes back.
      </p>
      <p>
        The second is that cancelling is an action, <code>POST /orders/{'{'}id{'}'}/cancel</code>,
        rather than a <code>PATCH</code> that sets <code>status</code> to{' '}
        <code>{'"cancelled"'}</code>. An order moves through a state machine owned by the server:
        payment pending, placed, accepted, being prepared, picked up, delivered. Whether a
        cancel is allowed depends on the current state (before the restaurant accepts, yes;
        after the rider has picked it up, no) and it has side effects such as a refund. A
        generic PATCH invites clients to propose any state they like and leaves the server to
        reject the nonsense. A named action states the intent, and the server decides what it
        means in the current state.
      </p>

      <h3>What the order request carries, and what the server refuses to trust</h3>
      <p>Here is the body the app sends when the customer taps Place order.</p>
      <pre><code>{`POST /v1/orders
Idempotency-Key: 5b0e7c1e-7f2a-4d0c-9a51-2f3c8e4be1a9

{
  "restaurant_id": "r_48213",
  "items": [
    { "menu_item_id": "m_9001", "quantity": 2,
      "options": ["opt_spice_medium", "opt_extra_raita"] }
  ],
  "address_id": "addr_77",
  "payment_method": "upi",
  "quoted_total_paise": 58400
}`}</code></pre>
      <p>
        The request names things by ID and says how many. It does not tell the server what
        anything costs. The server looks up the current price of each item and option, applies
        offers, delivery fee, packaging and tax, and computes the total itself. A client that
        sends prices is a client that can be edited to send lower ones.
      </p>
      <p>
        The client does send <code>quoted_total_paise</code>, the total it showed the customer.
        This is not trusted either; it is a check. Menus are cached (the reads chapter explains
        how), so the price on screen can be a few minutes old. If the server’s total differs
        from the quoted one, it refuses the order with a specific error, and the app shows the
        new total and asks again. Without that field, the server would have to choose between
        charging a price the customer never saw and silently honouring a stale one.
      </p>
      <p>
        Money is an integer number of paise. Binary floating point cannot represent most
        decimal fractions exactly: 0.1 + 0.2 is 0.30000000000000004 in JavaScript, and
        rounding errors of that kind, summed over a million orders and split between
        restaurant payouts, rider pay and taxes, turn into reconciliation work. Integers of the
        smallest currency unit add exactly.
      </p>

      <h3>The response the customer never saw</h3>
      <p>
        Back to the lift. When the app’s request times out, there are three possibilities, and
        the app cannot tell them apart. The request may never have reached the server. It may
        have reached the server and failed there. Or it may have succeeded on the server, with
        the order written and payment started, while the response was lost on the way back.
      </p>
      <p>
        The app has to do something. Not retrying is wrong in the first two cases: the customer
        is left without dinner and without knowing why. Retrying blindly is wrong in the third:
        it places a second order. A design that is correct in all three cases needs the server
        to recognise a retry as a retry.
      </p>

      <Predict q="The app times out after 10 seconds and retries once. Suppose the first request did create the order and start a payment. With no idempotency key, what does the retry do, and who notices first?">
        <p>
          The server sees a valid, new-looking order request and creates a second order with
          its own payment. If the customer approves both UPI requests, which is easy when the
          app shows a payment screen again, she is charged twice. If she approves only one, a
          second order sits in “payment pending” until it expires.
        </p>
        <p>
          The restaurant usually notices first: two identical tickets arrive a few seconds
          apart. If both were paid, the kitchen may cook both, a rider may be assigned to each,
          and support handles the refund the next morning. At 150 orders a second, even a 0.1%
          retry rate on lost responses is about 9 duplicate orders a minute at peak.
        </p>
      </Predict>

      <h3>Idempotency keys, built so they actually work</h3>
      <p>
        An operation is idempotent if doing it twice has the same effect as doing it once.
        Reading an order is naturally idempotent. Creating one is not, so we make it so. The
        client generates a random key (a UUID) for each checkout attempt and sends it in an{' '}
        <code>Idempotency-Key</code> header. Every retry of that attempt sends the same key.
        The server stores the key together with the outcome, and when it sees the key again it
        returns the stored outcome instead of repeating the work. Stripe’s public API made this
        header pattern widely known, and its documentation is a good reference.
      </p>
      <Fig caption="Fig 1 · The response is lost; the retry carries the same key and receives the stored answer for the same order">
        <IdempotentRetry />
      </Fig>
      <p>
        The details decide whether it works. Start with when the client creates the key. It
        must be once per checkout attempt, not once per HTTP request. A key generated inside
        the HTTP retry loop is a new key on each retry, which protects nothing. The app should
        create the key when the customer taps Place order for a particular cart and store it
        with the cart on the phone, so that even if the app is killed and reopened, a retry
        uses the same key. If the customer changes the cart, that is a new attempt and gets a
        new key.
      </p>
      <p>
        On the server, the key lives in a table with a unique constraint.
      </p>
      <pre><code>{`CREATE TABLE idempotency_keys (
  customer_id    bigint      NOT NULL,
  key            uuid        NOT NULL,
  request_hash   bytea       NOT NULL,   -- hash of the request body
  status         text        NOT NULL,   -- 'in_progress' | 'completed'
  response_code  int,
  response_body  jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, key)
);`}</code></pre>
      <p>
        The key is scoped to the customer, so one customer’s key can never return another
        customer’s order. The request hash catches a client bug where the same key is reused
        with a different cart; returning the first order for a different cart would be wrong,
        so that case gets an error instead. Keys expire after a day, which is far longer than
        any retry and short enough to keep the table small: about a million rows.
      </p>
      <p>
        The handler then runs this logic. Try to insert the key with status{' '}
        <code>in_progress</code>. If the insert succeeds, this is the first attempt: create the
        order, store the response against the key, mark it <code>completed</code>. If the
        insert hits the unique constraint, read the existing row. If it is completed and the
        hash matches, return the stored response. If the hash differs, return an error saying
        the key was reused. If it is still in progress, another copy of this request is being
        handled right now (the customer’s first request is slow, not lost), so return a
        “still processing, retry shortly” error rather than starting a second order.
      </p>
      <p>
        One failure needs particular care: the server crashes after inserting the key and
        before finishing. If the key insert committed on its own, the key is stuck in{' '}
        <code>in_progress</code> and every retry is told to wait forever. The clean solution
        is to insert the key, create the order and record the response in the same database
        transaction, so that a crash rolls all three back together and the retry starts fresh.
        The writes chapter builds the full transaction around this.
      </p>
      <p>
        The payment provider sits outside that transaction, so the same idea has to extend to
        it. When Dabba asks the provider to create a payment, it passes the order ID as the
        provider’s own idempotency key. If Dabba’s call to the provider times out and is
        retried, the provider returns the existing payment instead of creating another. Every
        step that crosses a network and might be retried needs its own key, chosen so that
        retries of the same logical step carry the same value.
      </p>

      <h3>Status codes are the client’s retry policy</h3>
      <p>
        Every client Dabba will ever have, including old app versions nobody can update,
        decides what to do next from the response. HTTP status classes carry a broad meaning:
        2xx succeeded, 4xx means the request itself is wrong and sending it again unchanged
        will not help, 5xx means the server failed and a retry may work. If the API returns
        500 for an invalid address, well-behaved clients retry a request that can never
        succeed. If it returns 400 for a database timeout, they give up on a request that
        would have worked a second later.
      </p>
      <p>
        Broad classes are not enough for the order endpoint, so the body carries a stable
        machine-readable code, and the app branches on that code, not on the human-readable
        message.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Result</th><th>Status and code</th><th>What the app does</th></tr>
          </thead>
          <tbody>
            <tr><td>Order created</td><td>201</td><td>go to the payment screen</td></tr>
            <tr><td>Retry of a completed attempt</td><td>201, same body as the first</td><td>the same as above; it cannot tell, and does not need to</td></tr>
            <tr><td>Price changed since the menu loaded</td><td>409 <code>PRICE_CHANGED</code> with new total</td><td>show the new total; on confirm, send with a new key</td></tr>
            <tr><td>Item sold out</td><td>409 <code>ITEM_UNAVAILABLE</code> with item IDs</td><td>remove the items, show the cart again</td></tr>
            <tr><td>Same key still being processed</td><td>409 <code>IN_PROGRESS</code></td><td>wait a second, retry with the same key</td></tr>
            <tr><td>Same key, different body</td><td>422 <code>KEY_REUSED</code></td><td>a client bug; log it, start a new attempt</td></tr>
            <tr><td>Address outside delivery zone</td><td>422 <code>ADDRESS_NOT_SERVICEABLE</code></td><td>ask for another address; do not retry</td></tr>
            <tr><td>Too many requests</td><td>429 with <code>Retry-After</code></td><td>wait as told, retry with the same key</td></tr>
            <tr><td>Server or upstream failure</td><td>503 or 504</td><td>retry with backoff and the same key</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Notice which rows say “same key” and which say “new key”. Retrying a failure keeps the
        key, because it is the same attempt. Confirming a new price makes a new key, because the
        customer has agreed to a different order. The body of each error looks like this:
      </p>
      <pre><code>{`{
  "error": {
    "code": "PRICE_CHANGED",
    "message": "Prices at this restaurant have changed.",
    "retryable": false,
    "details": { "new_total_paise": 61200 }
  }
}`}</code></pre>

      <h3>Lists that stay correct while they change</h3>
      <p>
        Order history is a list that grows while the customer scrolls it. The obvious design,{' '}
        <code>?page=3&amp;size=20</code>, asks the database to skip 40 rows and return the next
        20. If a new order is created while the customer is on page 2, every row shifts by one,
        and page 3 repeats an order she already saw. Skipping also gets slower as pages get
        deeper, because the database still has to walk past every skipped row.
      </p>
      <p>
        A cursor fixes both problems. Each page ends with an opaque token that encodes the
        position of its last row, here <code>(created_at, order_id)</code>. The next request
        asks for rows strictly after that position, which an index on{' '}
        <code>(customer_id, created_at, order_id)</code> answers directly, however deep the
        page. New orders appear at the top and do not disturb the pages behind them. The token
        is opaque (base64 of the values, ideally signed) so clients cannot build their own and
        the server can change what is inside later.
      </p>

      <h3>Changing the contract when old apps never update</h3>
      <p>
        A web page can change its API calls on every deploy. A phone app cannot: a customer who
        installed Dabba in March may still run that version in November. So every response the
        server sends must be readable by every app version still in use, and every request
        those versions send must still be accepted.
      </p>
      <p>
        Some changes are safe. Adding a new endpoint is safe. Adding an optional field to a
        request is safe if the server has a sensible default. Adding a field to a response is
        safe if clients ignore fields they do not know, which is a rule to put in the client
        code on the first day. Other changes break old apps: removing or renaming a field,
        changing its type, making an optional request field required, or changing what a value
        means.
      </p>
      <p>
        One break is easy to miss. Suppose Dabba adds an order status,{' '}
        <code>RIDER_REASSIGNED</code>, for when a rider drops an order and another takes it.
        An old app that maps status strings to screens with an exhaustive switch meets a value
        it has never seen. Depending on how it was written, it crashes, shows a blank screen,
        or shows “Delivered”. None of these is the server’s bug, but all of them are the
        server’s problem. The defence has two parts: clients must treat unknown enum values as
        a generic “in progress” state from day one, and the server can map new values to old
        ones for app versions that predate them, using the app version the client sends in a
        header.
      </p>
      <p>
        When a change really cannot be made compatibly, it goes into a new version,{' '}
        <code>/v2/orders</code>, and both versions run side by side. The app version header
        lets the team watch v1 traffic fall as people update. For versions that are too old to
        support, the API returns a specific “upgrade required” response that the app shows as
        a full-screen prompt. That prompt has to have been built into the app years earlier,
        which is why it belongs in the first release.
      </p>

      <h3>One screen, one request: when the shape is not plain REST</h3>
      <p>
        The first chapter found that round trips on a mobile network cost more than server
        work. Dabba’s home screen draws on eight endpoints: the restaurant list, banners, the
        active order, saved addresses and so on. Even over one HTTP/2 connection, eight calls
        made in sequence because each depends on the last cost eight round trips. Dabba adds a
        backend-for-frontend endpoint, <code>GET /v1/screens/home</code>, that makes those
        calls inside the data centre, where a round trip is under a millisecond, and returns
        one composed response.
      </p>
      <p>
        The cost is coupling. That endpoint exists for one screen of one app, so it changes
        whenever the screen does, and it must be versioned with the app as carefully as any
        other endpoint. GraphQL addresses the same problem differently, letting each client ask
        for exactly the fields it needs, at the price of a query planner on the server, harder
        HTTP caching and the risk of clients writing expensive queries. Between Dabba’s own
        services, where both sides deploy together and typed contracts and deadlines matter,
        gRPC is a reasonable choice. Plain JSON over HTTP remains the default for the public
        API until a measured problem names one of these alternatives.
      </p>

      <h3>When this machinery is not needed</h3>
      <p>
        Idempotency keys are for operations that create or change things and might be retried.
        Reads do not need them. A <code>PUT</code> that sets a field to a value is already
        idempotent, as is a delete of a specific ID. An internal batch job that runs once a
        night and checks its own results may be simpler with a natural key (the restaurant and
        the payout date, say) and a unique constraint. Adding a key table to every endpoint is
        cost without benefit.
      </p>
      <p>
        We should revisit the contract when the product changes who calls it. A partner
        integration, such as a restaurant chain that wants to receive orders in its own
        point-of-sale system, brings clients that Dabba does not write and cannot force to
        upgrade. That is the moment to publish the contract formally, with an OpenAPI
        description, documented limits and deprecation dates.
      </p>
      <p>
        The contract tells clients what to send and what to expect. It says nothing about
        where those requests land. The next chapter, Load balancing, gateways and discovery,
        follows a request from the edge of Dabba’s network to one of thirty identical servers,
        and looks at how the boxes in between can fail a healthy fleet.
      </p>
      <Notes
        items={[
          'The server computes every price; the client’s quoted total is a check that turns a silent price change into an explicit question.',
          'After a timeout the client cannot tell “never arrived” from “succeeded but the reply was lost”, so creating an order must be safe to retry.',
          'An idempotency key belongs to one checkout attempt, is stored on the phone with the cart, and is reused by every retry of that attempt.',
          'Store the key, the order and the response in one transaction, and pass the order ID to the payment provider as its idempotency key.',
          'Status codes and stable error codes are the client’s retry policy: retries keep the key, a changed order gets a new one.',
          'Old app versions live for months, so unknown fields and unknown enum values must be tolerated by clients from the first release.',
        ]}
      />
    </>
  ),

  /* ── Load balancing, gateways and discovery ────────────────────── */
  gateway: (
    <>
      <p>
        The API contract says what a request looks like. This chapter is about where it goes.
        Between the customer’s phone and Dabba’s order code sit a few boxes that most teams
        configure once and then forget: a load balancer, an API gateway, and whatever tells
        them which servers exist right now. They are easy to forget because they usually work.
        When they fail, they fail for every request at once.
      </p>
      <p>
        We will size Dabba’s API tier from the brief, then follow the decisions the boxes in
        front of it make: what they can see of a request, how they pick a server, how they
        decide a server is unhealthy, what happens to requests in flight during a deploy, and
        which jobs belong in the gateway.
      </p>

      <h3>How many servers, and why thirty</h3>
      <p>
        The brief set a design target of 10,000 API requests a second at the dinner peak.
        Suppose a typical request costs about 5 ms of CPU time once caching is in place (the
        reads chapter earns that number). A server with 4 cores can then do at most
        4 × 1,000 / 5 = 800 requests a second at full CPU. Nobody runs servers at full CPU,
        because queueing delay rises steeply as utilisation approaches 100%, so we plan for
        about 60%, or roughly 500 requests a second each. That gives 10,000 / 500 = 20
        servers.
      </p>
      <p>
        Twenty is the number needed when everything is up. Dabba runs in three availability
        zones in Mumbai, and a zone can fail as a unit: a power or network problem takes out
        every server in it. To survive that at peak, the other two zones must carry the full
        load, so they need 20 servers between them, 10 per zone. Three zones of 10 is 30
        servers. A third of the fleet is idle on a normal evening, and that is the price of
        surviving a zone loss at 8:30 pm. The same arithmetic applies to every tier.
      </p>
      <p>
        Thirty servers only help if requests are spread across them sensibly, and only if the
        servers hold no state that ties a customer to one of them. Dabba’s API servers keep no
        session data in memory; anything that must survive a request lives in the database or
        the cache. So any server can handle any request, a server can be removed at any time,
        and adding capacity means starting more copies.
      </p>

      <h3>What the balancer can see decides what it can do</h3>
      <p>
        Load balancers come in two broad kinds, named after the network layer they work at. A
        layer 4 balancer sees TCP connections: source and destination addresses and ports. It
        chooses a server when a connection opens and then forwards bytes without reading them.
        That makes it fast and simple, and blind to everything inside the connection. A layer
        7 balancer terminates TLS, parses HTTP, and chooses a server for each request. It can
        route <code>/v1/orders</code> to the order service and <code>/v1/restaurants</code> to
        the catalogue service, retry a failed GET on another server, and record the status
        code and latency of every request. It pays for that with CPU and with holding the TLS
        keys.
      </p>
      <p>
        The difference matters most with long-lived connections. Dabba’s app keeps one HTTP/2
        connection open for a whole session and sends all its requests over it. Behind a layer
        4 balancer, every one of those requests goes to whichever server the connection landed
        on. The same happens inside the data centre, where Dabba’s services call each other
        over gRPC, which also uses long-lived HTTP/2 connections. Suppose the menu service
        calls the pricing service through a connection-level balancer. Each menu server opens
        one connection and keeps it for hours, so all its calls go to one pricing server. When
        the pricing service is scaled from 6 servers to 12 for the evening, the new 6 receive
        almost nothing, because no menu server has opened a new connection. The fleet looks
        doubled on the dashboard and behaves as if it were not.
      </p>
      <p>
        Dabba therefore uses layer 7 balancing wherever connections are long-lived: a managed
        HTTP load balancer at the front of the region, and request-level balancing for
        service-to-service gRPC (either the client library balancing across all servers, or a
        proxy that balances per request). A layer 4 balancer is still a good fit in front of
        the layer 7 tier itself, where its job is to spread connections across a handful of
        proxy machines that each handle thousands of them.
      </p>

      <h3>Picking a server when requests are not alike</h3>
      <p>
        Round robin, sending each request to the next server in turn, is the default in many
        balancers. It assumes every request costs the same and every server is equally fast.
        Neither is true at Dabba. A cached menu read takes a few milliseconds; placing an order
        waits on the database and the payment provider for hundreds. And servers are not
        identical in practice: one shares a physical host with a noisy neighbour, another is in
        a long garbage collection pause, a third is warming its local cache after a restart.
      </p>

      <Predict q="Thirty servers share 10,000 requests a second by round robin, about 333 each, while each can handle about 800 a second at full CPU. One server slows down so that each request takes three times as much CPU. What happens to that server, and to Dabba’s p99?">
        <p>
          The slow server can now handle about 800 / 3 ≈ 267 requests a second, but round
          robin still sends it 333. Arrivals exceed capacity, so its queue grows without limit
          for as long as the slowdown lasts. Requests sent to it wait longer and longer, and
          soon they time out.
        </p>
        <p>
          It receives 1 in 30 requests, which is 3.3% of all traffic. Since more than 1% of
          requests are now very slow or failing, Dabba’s overall p99 latency is set by the
          single bad server. Twenty-nine healthy servers cannot help, because round robin never
          looks at how busy a server is.
        </p>
      </Predict>

      <p>
        The remedy is to send work to servers that are keeping up. A balancer that tracks how
        many requests each server currently has in flight can send each new request to the one
        with the fewest. A slow server accumulates in-flight requests, so it stops being chosen
        until it drains, and its share falls to what it can actually handle. This policy is
        called least outstanding requests, and it is a sturdy default for request-level
        balancing.
      </p>
      <p>
        Choosing the single least loaded server has a weakness when there are several
        balancers, each with a slightly stale view of the counts. They all pick the same
        apparently idle server at the same moment, overload it, then all move to the next one.
        The common fix is surprisingly simple: pick two servers at random and send the request
        to whichever has fewer requests in flight. This “power of two choices” avoids the herd,
        because different balancers pick different pairs, and it still keeps load close to
        even. Envoy’s least-request policy works this way by default.
      </p>
      <p>
        Session affinity, sending one customer’s requests to the same server each time, is
        the opposite trade. It helps when servers hold useful per-customer state in memory,
        and it hurts everything else: a popular customer cannot be spread, a server’s death
        loses whatever it held, and the balancer can no longer route around a slow server.
        Dabba’s API servers hold no such state, so they do not use affinity. The realtime
        chapter will meet a case where connections are inherently tied to a server, and we
        will handle it there.
      </p>

      <h3>The health check that took the whole fleet out</h3>
      <p>
        A balancer needs to know which servers to avoid, so it asks each one regularly whether
        it is healthy. What the server checks before answering “yes” turns out to be a
        significant design decision. Here is how it went wrong for a team that made the
        natural choice.
      </p>
      <p>
        The API servers’ <code>/health</code> endpoint checks that the process is running, that
        it can query Postgres, and that it can reach Redis. The reasoning is sound on its face:
        a server that cannot reach its data cannot serve requests. At 8:40 pm, Redis fails
        over from its primary to a replica, which takes about 20 seconds. During those 20
        seconds every API server’s health check fails, because every server uses the same
        Redis. The balancer is configured to remove a server after three failed checks five
        seconds apart. Fifteen seconds in, it has removed all 30. It now returns errors for
        every request: menus, orders, order tracking, everything.
      </p>
      <p>
        Most of those requests did not need Redis. Menu reads could have gone to Postgres at
        higher cost, order placement does not touch Redis at all, and the failover would have
        finished five seconds later. A 20-second blip in one shared dependency became a full
        outage because the health check tested something every server shared. When all
        servers fail a check together, the check is reporting a dependency problem, and
        removing servers cannot fix a dependency problem.
      </p>
      <p>
        The fix separates two questions. Liveness asks whether this process is broken in a
        way a restart would fix: deadlocked, out of memory, stuck. Readiness asks whether this
        particular server should receive traffic right now: still starting up, warming its
        cache, or shutting down. Neither should depend on shared databases or caches. Problems
        with shared dependencies are handled in the request path, with timeouts and fallbacks
        of the kind the first chapter introduced, where the code can decide request by request
        what it can still do.
      </p>
      <p>
        Two balancer settings act as a further safety net. Outlier detection removes servers
        based on their real traffic, for example a server whose error rate is far above its
        peers, and caps how much of the fleet can be removed this way (Envoy’s default cap is
        10%). A panic threshold makes the balancer give up on health information when too few
        servers look healthy: Envoy, by default, spreads traffic across all servers once fewer
        than half look healthy, and AWS’s application load balancer routes to all targets when
        all of them fail their checks. Both encode the same judgement: when the whole fleet
        looks sick, the health signal is more likely wrong than the fleet.
      </p>
      <p>
        These fixes have a cost. A server with a real local fault, such as a broken network
        interface or a corrupted local cache, now stays in rotation a little longer, until
        outlier detection notices its errors. Dabba accepts slightly slower removal of one bad
        server in exchange for never removing all good ones.
      </p>

      <h3>Deploys without dropped orders</h3>
      <p>
        Dabba deploys the order service several times a week, replacing servers a few at a
        time. Each server being replaced has requests in flight. At 150 orders a second with
        each order request taking about half a second on average, Little’s law gives
        150 × 0.5 = 75 order requests in progress across 30 servers, about 2 or 3 per server.
        Kill a server abruptly and those requests fail, some after the order was written and
        before the response was sent. Over a rolling deploy of 30 servers, that is around 75
        order attempts that fail, and some of those customers do not know whether they
        ordered.
      </p>
      <p>
        The idempotency keys from the previous chapter make the retries safe, but it is better
        not to need them. A clean shutdown, usually called draining, goes in order. When the
        server is told to stop, it first starts failing its readiness check so the balancer
        stops sending new requests. It keeps accepting for a few more seconds, because the
        balancer’s view updates asynchronously; on Kubernetes, a pod can still receive new
        requests for several seconds after it has been asked to stop, which is why a short
        pause before shutdown is a common practice. Then it stops accepting, finishes the
        requests it has, closes idle keep-alive connections, and exits. A 30-second limit on
        the whole process covers the slowest order request comfortably.
      </p>

      <h3>What belongs in the gateway</h3>
      <p>
        An API gateway is a layer 7 proxy that does the jobs every request needs regardless of
        which service handles it. Because every request passes through it, putting a job there
        means writing it once instead of in every service. For the same reason, anything in
        the gateway is something every request depends on, and a mistake in it is a mistake
        for all traffic.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Job</th><th>In Dabba’s gateway?</th><th>Reasoning</th></tr>
          </thead>
          <tbody>
            <tr><td>Verify the login token’s signature and expiry</td><td>yes</td><td>same for every request; needs no data beyond a public key</td></tr>
            <tr><td>Rate limits per customer and per IP address</td><td>yes</td><td>must run before expensive work; covered in the rate limiting chapter</td></tr>
            <tr><td>Route by path to the right service</td><td>yes</td><td>the gateway’s main reason to exist</td></tr>
            <tr><td>Request IDs, access logs, latency metrics</td><td>yes</td><td>one consistent record of every request</td></tr>
            <tr><td>Timeouts</td><td>yes</td><td>bounded waits at the edge protect everything behind it</td></tr>
            <tr><td>Retries</td><td>only for GET and keyed POSTs</td><td>retrying an unkeyed POST can duplicate the action</td></tr>
            <tr><td>Can this customer see order 9001?</td><td>no</td><td>needs order data; the order service decides</td></tr>
            <tr><td>Free delivery above ₹199</td><td>no</td><td>business logic; belongs to pricing, deployed and tested with it</td></tr>
            <tr><td>Composing the home screen</td><td>no</td><td>a separate backend-for-frontend service, deployed on its own</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The pattern in the table: the gateway authenticates (who is this?) and the service
        authorises (may they do this to this order?). The gateway applies policy that is the
        same for every request; anything that depends on business data or changes with the
        product lives in a service that can be deployed and rolled back on its own.
      </p>
      <p>
        Timeouts deserve one more look, because they interact with the idempotency design.
        Dabba’s app waits 10 seconds for an order response. The gateway waits 8, the order
        service gives itself 7 overall, and its call to the payment provider gets 5. Each
        layer’s limit sits inside the one above it, so an inner layer gives up and returns a
        meaningful error before the outer one gives up and returns a generic timeout. If the
        order were reversed, with the gateway at 5 seconds and the order service still
        working for 7, the gateway would return a timeout while the order service went on to
        create the order. The customer would retry, and only the idempotency key would stand
        between her and a second order. Passing the remaining time along with each call (gRPC
        does this with its deadline; HTTP services can use a header) lets every layer stop
        work that nobody is waiting for.
      </p>

      <h3>Finding servers that keep moving</h3>
      <p>
        At 7 pm Dabba’s autoscaler adds servers to the menu service, and at 11 pm it removes
        them. Deploys replace servers several times a week. So the list of servers behind
        each service is always changing, and something must keep the balancers’ view current.
        This is service discovery: a registry of which servers exist for each service and
        which are ready, updated as servers start, pass readiness, and stop.
      </p>
      <p>
        On Kubernetes, the registry is built in: each service has a list of endpoints, filled
        from pods that pass readiness. Callers find it in one of two ways. With server-side
        discovery, the caller sends requests to a stable address and a proxy or balancer
        behind it looks up the current servers. With client-side discovery, the caller’s own
        library subscribes to the list and balances requests itself, which removes a hop and
        gives per-request balancing for gRPC. A service mesh places a proxy next to every
        server and does client-side balancing, retries, timeouts and encrypted connections in
        that proxy, configured centrally. It is the same set of jobs, run on every machine,
        with the operational cost of running the mesh itself.
      </p>
      <p>
        DNS is the oldest discovery mechanism and has a known trap. Some runtimes and HTTP
        client libraries cache DNS answers far longer than the record’s time-to-live, or keep
        connections open to an address indefinitely. When servers are replaced, such clients
        keep sending to addresses that no longer exist. Whichever mechanism Dabba uses, one
        system must own the truth about which servers exist, and every caller must be checked
        to see that it actually follows that truth.
      </p>

      <h3>When to keep it simpler</h3>
      <p>
        Dabba at this stage has about fifteen services and one region. A managed HTTP load
        balancer at the front, Kubernetes service discovery, and gRPC clients that balance per
        request are enough. A service mesh earns its place when there are many teams and many
        services, when encryption and identity between every pair of services become a
        requirement, or when traffic rules per route change often enough that changing them in
        each service is a burden. None of that is true yet.
      </p>
      <p>
        We should revisit the setup when one of those becomes true, when a second region
        arrives (routing between regions is a different problem, covered in the multi-region
        chapter), or when the gateway starts accumulating business rules, which is a sign that
        a backend-for-frontend or a proper service is missing.
      </p>
      <p>
        Requests now reach a server that can handle them. The next chapter, Scaling reads,
        looks at what that server does for the most common request after the home screen: the
        menu page, read sixteen times for every order placed, and how to make it cheap without
        showing customers prices or dishes that no longer exist.
      </p>
      <Notes
        items={[
          'Size a tier for peak load at a safe utilisation, then add enough to survive losing a zone; for Dabba that is 20 servers needed and 30 run.',
          'A layer 4 balancer sees connections, so long-lived HTTP/2 and gRPC connections defeat it; balance those per request.',
          'Least outstanding requests, or two random choices, steers work away from a slow server; round robin keeps feeding it.',
          'Health checks must not test shared dependencies, or a blip in one cache removes every server at once.',
          'Draining means fail readiness, wait for the balancer to notice, finish in-flight work, then exit.',
          'The gateway authenticates and applies uniform policy; authorisation and business rules stay in services, and timeouts shrink from the outside in.',
        ]}
      />
    </>
  ),

  /* ── Scaling reads ─────────────────────────────────────────────── */
  reads: (
    <>
      <p>
        A menu page is read about sixteen times for every order placed. At 8:15 pm a biryani
        restaurant in Hyderabad might have hundreds of people looking at its menu, while its
        menu changes a few times a week and its “sold out” markers change a few times an
        evening. Serving every one of those views by asking the database the same questions
        again is wasteful, and at Dabba’s peak it is more than one database can do.
      </p>
      <p>
        This chapter designs the menu’s read path. The core move is a cache in front of the
        database, and most of the work is deciding, piece by piece, how stale each part of the
        menu may be and what makes a cached copy go away. We will also meet the three ways a
        cache causes outages: a race that keeps old data alive, a stampede when a hot entry
        expires, and the cold start when a cache comes back empty.
      </p>

      <h3>What a menu view costs without a cache</h3>
      <p>
        Building one menu from Postgres means reading the restaurant row, its categories,
        about 80 items, their option groups (spice level, extra raita, half or full portion)
        and the current availability of each item. With sensible indexes that is a handful of
        queries and about 25 ms of database time, producing a JSON document of around 40 KB.
      </p>
      <p>
        The brief’s design target is 2,000 menu views a second. At 25 ms each, that is
        2,000 × 0.025 = 50 seconds of database work every second: about 50 database cores
        doing nothing but rebuilding menus that have not changed since the last request. The
        same database also takes orders. If a cache answers 98% of views, only 40 a second
        reach the database, which is one core’s worth of work.
      </p>
      <p>
        Two more numbers shape the design. All 50,000 menus at 40 KB each come to about 2 GB,
        which fits in the memory of one modest cache server. So the cache will never need to
        evict menus for lack of space; misses will come from entries expiring or being
        invalidated, and from the cache starting empty. And popularity is skewed: assume the
        busiest 1% of restaurants receive about 30% of menu views, while thousands of small
        restaurants see a view every few minutes.
      </p>

      <h3>Split the menu by how fast each part changes</h3>
      <p>
        A menu is not one piece of data with one freshness requirement. Its parts change at
        very different rates, and a stale copy of each part causes a different problem. The
        useful question for each part is: if a customer sees an old value, what happens next?
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Part of the menu</th><th>Changes</th><th>Tolerable staleness</th><th>What a stale copy causes</th></tr>
          </thead>
          <tbody>
            <tr><td>Names, descriptions, categories, photo links</td><td>a few times a week</td><td>minutes</td><td>a slightly old description</td></tr>
            <tr><td>Prices</td><td>a few times a month</td><td>minutes, because checkout re-prices</td><td>a <code>PRICE_CHANGED</code> response at checkout</td></tr>
            <tr><td>Item sold out</td><td>many times an evening</td><td>about 30 seconds</td><td>a cart built around a dish that is gone</td></tr>
            <tr><td>Restaurant open, busy or closed</td><td>several times an evening</td><td>about 30 seconds</td><td>orders sent to a kitchen that has stopped cooking</td></tr>
            <tr><td>Offers for this customer</td><td>per customer</td><td>not in a shared cache at all</td><td>one customer’s discount shown to another</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Prices can tolerate minutes only because the API chapter made checkout recompute every
        price and compare it with the quoted total. That decision is what lets the menu cache
        be relaxed. Without the server-side check, a stale price would become a wrong charge,
        and the cache would need to be exact.
      </p>
      <p>
        The table suggests two cache entries per restaurant. The menu document holds the slow
        parts (structure, descriptions, prices) and can live for a long time, refreshed when
        the restaurant edits its menu. A small availability entry holds the sold-out item IDs
        and the open or closed state, about a hundred bytes, with a 30-second lifetime and an
        explicit update whenever the kitchen taps “sold out” on its tablet. The menu service
        reads both and merges them. That costs a second cache lookup per view, which is a
        fraction of a millisecond, and in exchange a sold-out toggle never forces a 40 KB
        rebuild. Personal offers are fetched separately for each customer and never put in the
        shared menu entry.
      </p>

      <h3>Cache-aside, and the race it hides</h3>
      <p>
        The pattern Dabba uses is cache-aside: the application checks the cache, and on a miss
        reads the database and puts the result in the cache. When the restaurant edits its
        menu, the application writes the database and then deletes the cache entry, so the
        next read rebuilds it.
      </p>
      <pre><code>{`async function getMenu(restaurantId) {
  const cached = await redis.get(\`menu:\${restaurantId}\`)
  if (cached) return JSON.parse(cached)
  const menu = await buildMenuFromDb(restaurantId)   // ~25 ms
  await redis.set(\`menu:\${restaurantId}\`, JSON.stringify(menu), { EX: 3600 })
  return menu
}

async function updatePrice(itemId, paise) {
  await db.updateItemPrice(itemId, paise)
  await redis.del(\`menu:\${restaurantIdOf(itemId)}\`)
}`}</code></pre>
      <p>
        This looks correct and is correct most of the time. The problem is an ordering that
        happens rarely, but at 2,000 views a second, rarely still means regularly.
      </p>
      <Fig caption="Fig 1 · A slow reader puts back a menu the editor has already replaced">
        <CacheAsideRace />
      </Fig>
      <p>
        A reader misses the cache and reads the menu from the database: paneer tikka at ₹240.
        Before it writes that to the cache, perhaps because its server paused for garbage
        collection, the restaurant owner changes the price to ₹280. The editor’s code updates
        the database and deletes the cache entry, which is not there yet, so the delete does
        nothing. Then the reader resumes and writes its copy, with the old price, into the
        cache. With a one-hour lifetime, customers now see ₹240 for up to an hour, every
        checkout fails with <code>PRICE_CHANGED</code>, and the owner, who can see the old
        price in the customer app, calls support to say the edit did not work.
      </p>
      <p>
        The lifetime bounds the damage, which is one reason to always set one, even on data
        that is invalidated explicitly. To remove the race, Dabba gives each menu a version
        number. Every edit increments <code>menu_version</code> on the restaurant row in the
        same transaction as the change. The cached document is stored under a key that
        includes the version it was built from, <code>menu:48213:v17</code>, and a small
        pointer entry, <code>menuver:48213</code>, records the current version. Readers look
        up the pointer, then the document. A reader that built a document from version 16 and
        stored it late stores it under the version-16 key, which no reader asks for once the
        pointer says 17. The race can still happen; it just no longer matters.
      </p>
      <p>
        The pointer itself must not go stale forever, so it has a short lifetime, 60 seconds,
        and on a miss the reader takes the version from the database. If the editor’s process
        crashes after committing and before updating the pointer, readers see the old version
        for at most a minute. The cost of the scheme is two dependent cache lookups per view
        instead of one, about half a millisecond more, and old versions that sit in the cache
        until their own lifetimes expire. Both are cheap.
      </p>

      <Predict q="Dabba’s menu cache answers 98% of views. At 8:10 pm a botched maintenance restarts the Redis cluster and it comes back empty. What reaches Postgres in the first minute, and what else suffers?">
        <p>
          All 2,000 views a second now miss. Each costs about 25 ms of database time, so the
          database is asked for 50 cores’ worth of work instead of one. The primary cannot do
          that. Queries queue, each one takes longer, and the menu rebuilds take longer still,
          so more of them overlap. Popular menus are rebuilt dozens of times in parallel,
          because every request that misses starts its own rebuild.
        </p>
        <p>
          The worst effect is elsewhere. Orders are written to the same database, so placing
          an order slows down and starts timing out. A cache problem on the read path has
          become an outage of the write path, in the dinner peak. The next section covers the
          defences: menu rebuilds that cannot reach the order database’s primary, a limit on
          how many rebuilds run at once, one rebuild per key instead of hundreds, and serving
          slightly stale menus while the cache refills.
        </p>
      </Predict>

      <h3>Hot restaurants and the stampede</h3>
      <p>
        During a cricket final, Dabba features one restaurant on the home banner. Its menu
        goes from 20 views a second to 1,500. Two separate problems follow.
      </p>
      <p>
        The first is the hot key. A Redis cluster spreads keys across shards, but a single key
        lives on one shard. 1,500 reads a second of a 40 KB document is 60 MB a second, about
        480 megabits a second, all of it leaving one cache node, on top of everything else
        that node serves. Adding shards does not help, because the key cannot be split. The
        fix is a small in-process cache on each menu server that keeps the hottest documents
        for one or two seconds. With 30 servers each refreshing the key at most once a second,
        Redis sees about 30 reads a second for it instead of 1,500. Customers may see a menu
        up to two seconds older, which the table above already allows.
      </p>
      <p>
        The second is the stampede. At 8:32 pm the restaurant edits its menu, the version
        changes, and the new document is not in the cache. Every request in the next moments
        misses. A rebuild normally takes 25 ms, but under load it might take 200 ms, and
        during those 200 ms about 1,500 × 0.2 = 300 requests arrive, each starting the same
        rebuild with the same queries against the database. The more rebuilds run, the slower
        each one gets, and the longer the window during which new requests also miss.
      </p>
      <p>
        Request coalescing fixes this. On each server, the first request to miss a key starts
        the rebuild, and every other request for the same key waits for that result instead of
        starting its own. Go’s <code>singleflight</code> package is a well-known
        implementation, and it is a few dozen lines in any language. With 30 servers, at most
        30 rebuilds run for one key instead of 300. A short lock in Redis can reduce that to
        one across the fleet, at the cost of another round trip and a lock that must expire if
        its holder dies.
      </p>
      <p>
        Better still is to avoid the moment where nothing is cached. Dabba stores each menu
        entry with a soft expiry inside the value, a little earlier than the real one. A reader
        that finds an entry past its soft expiry returns the stale copy immediately and starts
        one background rebuild. Customers get the old menu for a few hundred milliseconds
        longer, and nobody waits for the database. For entries that are refreshed in bulk, such
        as all menus warmed after a deploy, the lifetimes get random jitter of a few minutes,
        so they do not all expire in the same second an hour later.
      </p>
      <p>
        The cold start from the prediction above needs two more defences. Menu rebuilds read
        from a replica of the database, never from the primary that takes orders, so a menu
        storm cannot slow order placement. And each server limits concurrent rebuilds, say to
        8; a request that would exceed the limit gets a stale copy if one exists or a quick
        error if not, which the app retries a moment later. During a cold start that limit
        means some customers see an error on a menu for a few seconds. Without it, everyone
        sees a slow app for many minutes and nobody can place an order.
      </p>

      <h3>Small restaurants and the arithmetic of hit rate</h3>
      <p>
        If an entry lives for T seconds and a key is read r times a second, the cache misses
        about once per T seconds and serves about r × T reads in that time, so the hit rate
        for that key is roughly 1 − 1 / (r × T). For a popular restaurant read 10 times a
        second with a one-hour lifetime, that is 1 − 1 / 36,000, almost perfect. For a small
        restaurant read once every five minutes with a five-minute lifetime, r × T is 1, and
        the cache barely helps: nearly every view is a miss.
      </p>
      <p>
        This is why Dabba invalidates menus on edit rather than relying on short lifetimes.
        Explicit invalidation lets every menu, popular or not, keep its cache entry for an
        hour or a day, because staleness is handled by the version change, not by expiry. The
        long tail of small restaurants then hits the cache too. The overall hit rate depends on
        the long tail more than intuition suggests, because there are so many small
        restaurants.
      </p>
      <p>
        Requests for restaurants that do not exist need handling too. Old shared links, deleted
        restaurants and scrapers trying random IDs all miss the cache, because there is nothing
        to cache, and every one of them reaches the database. Caching the absence (“no
        restaurant 99999”) for a minute closes that path.
      </p>

      <h3>Read replicas, and the customer who could not find her order</h3>
      <p>
        Menu rebuilds now go to a read replica: a copy of the database that receives the
        primary’s changes a little later, usually milliseconds, sometimes seconds under heavy
        write load. For menus that lag does not matter, because the cache is already staler
        than the replica.
      </p>
      <p>
        It matters a great deal for a different read. A customer places an order, the order
        service commits it on the primary and returns its ID, and the app immediately loads{' '}
        <code>GET /orders/9001</code> to show the tracking screen. If that read goes to a
        replica that is 300 ms behind, the order does not exist there yet, and the customer
        sees “Order not found” a second after paying. Restaurant owners hit the same problem
        when they edit a price and reload their own menu page to see the old one.
      </p>
      <p>
        The guarantee missing here is called read-your-writes: a client should always see its
        own changes. One way to provide it is to send reads that follow a recent write by the
        same user to the primary, for example for 10 seconds after any write. Another is to
        return the new version number from the write and have the read wait until the replica
        has caught up to it. Dabba uses the simplest option for orders: reads of a single order
        by ID go to the primary, and the tracking screen is served from a cache that the order
        service fills at the moment it creates or changes an order.
      </p>
      <p>
        That last choice is worth working through, because it reverses an instinct. Order
        status looks like data that must be fresh, so it seems a poor candidate for caching.
        But with 42 orders a second at peak and about 35 minutes from order to doorbell,
        about 42 × 2,100 ≈ 88,000 orders are in progress at once. If each tracking screen asks
        for status every 10 seconds, that is 8,800 reads a second, more than four times the
        menu traffic. Each order changes status about six times and is read about 200 times.
        Writing the new status into the cache as part of every status change (write-through)
        keeps those reads off the database, and the realtime chapter later replaces the
        polling with pushed updates.
      </p>

      <h3>What should not be cached</h3>
      <p>
        Some reads drive decisions where a stale answer produces a wrong action rather than an
        old display. The idempotency check in the order API must read the database, because a
        stale “key not found” would create a duplicate order. The payment state during
        checkout must come from the source, because a stale “unpaid” could charge a customer
        again. Stock for limited items, covered in the writes chapter, is checked inside the
        transaction that takes it. For these reads, being correct is the requirement, and a
        cache adds risk without adding anything the design needs.
      </p>
      <p>
        A cache is also not worth its cost when hit rates are low: data read once per user,
        such as a customer’s full order history beyond the first page, or keys so numerous and
        so rarely repeated that every read is a miss plus a cache write. And a cache is never
        the record of truth. If losing the cache would lose data, it is a database with weaker
        guarantees. We should revisit the menu design if the hit rate falls below about 90%,
        which would mean the invalidation or the key design is wrong, or if the database
        becomes able to serve menus directly at a cost the team prefers to the operational work
        of the cache.
      </p>
      <Callout>
        For each piece of cached data, write down what a customer or restaurant would do if
        they saw an old value. That answer sets its lifetime, its invalidation, and whether it
        belongs in a cache at all.
      </Callout>
      <p>
        The menu document is now cheap to serve from Mumbai. Each menu still comes with 25 dish
        photos, and the customer may be in Guwahati or Kochi, far from Mumbai. The next
        chapter, The edge: CDNs and static delivery, moves photos and public menus close to
        customers and sets the HTTP headers that decide what may be cached there.
      </p>
      <Notes
        items={[
          'A cache that answers 98% of 2,000 menu views a second turns 50 database cores of work into 1.',
          'Split cached data by how fast it changes and what a stale copy causes; Dabba caches the menu document for long and availability for 30 seconds.',
          'Cache-aside can write an old value back after an invalidation; versioned keys make that late write harmless, and a lifetime bounds any staleness left.',
          'Coalesce rebuilds per key, serve stale while refreshing, and jitter lifetimes, or a hot key’s expiry sends hundreds of identical queries to the database.',
          'Never let a cold cache push read load onto the primary that takes orders; rebuild from replicas with a concurrency limit.',
          'A customer must see her own order right after placing it; reads of recent writes need the primary or a cache filled by the write.',
        ]}
      />
    </>
  ),

  /* ── The edge: CDNs and static delivery ────────────────────────── */
  cdn: (
    <>
      <p>
        A customer in Guwahati opens a menu. The menu document is about 40 KB, or around 8 KB
        compressed, and the screen shows 25 dish photos at about 60 KB each, so the screen
        needs roughly 1.5 MB. Dabba’s servers are in Mumbai, about 2,000 km away in a
        straight line and further along the fibre routes. The menu cache from the last chapter
        made the server’s part fast. The distance and the bytes remain.
      </p>
      <p>
        A content delivery network, or CDN, keeps copies of responses in many locations close
        to customers, so most requests are answered nearby and never reach Mumbai. This
        chapter works out what that saves Dabba, how to name photos so they never need to be
        purged, which parts of the menu may be cached at the edge, and how one wrong rule can
        show a customer someone else’s orders.
      </p>

      <h3>What the edge changes in the arithmetic</h3>
      <p>
        A CDN runs servers in many cities, often called points of presence. The customer’s
        request is steered to a nearby one, either by DNS answering with a nearby address or by
        anycast, where every location announces the same address and internet routing delivers
        packets to the closest. If the edge has a fresh copy of the response, it answers. If
        not, it fetches from Dabba’s servers in Mumbai, which the CDN calls the origin, keeps
        a copy if the headers allow, and answers.
      </p>
      <p>
        Suppose the phone in Guwahati has a 35 ms round trip to a CDN location in Kolkata and
        a 90 ms round trip to Mumbai; both include the mobile network’s own delay. The first
        chapter showed that a cold connection costs three round trips before a request leaves
        (DNS, TCP, TLS). To Mumbai that is 270 ms; to the edge it is 105 ms. The saving of
        about 165 ms applies even to requests the edge cannot cache, such as placing an order,
        because the handshakes end at the edge and the edge forwards the request to Mumbai
        over a connection it already has open.
      </p>
      <p>
        For photos the saving is in bytes as well as time. The brief estimated 400 million
        image loads a day at about 60 KB, or 24 TB a day. If the edge answers 98% of them,
        Mumbai sends about 480 GB a day instead, and the busiest hour’s image traffic never
        touches Dabba’s servers. That is the main reason a food app with photos on every
        screen needs a CDN from its first large city.
      </p>

      <h3>How the customer is sent to a nearby edge, and when that goes wrong</h3>
      <p>
        The saving above assumes the phone in Guwahati actually reaches a nearby edge. With
        DNS-based steering, the CDN’s DNS server chooses which edge address to return, and it
        decides based on where the DNS question came from. But the question does not come
        from the phone. It comes from the resolver the phone uses, usually the mobile
        operator’s, and an operator may run its resolvers in a few large cities. If the
        resolver serving that customer sits in Delhi, the CDN sees a question from Delhi and
        returns a Delhi edge, and the customer’s round trip to “nearby” is longer than it
        should be.
      </p>
      <p>
        Two mechanisms reduce this. Some resolvers pass a shortened form of the client’s
        address along with the question (an extension called EDNS Client Subnet), so the CDN
        can answer for the client’s network rather than the resolver’s. And with anycast,
        where every edge announces the same address, the choice is made by internet routing
        from the phone’s own network, without depending on the resolver at all. Routing picks
        the path the networks prefer, which is usually but not always the nearest, so CDNs
        tune their announcements city by city.
      </p>
      <p>
        For Dabba the practical consequence is to measure from the customer’s side rather than
        trusting a map of edge locations. The app records, for a sample of requests, how long
        the connection setup and first response took and which edge answered (most CDNs add a
        response header naming it). Grouped by city and mobile operator, those numbers show
        where customers are being sent somewhere distant. A city where a large operator’s
        customers consistently land on an edge 1,500 km away is a conversation to have with
        the CDN provider, and it would never show up in server-side metrics, because from
        Mumbai every request looks the same.
      </p>

      <Predict q="A restaurant replaces a blurry biryani photo. The app loads it from /photos/item_9001.jpg, served with Cache-Control: max-age=86400 (one day). How long until every customer sees the new photo? Does purging the URL from the CDN fix it?">
        <p>
          Up to a day. Each CDN location that has the old photo may keep serving it until its
          copy is a day old. A purge removes those copies within seconds or minutes, but it
          cannot reach the phones: each app and browser that downloaded the old photo keeps it
          in its own cache for up to a day as well, and does not ask again.
        </p>
        <p>
          Shortening the lifetime to make updates faster means every phone re-downloads or
          re-checks every photo more often, which is exactly the traffic the CDN was meant to
          remove. The way out is to stop reusing the URL. If the new photo gets a new URL, the
          customer sees it as soon as her app receives a menu that points to it, and the old
          URL can stay cached forever because nothing will ask for it.
        </p>
      </Predict>

      <h3>Give every photo a URL that never changes meaning</h3>
      <p>
        When a restaurant uploads a dish photo, Dabba stores the original and produces a few
        variants: 200 pixels wide for list thumbnails, 480 for menu cards, 1080 for the full
        view, in WebP for apps that support it. Each variant’s URL contains a hash of the
        image content:
      </p>
      <pre><code>{`https://img.dabba.in/p/3f9a1c07e2/480.webp

Cache-Control: public, max-age=31536000, immutable`}</code></pre>
      <p>
        Because the URL is derived from the content, the bytes behind a URL never change.
        That makes the longest caching safe: a year at the edge and a year on the phone, and{' '}
        <code>immutable</code> tells browsers not to even check for a newer copy when the user
        reloads. When the restaurant replaces the photo, the new image gets a new hash and so a
        new URL, and the menu document is updated to point at it. The reads chapter already
        made that menu change propagate within a minute through its version number. No purge
        is involved.
      </p>
      <p>
        There is a quieter benefit. During the minute when some customers have the old menu
        and some the new, both URLs work. A customer with the old menu sees the old photo
        rather than a broken image. Designs that overwrite a file in place have a window where
        the old menu points at a URL whose bytes have changed or vanished.
      </p>
      <p>
        The costs are storage and housekeeping. Old variants stay in object storage after
        nothing references them, so a cleanup job deletes variants that no menu has referenced
        for 30 days. And the rule must be absolute: a URL is never reused for different bytes,
        because a cached copy of the old bytes may survive for a year somewhere.
      </p>
      <p>
        Image format needs one more decision. Browsers advertise the formats they accept in
        the <code>Accept</code> header, and a server could pick WebP or AVIF from it. But then
        the response depends on a request header, the CDN must store a separate copy per
        variation of that header (<code>Vary: Accept</code>), and real <code>Accept</code>{' '}
        headers vary in many small ways, which splits the cache into many partly-filled
        pieces. Dabba’s app knows which formats it supports, so it puts the format in the URL
        it requests (<code>480.webp</code>), and the website does the same with the HTML{' '}
        <code>&lt;picture&gt;</code> element. One URL, one set of bytes, one cache entry.
      </p>
      <p>
        Resizing turned out to matter as much as caching. A restaurant’s original upload is
        often a 2 MB phone photo. Sending that to a menu card 480 pixels wide on an inexpensive
        phone wastes the customer’s data and seconds of loading, wherever it is served from.
      </p>

      <h3>Can the menu itself live at the edge?</h3>
      <p>
        A response can be stored at the edge and served to others only if it is the same for
        everyone who asks for that URL. The public part of a menu (dishes, descriptions,
        prices, photo links) is the same for every customer, which is why the reads chapter
        kept personal offers out of it. So it can be cached at the edge.
      </p>
      <p>
        Dabba can borrow the photo trick here as well. The restaurant list for a zone already
        carries each restaurant’s <code>menu_version</code>, so the app requests{' '}
        <code>/v1/restaurants/48213/menu?v=17</code>. The bytes behind that URL never change,
        so it can be cached for a long time everywhere. When the restaurant edits its menu, the
        next restaurant list carries version 18 and the app asks for a new URL. Freshness of
        the menu is now decided by freshness of the restaurant list, which is cached for 30
        seconds.
      </p>
      <p>
        Availability, the sold-out markers and open or closed state, is also the same for
        everyone but changes during service, so it gets a short shared lifetime: the edge may
        keep it for 15 seconds, and phones must ask again each time. Personal offers and
        anything that depends on who the customer is are marked private and never stored in a
        shared cache.
      </p>
      <p>
        One detail ruins edge caching quietly: the cache key. The edge stores responses by URL,
        so anything that makes URLs unique makes every request a miss. If the app adds the
        customer’s exact latitude and longitude to the restaurant list URL, no two customers
        share an entry and the hit rate is close to zero. Dabba sends a delivery zone ID
        instead, of which there are a few thousand. Tracking parameters such as{' '}
        <code>utm_source</code>, added by marketing links, are stripped from the cache key at
        the edge for the same reason.
      </p>

      <h3>The night one customer saw another’s orders</h3>
      <p>
        Here is the failure that makes CDN configuration a security matter. It is reconstructed
        for Dabba, but incidents of this shape have happened to large companies; Steam’s store
        showed some users other users’ account pages in December 2015 after a caching
        configuration change made under the pressure of an attack.
      </p>
      <p>
        On a Saturday evening, Dabba’s API receives a flood of requests from a botnet. To
        relieve the origin, an engineer adds a CDN rule: cache every response under{' '}
        <code>/v1/</code> for 60 seconds. Load on Mumbai drops immediately. A few minutes
        later, support receives the first call: a customer opened her order history and saw
        someone else’s orders, with their name, address and phone number.
      </p>
      <p>
        The order history endpoint is <code>GET /v1/orders</code>. The URL is the same for
        every customer; the server knows whose orders to return from the login token in the{' '}
        <code>Authorization</code> header. The new rule told the edge to cache by URL. The
        first customer to request <code>/v1/orders</code> through a given edge location after
        the rule went live had her response stored, and every customer who asked that location
        for the same URL in the next 60 seconds received it. The same happened to profiles,
        saved addresses and the active order screen.
      </p>
      <p>
        The immediate fix is to remove the rule and purge everything cached under the path.
        The lasting fix has three parts. First, the origin marks every response that depends
        on the caller as <code>Cache-Control: private, no-store</code>, set by shared
        middleware for every authenticated route, so no individual endpoint can forget.
        Second, the CDN honours origin headers and only caches an explicit list of path
        prefixes (images, versioned menus, availability, zone lists); a new rule cannot
        override <code>private</code>. Third, a test in the build pipeline calls every route
        with a test account and fails if any authenticated response comes back cacheable, or if
        any response that sets a cookie is cacheable.
      </p>
      <p>
        The fix has a cost the team should say out loud: during the next attack, the edge
        cannot absorb load on personal endpoints by caching them. That load has to be handled
        by rate limits and by blocking abusive traffic at the edge, which the rate limiting and
        security chapters cover. Caching personal data was never a safe tool for that job.
      </p>

      <h3>Revalidation, stale copies and the origin shield</h3>
      <p>
        When a cached copy expires, the edge does not have to download the whole response
        again. If the origin sent an <code>ETag</code> (a version tag for the response), the
        edge asks “I have this tag; is it still current?” and the origin answers{' '}
        <code>304 Not Modified</code> with no body when it is. That saves bandwidth but not the
        round trip to Mumbai. <code>stale-while-revalidate</code> removes the wait: the edge
        may serve the expired copy for a stated time while it checks with the origin in the
        background. <code>stale-if-error</code> goes further: if the origin is failing, the
        edge may keep serving the expired copy for a stated time.
      </p>
      <p>
        That last directive changes what an origin outage means for Dabba. With{' '}
        <code>stale-if-error=600</code> on zone lists and availability, a ten-minute failure in
        Mumbai still lets customers open the app, browse restaurants and read menus with
        slightly old availability. They cannot place orders, because that path is never
        cached. Partial service is not full service, but browsing customers who can still see
        menus tend to come back and order when things recover.
      </p>
      <p>
        Distance between the edge and the origin creates one more problem. Dabba’s CDN has
        locations in perhaps thirty cities. When a popular menu version or a new zone list
        appears, each location misses separately and fetches from Mumbai, so one change causes
        thirty origin requests. Most CDNs offer a middle tier, usually called an origin shield
        or tiered cache: edge locations fetch from one designated regional cache, and only
        that cache fetches from the origin. Thirty misses become one. The same tier helps the
        long tail: a small restaurant in a small town is rarely requested at any single edge
        location, so its photos are often evicted there, but the regional tier still has them
        and the origin is spared.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Content</th><th>Origin sends</th><th>How a change reaches customers</th></tr>
          </thead>
          <tbody>
            <tr><td>Dish photo variants</td><td><code>public, max-age=31536000, immutable</code></td><td>new content, new URL, referenced by a new menu version</td></tr>
            <tr><td>Website scripts and styles</td><td><code>public, max-age=31536000, immutable</code></td><td>fingerprinted file names in new HTML</td></tr>
            <tr><td>Menu at a given version</td><td><code>public, max-age=31536000, immutable</code></td><td>the zone list points at the next version</td></tr>
            <tr><td>Restaurant list for a zone</td><td><code>public, max-age=0, s-maxage=30, stale-while-revalidate=60, stale-if-error=600</code></td><td>edge refreshes every 30 s</td></tr>
            <tr><td>Availability and open state</td><td><code>public, max-age=0, s-maxage=15, stale-if-error=600</code></td><td>edge refreshes every 15 s</td></tr>
            <tr><td>Orders, profile, offers, addresses</td><td><code>private, no-store</code></td><td>never stored outside the device</td></tr>
            <tr><td>Checkout and payment calls</td><td><code>no-store</code>; no cache rule matches the path</td><td>always reach the origin</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        <code>max-age</code> applies to every cache, including the phone, while{' '}
        <code>s-maxage</code> applies only to shared caches such as the CDN. Setting{' '}
        <code>max-age=0</code> with a short <code>s-maxage</code> lets the edge absorb load
        while making sure phones always ask for the current zone list, from the nearby edge.
      </p>

      <h3>Where the edge does not help</h3>
      <p>
        Live data that changes every few seconds per order, such as a rider’s position, gains
        nothing from caching; at best the edge carries the connection, which the realtime
        chapter discusses. The same applies to payment callbacks from the provider, which must
        reach Dabba exactly as sent. And if nearly all customers were in Mumbai, a short
        distance from the origin, the edge would save little time on uncacheable requests,
        though photos would still justify it on bandwidth alone.
      </p>
      <p>
        We should revisit the setup when the CDN bill outgrows what it saves in origin
        bandwidth and servers, when a second region arrives and the origin is no longer one
        place, or when the hit rate on photos drops, which usually means a new client is
        requesting sizes or formats outside the fixed set and creating near-duplicate entries.
      </p>
      <p>
        Photos now come from nearby, and the menu’s bytes rarely leave Mumbai. Behind the
        caches, though, every piece of data still needs a permanent home. The next chapter,
        Where the data actually lives, chooses stores for orders, menus, rider locations and
        photos, and opens the storage engines to see why each choice fits.
      </p>
      <Notes
        items={[
          'Ending TLS at a nearby edge saves round trips even for requests that cannot be cached, such as placing an order.',
          'Content-hashed URLs can be cached for a year everywhere and never need purging; a change is a new URL referenced by new data.',
          'A response may be cached at the edge only if it is the same for everyone who requests that URL; personal responses must say private, no-store.',
          'Cache keys must exclude anything that makes requests unique without changing the response, such as exact coordinates or tracking parameters.',
          'stale-if-error lets customers keep browsing during an origin outage, and an origin shield turns many edge misses into one origin fetch.',
          'A test that checks cache headers on every authenticated route is cheaper than the incident it prevents.',
        ]}
      />
    </>
  ),

  /* ── Where the data actually lives ─────────────────────────────── */
  storage: (
    <>
      <p>
        So far the database has been a box behind the cache. This chapter opens it, because
        Dabba has several kinds of data that behave very differently, and putting them all in
        one store is how a reasonable system ends up with an unreasonable outage. Orders
        involve money and must never be lost. Menus are read thousands of times a second and
        edited a few times a day. Rider locations arrive ten thousand times a second and are
        worthless after a minute. Photos are large files that are never edited.
      </p>
      <p>
        We will describe each kind of data by how it is used, look inside the two engine
        designs that most databases are built on, follow what happened when one kind of data
        was put in the wrong one, and end with a written decision for each data set that
        another engineer could challenge.
      </p>

      <h3>Describe each data set by how it is used</h3>
      <p>
        Database products are easier to choose once the data has been described in terms that
        do not mention any product: how big it is, how fast it is written, how it is read, and
        what a lost or wrong write costs.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Data</th><th>Size and growth</th><th>Writes at peak</th><th>How it is read</th><th>Cost of a lost write</th></tr>
          </thead>
          <tbody>
            <tr><td>Orders and order items</td><td>~2 GB a day, ~730 GB a year</td><td>~150 inserts and ~250 status changes a second</td><td>by order ID; a customer’s recent orders; a restaurant’s active orders</td><td>money and trust</td></tr>
            <tr><td>Restaurants and menus</td><td>~2 GB in total, slow growth</td><td>a few edits a second</td><td>whole menu by restaurant, almost always through a cache</td><td>an edit the owner has to repeat</td></tr>
            <tr><td>Rider latest location</td><td>50,000 rows, constant</td><td>10,000 overwrites a second</td><td>riders near a point; one rider’s position</td><td>almost none; a new one arrives in 5 s</td></tr>
            <tr><td>Rider location history</td><td>~86 GB a day (10,000 a second × ~100 bytes)</td><td>10,000 appends a second</td><td>one rider over a time range, for disputes and analysis</td><td>small; a gap in a trace</td></tr>
            <tr><td>Dish photos</td><td>millions of files, terabytes</td><td>uploads, rare</td><td>by URL, through the CDN</td><td>a restaurant re-uploads</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The table already separates the data into groups. Orders need transactions that cover
        several rows (the order, its items, the stock it takes, the idempotency key) and they
        need flexible queries, because support staff will ask questions nobody planned for.
        Rider locations need a very high rate of tiny writes with almost no durability
        requirement. Photos need cheap storage for large immutable blobs. These are three
        different shapes, and they will get three different homes.
      </p>

      <h3>Inside a B-tree database</h3>
      <p>
        Postgres and MySQL, like most relational databases, store tables and indexes in fixed
        size pages (8 KB in Postgres) and organise each index as a B-tree: a shallow, wide tree
        of pages in which each internal page points to hundreds of children. An index on an
        8-byte order ID fits roughly 400 entries in a page, so three levels address about
        400³ = 64 million rows and four levels about 25 billion. Dabba’s 365 million orders a
        year sit four levels deep, and the top levels are read so often that they are always
        in memory. Finding an order by ID costs at most one or two page reads from disk.
      </p>
      <p>
        Durability comes from the write-ahead log. Before a change is applied to the pages, it
        is appended to a log file and the log is flushed to disk; only then does the commit
        succeed. The pages themselves are written back later, in the background. If the
        machine crashes, the database replays the log on restart. Appending to a log is
        sequential and fast, which is why a single commit can take well under a millisecond on
        good disks, and why many commits can share one flush when they arrive together.
      </p>
      <p>
        Postgres adds one more behaviour that matters for Dabba. An update does not overwrite
        the row; it writes a new version of the row and leaves the old version for concurrent
        readers, to be cleaned up later by a background process called vacuum. Every index on
        the table normally needs a new entry pointing at the new version too. Postgres avoids
        that cost with a heap-only tuple (HOT) update when two conditions hold: no indexed
        column changed, and the new version fits on the same page as the old one. Then only
        the table page changes, not the indexes.
      </p>
      <p>
        Each Dabba order changes status about six times. If <code>status</code> is not part of
        any index and pages have some free space (set by the table’s fill factor, say 90% to
        leave a tenth of each page empty), most of those changes are HOT updates and cheap. If{' '}
        <code>status</code> is indexed, every change writes new entries into every index on the
        table. At about 250 status changes a second, Postgres handles either case. At forty
        times that rate it would not, which is what the next section is about.
      </p>
      <Fig caption="Fig 1 · Two engine designs. A B-tree updates pages in place behind a log; an LSM tree appends and merges later">
        <BTreeVsLsm />
      </Fig>

      <h3>Inside an LSM engine</h3>
      <p>
        The other common design, the log-structured merge tree, never modifies data in place.
        RocksDB, Cassandra, ScyllaDB and many time-series stores use it. A write goes to the
        log for durability and into a sorted structure in memory called the memtable. When the
        memtable fills, it is written to disk as an immutable sorted file. Over time there are
        many such files, so a background process called compaction merges them into fewer,
        larger ones, discarding overwritten and deleted values along the way.
      </p>
      <p>
        Writes are fast because they are always sequential: append to the log, insert into
        memory, and later write whole sorted files. Reads pay for it. A key might be in the
        memtable or in any of several files, newest first, so each file carries a Bloom filter,
        a compact structure that can say “this key is definitely not in this file” and so
        skip most of them. Compaction pays too: each byte may be rewritten many times as files
        are merged into larger ones (with leveled compaction, ten or more times over its life
        is common), which costs disk bandwidth that the foreground workload does not see
        directly until compaction falls behind.
      </p>
      <p>
        The two designs make opposite bets. A B-tree spends effort at write time to keep data
        in one sorted place, so reads are predictable. An LSM tree defers that effort to
        background merging, so writes are cheap and reads may look in several places. For a
        workload of many small appends, such as 10,000 location points a second keyed by rider
        and time, the LSM bet fits. For a workload of transactions that read and update a few
        related rows, such as placing an order, the B-tree bet fits, along with everything a
        relational database offers on top.
      </p>

      <h3>The week rider locations lived in the orders database</h3>
      <p>
        Here is how the wrong choice plays out. It is a common path, because the first version
        of a feature tends to go wherever the existing database is.
      </p>
      <p>
        Dabba’s first rider app sends a location every 5 seconds, and the team stores it in a{' '}
        <code>rider_locations</code> table in the main Postgres database, one row per rider,
        updated in place, with a spatial index on the location so dispatch can find riders
        near a restaurant. At launch there are 2,000 riders online, 400 updates a second, and
        nothing is wrong.
      </p>
      <p>
        By the dinner peak a year later there are 50,000 riders online and 10,000 updates a
        second. Every update changes the indexed location column, so none of them is a HOT
        update: each writes a new row version and a new entry in the spatial index. The table
        has 50,000 live rows, but it accumulates 10,000 dead row versions a second, about 36
        million an hour. Vacuum, with settings tuned for the orders table, falls behind. The
        spatial index fills with entries for dead versions, so the “riders near this
        restaurant” query, which dispatch runs for every order, reads far more pages than it
        should and slows from a few milliseconds to hundreds.
      </p>
      <p>
        The damage spreads beyond dispatch. All those updates go through the write-ahead log,
        which also feeds the read replicas. Replicas apply the log in a single process, and
        during the peak they begin to fall behind. The reads chapter sent menu rebuilds to
        replicas, so restaurant owners now see their edits appear minutes late. Order
        placement shares the primary’s disk and log with the location updates, and its p99
        rises. A feature whose individual writes are nearly worthless is now degrading the
        writes that carry money.
      </p>
      <p>
        The fix moves each part of the location data to a store shaped like it. The latest
        position of each rider goes into Redis, which keeps data in memory, overwrites a value
        in place without leaving old versions behind, and has commands for indexing points and
        searching by radius. 10,000 small writes a second is a light load for it. The history
        goes onto an append-only stream and from there into a store built for time-ordered
        appends; the streams and geo chapters later in the course build both properly.
      </p>
      <p>
        The fix has costs worth writing down. If the Redis node restarts, Dabba has no rider
        positions for about 5 seconds until the next updates arrive, and dispatch must cope
        with that. Assigning a rider can no longer happen in the same transaction as reading
        the rider’s location, so dispatch must tolerate a position that is a few seconds old.
        And the team now operates one more system. Each of these is a better trade than having
        location updates degrade order placement.
      </p>

      <Predict q="Orders grow by about 2 GB a day. Counting indexes, how long until the orders database outgrows one Postgres primary, and is storage really the first limit Dabba will hit?">
        <p>
          With indexes, roughly double the raw size: about 1.5 TB a year. Servers with several
          terabytes of fast local or attached storage are ordinary, so storage alone allows
          several years. Writes are also within reach: about 150 inserts and 250 status
          changes a second at peak is a modest load for one primary.
        </p>
        <p>
          A less visible limit arrives first: recovery time. If the database must be restored
          from backup, say after an operator error that the standby faithfully copied, then
          restoring 5 TB at about 500 MB a second takes (5 × 10¹²) / (5 × 10⁸) = 10,000 seconds,
          close to three hours, before replaying the log since the backup. If Dabba’s target
          is to recover within an hour, it is breached long before the disk is full. That is
          an argument for partitioning orders by month, so that old months can be moved to
          cheaper storage and the live database stays small, well before anyone talks about
          sharding.
        </p>
      </Predict>

      <h3>Indexes for the queries Dabba actually runs</h3>
      <p>
        An index is a second sorted copy of some columns, pointing back at the rows. It makes
        the queries that match its order fast, and it makes every insert, and every update that
        touches its columns, do one more write. So indexes should be chosen from the queries,
        one at a time. Dabba’s order database has three main ones.
      </p>
      <p>
        Finding an order by ID uses the primary key. Showing a customer’s recent orders runs
        this query:
      </p>
      <pre><code>{`SELECT order_id, restaurant_name, total_paise, status, created_at
FROM orders
WHERE customer_id = $1
ORDER BY created_at DESC
LIMIT 20;

CREATE INDEX orders_by_customer ON orders (customer_id, created_at DESC);`}</code></pre>
      <p>
        Column order in that index matters. Sorted by customer first and then by time, the
        index holds each customer’s orders together and already in time order, so the database
        reads the first 20 entries for that customer and stops. An index on{' '}
        <code>(created_at, customer_id)</code> holds the same columns in an order that does not
        help: one customer’s orders are scattered across the whole time range. The query plan,
        shown by <code>EXPLAIN</code>, confirms which happened; an “Index Scan using
        orders_by_customer” with no separate sort step is what we want to see.
      </p>
      <p>
        The restaurant tablet asks for that restaurant’s active orders every few seconds. Out
        of hundreds of millions of orders only about 88,000 are active at peak, so a partial
        index that covers only active orders stays small and stays in memory:
      </p>
      <pre><code>{`CREATE INDEX active_by_restaurant ON orders (restaurant_id, created_at)
  WHERE status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY');`}</code></pre>
      <p>
        This index has a cost we met above: <code>status</code> now appears in an index
        definition, so status changes are no longer HOT updates. At 250 changes a second,
        Dabba accepts that. What it does not do is index <code>status</code> on its own: with
        a handful of possible values and most rows “delivered”, such an index would rarely be
        cheaper than reading the table, and the query planner would rightly ignore it while
        every write still paid for it.
      </p>
      <p>
        Each index makes every insert into <code>orders</code> do one more B-tree insert. With
        a primary key and the two indexes above, an order insert touches three trees. A team
        that adds an index for every report someone asks for will find, a year later, that
        order inserts touch ten. Reports belong in the analytics store; the order database
        keeps the indexes that live features need.
      </p>

      <h3>The decisions, written down</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Data</th><th>Store</th><th>Why it fits</th><th>What we give up</th></tr>
          </thead>
          <tbody>
            <tr><td>Orders, payments state, idempotency keys</td><td>Postgres, a synchronous standby in another zone, asynchronous read replicas</td><td>transactions across several rows; flexible queries for support; mature tooling</td><td>one primary’s write capacity; growth by bigger machines until sharding</td></tr>
            <tr><td>Restaurants and menus</td><td>Postgres (a separate database), cached in Redis and at the CDN</td><td>relational structure; edits are small transactions; reads go to caches</td><td>a cache layer to operate and keep correct</td></tr>
            <tr><td>Rider latest location</td><td>Redis with a geospatial index</td><td>in-place overwrites in memory; radius search</td><td>a few seconds of blindness after a restart; no transactions with orders</td></tr>
            <tr><td>Rider location history</td><td>append-only stream into an LSM-based or time-series store</td><td>sequential appends; reads by rider and time range</td><td>updates and deletes are awkward; compaction to watch</td></tr>
            <tr><td>Dish photos</td><td>object storage behind the CDN, metadata in Postgres</td><td>cheap, durable storage for large immutable files</td><td>no queries over contents</td></tr>
            <tr><td>Analytics: payouts, demand, reports</td><td>column store fed from the others</td><td>scans a few columns across millions of rows quickly</td><td>not suitable for live lookups</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The first row deserves one sentence in full: we store orders in Postgres because
        placing an order must change several rows atomically and support needs queries we
        cannot predict; we accept a single primary’s write capacity; and we will revisit when
        the write rate approaches what one primary sustains at peak, or when orders must be
        written in more than one region.
      </p>
      <p>
        The synchronous standby is part of that decision. With it, a commit waits until the
        standby in another zone has the log record as well, which adds roughly a millisecond
        inside a region. In exchange, if the primary’s machine or zone fails, no committed
        order is lost when the standby takes over. For orders that millisecond is cheap. For
        rider locations it would be pointless, which is one more reason they live elsewhere.
      </p>

      <h3>When to reach past Postgres</h3>
      <p>
        A common mistake runs in the other direction: choosing a distributed key-value store
        for orders on day one because it scales. At 150 orders a second it buys capacity Dabba
        does not need and costs things it does: multi-row transactions, ad hoc queries for
        support, and joins for the restaurant’s daily statement. A store like that becomes the
        right choice when write rates exceed what a single primary can sustain after
        reasonable vertical growth, when data must be written in several regions at once, or
        when the access patterns are few, stable and known. None of these holds for Dabba’s
        orders yet. The sharding chapter picks up the moment one of them does.
      </p>
      <p>
        We should revisit these choices when a data set’s row in the first table changes: a
        tenfold rise in order volume, a new requirement to keep rider traces for years, or a
        feature that reads menus in a new way, such as searching dishes across all restaurants,
        which no B-tree index on the menu tables will serve well (the derived data chapter
        builds a search index for it).
      </p>
      <p>
        We now know where orders and menus live. We have not yet decided their shape: which
        tables, which columns, and which facts an order copies rather than references. The
        next chapter, Data modelling across paradigms, designs that shape, and shows why an
        order from last month must not change when the restaurant changes its prices.
      </p>
      <Notes
        items={[
          'Describe each data set by size, write rate, read pattern and the cost of a lost write before naming any product.',
          'A B-tree keeps data sorted in place behind a write-ahead log; an LSM tree appends and merges later, trading read and compaction work for cheap writes.',
          'In Postgres an update writes a new row version; it skips index writes only if no indexed column changed and the page has room.',
          'High-rate, low-value writes in the transactional database can slow every other write through dead versions, index bloat, log volume and replica lag.',
          'Choose indexes from the queries; column order decides whether an index serves a query, and every index taxes every insert.',
          'Recovery time can limit a single database long before storage does; partition old data away before talking about sharding.',
        ]}
      />
    </>
  ),

  /* ── Data modelling across paradigms ───────────────────────────── */
  modeling: (
    <>
      <p>
        A customer opens an order from last month to claim a refund for a missing dish. The
        screen says “Paneer tikka × 2, ₹480”. Since then the restaurant has raised the price to
        ₹280. If the order only points at the menu item and looks its price up when displayed,
        the screen now says ₹560, the refund is computed on a price she never paid, and the tax
        invoice no longer matches the payment. Nothing was written to the order, and its
        history changed anyway.
      </p>
      <p>
        Data modelling decides which facts are stored where, which are copied and frozen, and
        which are referenced and allowed to change. This chapter models Dabba’s restaurants,
        menus and orders in a relational database, works through a slow screen caused by the
        model, and then models the same data for a key-value store to see what that gains and
        what it costs.
      </p>

      <h3>Write the queries before the tables</h3>
      <p>
        A model is good or bad relative to the questions asked of it. So the first step is to
        list them, with the rate at which each is asked and how correct the answer must be.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Question</th><th>Asked by</th><th>Rate at peak</th><th>Needs</th></tr>
          </thead>
          <tbody>
            <tr><td>The full menu of restaurant R</td><td>menu cache rebuilds</td><td>~40 a second</td><td>consistent within one menu</td></tr>
            <tr><td>Place an order</td><td>customers</td><td>~150 a second</td><td>atomic; correct prices and stock</td></tr>
            <tr><td>Order O with items and status</td><td>tracking screen, support</td><td>thousands a second, mostly cached</td><td>the customer’s own writes visible</td></tr>
            <tr><td>Customer C’s recent orders</td><td>order history screen</td><td>tens a second</td><td>stable paging</td></tr>
            <tr><td>Restaurant R’s active orders</td><td>kitchen tablets polling every 10 s</td><td>~2,000 a second (20,000 open restaurants)</td><td>fresh within seconds</td></tr>
            <tr><td>Restaurant R’s statement for a day</td><td>nightly payout job</td><td>once per restaurant per day</td><td>exact to the paisa</td></tr>
            <tr><td>Who ordered dish D from R last week?</td><td>support, food safety</td><td>rare, unplanned</td><td>complete</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The last row is the kind of question that decides between paradigms later in the
        chapter. Nobody plans for it. It arrives the day a restaurant reports a bad batch of
        chicken and Dabba must contact everyone who ate it.
      </p>

      <h3>Restaurants and menus: normalised, because they are edited</h3>
      <p>
        Menus have a structure that is easy to get wrong. A restaurant has categories
        (starters, biryanis, breads), and each category has items. Items have option groups,
        such as “Spice level”, choose exactly one, or “Add-ons”, choose up to three, and each
        group has options with their own prices. The same group is often shared: “Choice of
        bread” applies to every curry on the menu.
      </p>
      <pre><code>{`CREATE TABLE restaurants (
  restaurant_id  bigint PRIMARY KEY,
  name           text   NOT NULL,
  zone_id        int    NOT NULL,
  menu_version   int    NOT NULL DEFAULT 1
);
CREATE TABLE menu_items (
  item_id        bigint PRIMARY KEY,
  restaurant_id  bigint NOT NULL REFERENCES restaurants,
  category_id    bigint NOT NULL,
  name           text   NOT NULL,
  price_paise    int    NOT NULL CHECK (price_paise >= 0),
  photo_url      text,
  is_veg         boolean NOT NULL
);
CREATE TABLE option_groups (
  group_id       bigint PRIMARY KEY,
  restaurant_id  bigint NOT NULL REFERENCES restaurants,
  name           text   NOT NULL,          -- 'Choice of bread'
  min_choices    int    NOT NULL,
  max_choices    int    NOT NULL
);
CREATE TABLE options (
  option_id      bigint PRIMARY KEY,
  group_id       bigint NOT NULL REFERENCES option_groups,
  name           text   NOT NULL,          -- 'Butter naan'
  price_paise    int    NOT NULL
);
CREATE TABLE item_option_groups (           -- which groups apply to which items
  item_id        bigint REFERENCES menu_items,
  group_id       bigint REFERENCES option_groups,
  PRIMARY KEY (item_id, group_id)
);`}</code></pre>
      <p>
        Each fact lives in one row. When the restaurant changes the price of butter naan, one
        row changes and every curry that offers it is correct. If the naan price were copied
        into each curry’s row, an edit would have to find and update every copy, and a missed
        copy would show two prices for the same naan.
      </p>
      <p>
        Normalisation usually raises a worry about reads: building a menu now joins five
        tables. For Dabba that cost is paid only on a cache miss, about 40 times a second. The
        cached menu document from the reads chapter is the denormalised form, built from these
        tables whenever the version changes. The tables stay shaped for correct edits; the
        cache is shaped for fast reads. Keeping the two roles apart is what lets each be
        simple.
      </p>

      <h3>Orders record what was agreed</h3>
      <p>
        An order is different in kind. It is a record of an agreement at a moment: these
        dishes, with these options, at these prices, to this address, for this total. Those
        facts must not change when the menu or the customer’s profile changes later. So the
        order copies them.
      </p>
      <pre><code>{`CREATE TABLE orders (
  order_id          bigint      PRIMARY KEY,
  customer_id       bigint      NOT NULL,
  restaurant_id     bigint      NOT NULL,
  restaurant_name   text        NOT NULL,   -- as it was when ordered
  delivery_address  jsonb       NOT NULL,   -- full snapshot, not an address_id
  status            text        NOT NULL,
  items_paise       int         NOT NULL,
  delivery_paise    int         NOT NULL,
  packaging_paise   int         NOT NULL,
  discount_paise    int         NOT NULL,
  tax_paise         int         NOT NULL,
  total_paise       int         NOT NULL,
  business_date     date        NOT NULL,
  created_at        timestamptz NOT NULL
);
CREATE TABLE order_items (
  order_id          bigint REFERENCES orders,
  line_no           int,
  item_id           bigint NOT NULL,         -- reference, for analytics
  item_name         text   NOT NULL,         -- copy, for display and invoices
  unit_price_paise  int    NOT NULL,         -- the price agreed
  quantity          int    NOT NULL CHECK (quantity > 0),
  options           jsonb  NOT NULL,         -- [{name, price_paise}], as chosen
  photo_url         text,
  PRIMARY KEY (order_id, line_no)
);`}</code></pre>
      <p>
        These copies are a different kind of denormalisation from the one database courses
        warn about. A copy made to save a join, such as storing a restaurant’s current rating
        on every order row so the history screen need not look it up, is a cache inside the
        database: when the rating changes, every copy is wrong until something updates it.
        The agreed price is a separate fact that happens to equal the menu price at one
        moment. When the menu price changes, the agreed price is still right, so the copy
        never needs updating. Keeping <code>item_id</code> as well lets analytics connect the
        order back to the menu without letting the menu rewrite the order.
      </p>
      <p>
        The photo URL is safe to copy for a reason from the CDN chapter: photo URLs are
        content-hashed, so the URL will always mean the same image. Had Dabba reused photo URLs
        when restaurants replaced images, the copied URL would show whatever image the
        restaurant uploaded later.
      </p>

      <Predict q="A customer edits her saved “Home” address while her order is out for delivery. Suppose orders stored only an address_id pointing at her saved addresses. What happens?">
        <p>
          The rider app loads the address through the ID and now shows the new one. Depending
          on when it refreshes, the rider is redirected mid-trip to a place the customer never
          intended for this order, perhaps across town. If the rider was already there, the
          delivery record now claims the food went somewhere it did not, and a later dispute is
          judged against the wrong address.
        </p>
        <p>
          The order should hold a snapshot of the address as it was when the order was
          placed. If the product wants customers to change the destination of a live order,
          that becomes an explicit operation with its own rules (perhaps allowed only before
          pickup, and only within the same delivery zone), recorded as an event on the order.
          It should not happen as a side effect of editing a profile.
        </p>
      </Predict>

      <h3>Money, state and time in the order row</h3>
      <p>
        Three details in that table repay attention. The first is money. Every amount is an
        integer number of paise, and the order stores each component (items, delivery,
        packaging, discount, tax) as well as the total. Recomputing tax later from the items
        would use whatever tax rules apply on the day of recomputation, not the day of the
        order. Rules change; a stored invoice must not.
      </p>
      <p>
        The second is state. The <code>status</code> column holds the current state, which is
        what the tablet and the tracking screen query. On its own, though, it forgets how the
        order got there: when the restaurant accepted, how long the food sat at the pass, which
        rider dropped the order before another took it. Support needs those facts to settle
        disputes, and operations needs them to measure kitchen and delivery times. So every
        change of state also appends a row to an <code>order_events</code> table: order ID,
        sequence number, old and new state, who made the change, and when. The current state
        is kept for fast queries; the events are kept for history. Writing both in the same
        transaction keeps them consistent, and the writes chapter uses the same idea to
        publish events to other services reliably.
      </p>
      <p>
        The third is time. Timestamps are stored as <code>timestamptz</code>, an absolute
        instant, and converted to Indian Standard Time only for display. But restaurants need
        something else too: a business day. A restaurant that closes at 1 am wants orders from
        12:30 am on its statement for the previous evening, not split across two days. Dabba
        computes <code>business_date</code> once, when the order is placed, using a cut-off
        of 4 am IST, and stores it. Computing it later in reports from the timestamp would
        work until someone changed the cut-off and quietly moved last year’s orders between
        statements.
      </p>

      <h3>The order history screen that made 141 queries</h3>
      <p>
        The model can be right and the code that reads it still wrong. Here is a version of
        the order history screen that an object-relational mapper makes easy to write. It loads
        the customer’s 20 most recent orders. For each order, it reads <code>order.items</code>,
        which the mapper loads lazily with one query per order. For each item it reads{' '}
        <code>item.menuItem.name</code> and <code>item.menuItem.photo</code> to display the
        dish, one query per item. And for each order it reads <code>order.restaurant.name</code>,
        one more query per order.
      </p>
      <p>
        With five items per order on average, the screen issues 1 + 20 + 100 + 20 = 141
        queries. On a developer’s laptop with two test orders it issues 7 and feels instant.
        In production, each query is a round trip of about a millisecond inside the region
        plus its execution time, and the queries run one after another, so the screen takes
        well over 150 ms of database time and holds a connection from the pool the whole time.
        At tens of history screens a second, that is thousands of queries a second for a
        screen that should cost two. Worse, the screen shows today’s menu names, prices and
        photos for old orders, which is the bug from the opening of this chapter.
      </p>
      <p>
        This pattern is known as the N+1 query problem: one query for a list, then one query
        per element. The fix has two parts. The snapshot columns mean the screen no longer
        needs the menu or restaurant tables at all. And the items for all 20 orders are fetched
        in one query, <code>WHERE order_id = ANY($1)</code>, and grouped in code. The screen
        now makes two queries. Most mappers can do this with an explicit “load these relations
        eagerly” option. The habit that prevents the problem is to count queries per request in
        tests and logs, so a change from 2 to 141 is noticed in review rather than at peak.
      </p>

      <h3>The same data in a key-value store</h3>
      <p>
        A key-value or document store such as DynamoDB or Cassandra reads data by key, very
        quickly and at very large scale, and does not join. Modelling for it runs in the
        opposite direction from relational modelling. Instead of storing facts once and
        combining them at query time, we decide the questions first and arrange the data so
        each question is a single read of one key or one range of keys.
      </p>
      <p>
        For Dabba’s orders in a DynamoDB-style table with a partition key and a sort key, that
        might look like this. The order, its items and its events share the partition key{' '}
        <code>ORDER#9001</code>, with sort keys <code>META</code>, <code>ITEM#1</code>,{' '}
        <code>ITEM#2</code>, <code>EVENT#0001</code>, so one read returns the whole order. A
        copy of each order’s summary is written under <code>CUST#77</code> with sort key{' '}
        <code>ORDER#2026-10-16T20:31:05#9001</code>, so a customer’s recent orders are one
        range read in time order. For the tablet, active orders carry an extra attribute{' '}
        <code>REST#48213#ACTIVE</code> that a secondary index is built on; the attribute is
        removed on delivery, so the index holds only active orders.
      </p>
      <p>
        Notice what this model asks of the application. The customer’s summary copy under{' '}
        <code>CUST#77</code> is a second write for every order and every status change, and the
        application is responsible for making the copies agree. If the order write succeeds
        and the summary write fails, the order exists but is missing from the customer’s
        history. Stores of this kind offer transactions with limits (DynamoDB’s cover a bounded
        number of items, at extra cost per write), or the copy is made asynchronously from a
        change stream, in which case the history screen may lag the order by a second or two.
        In Postgres the history query reads the one order row through an index, so there is
        no copy to keep in step.
      </p>
      <p>
        Each of the first five questions in the table is now one read, and the store can grow
        across many machines without the application changing. Then the food safety question
        arrives: who ordered the chicken biryani from restaurant 48213 between Monday and
        Wednesday? No key answers it. The options are to scan the whole table, which at
        hundreds of millions of items is slow and expensive, or to add a new index and backfill
        it, which takes hours or days. In Postgres the same question is one query:
      </p>
      <pre><code>{`SELECT DISTINCT o.customer_id
FROM orders o JOIN order_items i USING (order_id)
WHERE o.restaurant_id = 48213
  AND i.item_id = 9001
  AND o.created_at >= '2026-10-12' AND o.created_at < '2026-10-15';`}</code></pre>
      <p>
        It might take a few seconds without a perfect index, and that is fine for a question
        asked twice a year.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Need</th><th>Relational model</th><th>Key-value model</th></tr>
          </thead>
          <tbody>
            <tr><td>Known, frequent questions</td><td>fast with the right indexes</td><td>one read each, by design</td></tr>
            <tr><td>A new question nobody planned</td><td>a new query, maybe a new index</td><td>a new index plus a backfill, or a scan</td></tr>
            <tr><td>Changing several rows together</td><td>a transaction</td><td>limited transactions, often within one partition</td></tr>
            <tr><td>Growing past one machine’s writes</td><td>hard; sharding is a project</td><td>built in</td></tr>
            <tr><td>Keeping copies consistent</td><td>rarely needed</td><td>the application writes every copy</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        For Dabba’s orders and menus, the questions are still changing and the write rate is
        modest, so the relational model’s flexibility is worth more than the key-value model’s
        scale. The key-value shape fits data with one or two fixed questions and high volume,
        such as rider positions and session data, and that is where Dabba uses it.
      </p>

      <h3>Changing the schema while orders keep arriving</h3>
      <p>
        Models change. Dabba starts charging for packaging and needs a{' '}
        <code>packaging_paise</code> column on a table that receives 150 inserts a second.
        Adding a column with a constant default is quick in modern Postgres (since version 11
        it only updates the table’s metadata), but the change still needs a brief exclusive
        lock on the table. If a long report query is running on the primary, the{' '}
        <code>ALTER TABLE</code> waits for it, and every order insert queues behind the waiting{' '}
        <code>ALTER</code>. A change that takes milliseconds can stop order placement for as
        long as the report runs. Setting a short <code>lock_timeout</code> on migrations, and
        retrying, turns that outage into a failed migration that tries again a minute later.
      </p>
      <p>
        Larger changes go in steps, because during a rolling deploy old and new versions of
        the code run at the same time against the same tables. Renaming a column, for example,
        becomes: add the new column; deploy code that writes both; backfill old rows in small
        batches (ten thousand rows at a time, so no single transaction locks much); deploy code
        that reads the new column; stop writing the old one; and finally drop it. Indexes on
        large live tables are built with <code>CREATE INDEX CONCURRENTLY</code>, which takes
        longer but does not block writes. The delivery chapter returns to this pattern,
        usually called expand and contract.
      </p>

      <h3>When not to copy</h3>
      <p>
        Snapshots are right for facts that describe the agreement. They are wrong for facts
        that must always be current. The restaurant’s phone number, which support uses to call
        the kitchen about a late order, must be the current one, so the order references the
        restaurant for it. The same goes for anything used to make a decision now, such as
        whether the restaurant is open, or whether a rider is still active.
      </p>
      <p>
        We should revisit the model when a new question cannot be answered from it, such as
        analysts wanting to know how a menu looked on a past date (which calls for menu
        versions kept as history rather than overwritten), or when order volume grows to the
        point where the relational flexibility costs more than it returns. That last change is
        usually a sharding decision, made in the sharding chapter, and it is easier when the
        model already treats each order as a self-contained record, as this one does.
      </p>
      <p>
        The tables are designed. The next chapter, Getting writes right, follows the moment an
        order is written into them: forty customers trying to buy the last twelve portions of
        a dish at once, and a payment provider that confirms payments on its own schedule.
      </p>
      <Notes
        items={[
          'List the questions, their rates and how correct each answer must be before designing tables.',
          'Normalise data that is edited, and serve reads from a denormalised cached copy built from it.',
          'An order snapshots what was agreed (names, prices, options, address, tax) because those facts must not change when the menu or profile does.',
          'Store each money component and a business date at placement; recomputing them later applies today’s rules to yesterday’s orders.',
          'The N+1 pattern turns a two-query screen into a hundred; batch related reads and count queries per request.',
          'Key-value models answer planned questions in one read and struggle with unplanned ones; choose them when the questions are few and stable.',
        ]}
      />
    </>
  ),

  /* ── Getting writes right ──────────────────────────────────────── */
  writes: (
    <>
      <p>
        At 8:02 pm on Diwali, a cloud kitchen in Gurugram has 12 portions left of a limited
        festival thali. Dabba has just featured it on the home screen, and 40 customers tap
        Place order within the same second. Each request, run on its own, is correct: check
        that portions remain, create the order, take a portion. Run together, they can sell
        far more than 12 thalis. Reads that are a little stale cost a confusing screen. Writes
        that interleave badly cost money, food and trust.
      </p>
      <p>
        This chapter builds the write path for placing an order. We will state what must stay
        true, see what the database promises when many transactions run at once and where
        those promises stop, choose the smallest mechanism that protects each rule, and then
        deal with the part no database transaction can cover: a payment provider that confirms
        payments in its own time.
      </p>

      <h3>What placing an order must leave true</h3>
      <p>
        Before choosing mechanisms, we write down the rules, because each rule will get its
        own enforcement and some rules are easy to forget until they break.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Rule</th><th>What breaking it looks like</th><th>Enforced by</th></tr>
          </thead>
          <tbody>
            <tr><td>One order per checkout attempt</td><td>two identical tickets in the kitchen, two charges</td><td>idempotency key with a unique constraint (API chapter)</td></tr>
            <tr><td>Limited stock never goes below zero</td><td>15 thalis sold, 12 cooked, 3 refunds and angry customers</td><td>a conditional update in the order transaction</td></tr>
            <tr><td>A once-per-customer coupon is used once</td><td>WELCOME100 redeemed twice from two phones</td><td>a unique constraint on the redemption</td></tr>
            <tr><td>No paid order is lost; no unpaid order is cooked</td><td>money taken with no food, or food sent without payment</td><td>order states plus webhook handling and reconciliation</td></tr>
            <tr><td>Every paid order reaches the restaurant exactly once in effect</td><td>a paid order that never appears on the tablet</td><td>an outbox written in the same transaction, and consumers that ignore duplicates</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>What the database promises when forty transactions run at once</h3>
      <p>
        A transaction groups several reads and writes so that they commit together or not at
        all. Atomicity and durability are the easy promises to understand: either every row
        in the order is written or none is, and once the commit returns, a crash will not undo
        it. The promise that decides whether the thali oversells is isolation: what one
        transaction can see of others that are running at the same time.
      </p>
      <p>
        Postgres, like most databases, does not isolate transactions completely by default.
        Its default level, read committed, gives each statement a view of all data committed
        before that statement began. That rules out reading another transaction’s uncommitted
        changes. It does not stop two transactions from reading the same value, each making a
        decision from it, and each writing a result that ignores the other’s.
      </p>

      <Predict q="The order code runs, under Postgres’s default isolation: SELECT remaining FROM limited_stock WHERE item_id = 9001; then, if remaining ≥ 1, it computes remaining − 1 in the application and runs UPDATE limited_stock SET remaining = <that value>. Twelve portions remain and forty requests arrive together. How many thalis are sold, and what does the counter say afterwards?">
        <p>
          Possibly all forty, with the counter saying something like 11. Many transactions run
          the <code>SELECT</code> at nearly the same moment and all see 12. Each concludes a
          portion is available, creates its order, and writes 11. The updates queue behind each
          other’s row locks, but each one writes the value its own code computed from the old
          read, so they all write 11. Every order commits.
        </p>
        <p>
          This is called a lost update: each transaction’s change overwrote the others’
          instead of adding to them. Nothing failed, no error was logged, and the kitchen
          discovers the problem when it runs out of thalis with 28 paid orders still to cook.
        </p>
      </Predict>

      <p>
        The fix for this case is small. Instead of reading the value into the application and
        writing back a computed number, the application asks the database to make the change
        only if the rule still holds:
      </p>
      <pre><code>{`UPDATE limited_stock
SET remaining = remaining - $2
WHERE item_id = $1 AND remaining >= $2;
-- 1 row updated: the portions are ours
-- 0 rows updated: sold out; roll back and return ITEM_UNAVAILABLE`}</code></pre>
      <p>
        This works under read committed because of how Postgres handles an update that meets a
        row another transaction has just changed. The second transaction waits for the first
        to commit, then re-checks its <code>WHERE</code> clause against the new version of the
        row. The twelfth order sees <code>remaining = 1</code> and succeeds; the thirteenth
        waits, re-checks, sees 0 and updates nothing. The check and the change happen as one
        step on the row, so there is no gap for another transaction to slip into. Adding{' '}
        <code>CHECK (remaining &gt;= 0)</code> to the table is a cheap second line of defence
        in case some other code path forgets the condition.
      </p>
      <p>
        Order state changes use the same shape. A restaurant tapping Accept and a customer
        tapping Cancel at the same moment both run conditional updates:{' '}
        <code>{`SET status = 'ACCEPTED' WHERE order_id = $1 AND status = 'PLACED'`}</code>, and the
        cancel with its own condition. Exactly one finds the order still in{' '}
        <code>PLACED</code>; the other updates no rows and tells its user the order has moved
        on.
      </p>

      <h3>The coupon that was used twice</h3>
      <p>
        Stronger isolation levels exist, and it is tempting to think they make every rule
        safe. Postgres’s repeatable read gives each transaction one consistent snapshot for its
        whole life, and if two transactions update the same row, the second fails with a
        serialization error that the code retries. That would also have stopped the thali
        oversell. But some rules are not about one row.
      </p>
      <p>
        Dabba’s welcome coupon may be used once per customer. The order code checks{' '}
        <code>{`SELECT count(*) FROM coupon_redemptions WHERE customer_id = $1 AND code = 'WELCOME100'`}</code>,
        and if the count is zero, inserts a redemption with the order. A customer places two
        orders at once, one from her phone and one from the website. Both transactions take
        their snapshots, both count zero redemptions, both insert a new row and both commit.
        They wrote different rows, so even repeatable read sees no conflict. The rule depended
        on a row being absent, and no snapshot protects the absence of a row. This pattern,
        where two transactions each read something, then each write something the other read
        depended on, is called write skew.
      </p>
      <p>
        Postgres’s serializable level would catch it, by tracking what each transaction read
        and aborting one of a dangerous pair. Here there is a simpler fix that works at every
        isolation level:
      </p>
      <pre><code>{`ALTER TABLE coupon_redemptions
  ADD CONSTRAINT one_use_per_customer UNIQUE (customer_id, code);`}</code></pre>
      <p>
        Now the second insert waits for the first transaction, sees its committed row, and
        fails with a unique violation, which the order code turns into a{' '}
        <code>COUPON_ALREADY_USED</code> response. The rule has moved from application code,
        where it could be raced, into the database, where it cannot. Many rules that seem to
        need careful locking can be stated as a constraint, and when they can, that is the
        cheapest enforcement available.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Mechanism</th><th>Fits when</th><th>What it costs</th></tr>
          </thead>
          <tbody>
            <tr><td>Unique or check constraint</td><td>the rule is about one row or a unique combination</td><td>errors that must be mapped to clear responses</td></tr>
            <tr><td>Conditional update</td><td>counters and state transitions on one row</td><td>logic in the <code>WHERE</code> clause; the code must check rows affected</td></tr>
            <tr><td><code>SELECT … FOR UPDATE</code></td><td>read several rows, decide, then write; conflicts are common</td><td>lock waits; deadlocks if transactions lock rows in different orders</td></tr>
            <tr><td>Version column, checked on write</td><td>conflicts are rare, such as two staff editing one menu</td><td>a retry or a “changed by someone else” message</td></tr>
            <tr><td>Serializable isolation for one transaction</td><td>a rule spans many rows and no constraint expresses it</td><td>aborts under contention, and retry code that must exist and be tested</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The table is ordered roughly by cost. Dabba’s order path uses the first two for nearly
        everything, a version column for restaurant menu edits, and has no rule yet that needs
        serializable isolation.
      </p>

      <h3>The write path, step by step</h3>
      <p>
        Putting it together, placing an order does its local work in one short transaction,
        and only after that transaction commits does it talk to anything outside the database.
      </p>
      <pre><code>{`BEGIN;
  INSERT INTO idempotency_keys (customer_id, key, request_hash, status)
       VALUES ($cust, $key, $hash, 'in_progress');        -- conflict: replay or 409
  INSERT INTO orders (...) VALUES (..., 'PAYMENT_PENDING', ...);
  INSERT INTO order_items (...) VALUES (...), (...);
  UPDATE limited_stock SET remaining = remaining - 2
   WHERE item_id = 9001 AND remaining >= 2;              -- 0 rows: ITEM_UNAVAILABLE
  INSERT INTO stock_reservations (order_id, item_id, qty, expires_at)
       VALUES ($order, 9001, 2, now() + interval '10 minutes');
  INSERT INTO coupon_redemptions (customer_id, code, order_id)
       VALUES ($cust, 'WELCOME100', $order);             -- unique violation: COUPON_ALREADY_USED
  INSERT INTO outbox (event_id, type, payload)
       VALUES ($event, 'order_created', $json);
  UPDATE idempotency_keys SET status = 'completed', response_code = 201, response_body = $resp
   WHERE customer_id = $cust AND key = $key;
COMMIT;

-- after commit, outside the transaction:
payment = provider.createPayment(amount, idempotencyKey = order_id)`}</code></pre>
      <Fig caption="Fig 1 · One short local transaction, then the payment provider. The webhook’s own transaction writes the event the kitchen tablet receives">
        <OrderWritePath />
      </Fig>
      <p>
        The transaction touches perhaps eight rows and takes a few milliseconds. If anything
        in it fails, everything in it is undone, including the idempotency key, so the
        customer’s retry starts cleanly. After commit, the order service asks the payment
        provider to create a payment, passing the order ID as the provider’s idempotency key,
        and returns the order and the payment details to the app. If the provider call fails,
        the order still exists in <code>PAYMENT_PENDING</code>; the app’s retry, with the same
        key, gets the stored order back, and the service asks the provider again with the same
        order ID, receiving the same payment rather than a new one.
      </p>
      <p>
        Two things in that transaction need explaining: why stock is reserved rather than
        simply taken, and why the payment call is outside. They come from the same incident.
      </p>

      <h3>The transaction that waited for the bank</h3>
      <p>
        An earlier version of the order code did everything in one transaction: lock the stock
        row with <code>SELECT … FOR UPDATE</code>, insert the order, call the payment provider,
        and commit once the provider answered. It looked tidy. If the payment call failed, the
        transaction rolled back and the stock was never taken.
      </p>
      <p>
        On a busy evening the payment provider slows down, and its responses take about 4
        seconds instead of 300 ms. Every order transaction now stays open for 4 seconds. Two
        things go wrong. Orders for the festival thali queue on its stock row’s lock, and since
        each holder keeps the lock for 4 seconds, the item can be sold at a quarter of an order
        a second, however many customers want it. Worse, every open transaction holds a
        database connection. By Little’s law, 150 orders a second × 4 seconds = 600
        connections busy at once. The order service’s pools across 30 servers hold 20
        connections each, exactly 600, and Postgres would not accept many more anyway. The
        pools run dry. Orders that do not involve the thali, or even the slow payment method,
        wait for a connection and time out. A slowdown at a third party has become an outage of
        all ordering.
      </p>
      <p>
        The rule that came out of this incident: a database transaction never waits on a
        network call to another system. Local work commits first, quickly. Anything external
        happens afterwards, and the order’s state records where it has got to. The thali’s
        stock is taken in the local transaction with a reservation that expires in 10 minutes,
        roughly the time a UPI payment can remain pending. When payment succeeds, the
        reservation becomes permanent. When payment fails, or the reservation expires, a
        background job returns the portions to stock and cancels the order (the background
        jobs chapter builds that job properly).
      </p>
      <p>
        The fix has a visible cost. For up to 10 minutes, portions held by customers who will
        never pay look sold out to everyone else. On a twelve-portion item, three abandoned
        checkouts can turn away paying customers. Dabba shortens the expiry for limited items
        and shows “a few left, being ordered now” rather than “sold out” while reservations are
        pending. And there is one more moving part, the expiry job, which must itself be
        reliable.
      </p>

      <h3>When the write spans Dabba and the payment provider</h3>
      <p>
        No transaction can include the payment provider. The provider will not hold locks on
        Dabba’s behalf, and protocols that coordinate a commit across systems, such as
        two-phase commit, require every participant to support them and stall when the
        coordinator fails. So the order and the payment are kept consistent by states,
        idempotent steps and checks, rather than by one atomic commit.
      </p>
      <p>
        The provider tells Dabba about payment outcomes with a webhook: an HTTP request to
        Dabba’s endpoint. Webhooks can arrive late, more than once, or out of order, and the
        handler is written for all three. It verifies the provider’s signature. It records the
        provider’s event ID in a table with a unique constraint, so a repeated delivery is
        recognised and acknowledged without being processed again. And it moves the order
        with a conditional update, inside a transaction that also writes an outbox row:
      </p>
      <pre><code>{`BEGIN;
  INSERT INTO payment_events (provider_event_id, order_id, outcome) VALUES (...);  -- duplicate: stop
  UPDATE orders SET status = 'PLACED'
   WHERE order_id = $1 AND status = 'PAYMENT_PENDING';
  -- 1 row: write outbox 'order_placed', confirm the stock reservation
  -- 0 rows: look at the current status and decide (below)
COMMIT;`}</code></pre>
      <p>
        The zero-row case is where the business rules live. If the order is already{' '}
        <code>PLACED</code>, this was a late duplicate and nothing more is needed. If the order
        was cancelled because its reservation expired, and the payment succeeded anyway (the
        customer approved the UPI request at minute eleven), Dabba now holds money for an order
        it will not cook. The handler issues a refund, keyed by the payment ID so a retry
        cannot refund twice, and notifies the customer. That refund is a compensating action:
        a new step that undoes the business effect of an earlier one, used because the earlier
        one cannot be rolled back.
      </p>
      <p>
        Webhooks can also fail to arrive at all. A reconciliation job asks the provider for
        the status of every order that has been in <code>PAYMENT_PENDING</code> for more than
        two minutes, and applies the answer through the same handler. With that job in place,
        the webhook is a way to learn quickly, and reconciliation is the way to be sure.
      </p>
      <p>
        The same structure covers the rest of the order’s life. If the restaurant rejects a
        paid order because the kitchen is overwhelmed, the compensation is a refund plus
        releasing any reserved stock. A sequence of local steps with a compensation for each
        is often called a saga. Its intermediate states are visible to customers and staff,
        so they need honest names: “payment pending” and “waiting for the restaurant” are
        true statements a support agent can act on, where a status that claims more than has
        happened is not.
      </p>
      <p>
        Finally, the outbox. When an order becomes <code>PLACED</code>, the kitchen tablet,
        the notification service and analytics all need to know. If the handler commits and
        then publishes a message to a broker, a crash between the two loses the message, and a
        paid order never reaches the kitchen. If it publishes first and then the commit fails,
        the kitchen cooks an order that does not exist. Writing the event as a row in an{' '}
        <code>outbox</code> table, in the same transaction as the status change, makes the two
        succeed or fail together. A separate relay reads new outbox rows and publishes them,
        marking each as sent. If the relay crashes after publishing and before marking, it
        publishes the row again on restart, so consumers must ignore events whose ID they have
        already handled. The streams chapter builds the relay and the consumers in detail.
      </p>

      <h3>When this is more than the write needs, and when it is not enough</h3>
      <p>
        Most of Dabba’s writes do not need any of this. A customer renaming a saved address, a
        rider toggling availability, a restaurant uploading a photo: each touches one row with
        no competing writer and no external system, and a plain update is correct. Running
        everything at serializable isolation “to be safe” would add aborts and retry code to
        all of them for no benefit. The care in this chapter belongs where money, stock or
        external systems are involved.
      </p>
      <p>
        The design has a limit worth knowing in advance. A single hot row, the thali’s stock,
        is locked by each order from its update until commit, a few milliseconds, which caps
        that one item at a few hundred orders a second. Dabba is far from that. A flash sale
        of one item to millions of customers would reach it, and the usual answer is to split
        the stock into several rows (ten buckets of 100 portions instead of one of 1,000) and
        take from a random bucket. We should also revisit the write path when order volume
        approaches what one primary sustains, or when orders must be written in more than one
        region, because both break the assumption that one database sees every order.
      </p>
      <p>
        That assumption is where this part of the course ends. Every chapter so far has relied
        on one Postgres primary for orders, and the arithmetic in the first chapter said that
        was safe for now. The next chapter, Sharding and partitioning, picks up the day it
        stops being safe: how to split orders, and later rider locations, across machines, and
        which of the queries from the data modelling chapter stay easy once the data no longer
        lives in one place.
      </p>
      <Notes
        items={[
          'Write each rule the order path must keep, then give each rule its own enforcement.',
          'Reading a value into the application and writing back a computed number loses updates under the default isolation; a conditional update does the check and the change as one step.',
          'Snapshot isolation does not protect the absence of a row; a unique constraint stops the twice-used coupon at every isolation level.',
          'A database transaction must never wait on a network call to another system; commit local work first and record progress in the order’s state.',
          'Webhooks arrive late, twice or not at all, so the handler dedupes by event ID, moves state with conditional updates, and a reconciliation job closes the gaps.',
          'An outbox row written in the same transaction as the state change is how a paid order reliably reaches the kitchen.',
        ]}
      />
    </>
  ),
}
