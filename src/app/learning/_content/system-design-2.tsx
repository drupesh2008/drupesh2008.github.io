/**
 * System Design pathway, part 2 of 3: sharding → realtime.
 * Every chapter follows Dabba, the food-delivery app whose brief is set in
 * the first chapter. Paragraphs sit on single lines on purpose: JSX drops
 * whitespace at line breaks next to inline tags.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
import { HashRing, TheLog } from './system-design-diagrams'
import {
  ShardKeyLoad,
  OutboxRelay,
  CdcFanout,
  CountMinGrid,
  GeohashNeighbours,
  OrderIdLayout,
  PresignedUpload,
  LocationFanout,
} from './system-design-2-diagrams'

export const sections: Record<string, ReactNode> = {
  /* ── Sharding ─────────────────────────────────────────────── */
  sharding: (
    <>
      <p>Sharding splits one table across several databases so that each holds a slice and the slices together hold everything. It lets a dataset keep growing after one machine has stopped being enough. The price is that a query which used to be one lookup may now have to ask every slice, and the shard key you choose decides which queries pay that price.</p>
      <p>The writes chapter ended on an assumption: one Postgres primary sees every order. The storage chapter named the conditions for revisiting it, a write rate approaching what one primary sustains or a tenfold rise in volume. This chapter starts on the day those conditions come into view. Dabba takes about 1 million orders a day today, and the plan for its expansion to more cities calls for about ten times that. One Postgres primary for orders is no longer enough for that plan, and this chapter works out why, what to split on, and how to change our minds later without a week of downtime.</p>

      <h3>What actually outgrows the database</h3>
      <p>The common story is that the database runs out of write throughput. It is worth checking against Dabba’s numbers before believing it, first for today and then for the plan. By the brief from the first chapter, the dinner hour carries about 42 orders a second on average, with spikes of two to three times, and the order path is designed for 150 orders a second.</p>
      <p>An order is not one write. Placing it inserts the order, its items, a stock reservation, an idempotency key and an outbox row in one transaction, and then it goes through about six status changes, each its own small transaction that also appends to <code>order_events</code>. Call it seven commits and about fifteen row writes per order. At the design target of 150 orders a second that is about 1,000 commits and 2,250 row writes a second, each commit waiting for the synchronous standby. A well-tuned Postgres primary handles that comfortably. Today, throughput does not force a split, which is what the storage chapter concluded too.</p>
      <p>Now multiply by ten. The design target becomes 1,500 orders a second at the dinner spike: about 10,500 commits and 22,500 row writes a second, every commit waiting a network round trip for the standby in another zone, and three or more index updates per insert. That is no longer a comfortable load for one primary; it is the kind of number teams reach by heroic tuning and then spend every dinner hour watching. Size grows the same way. At about 4 GB a day including indexes today, ten times the orders is about 40 GB a day, close to 15 TB a year.</p>
      <p>Three things go wrong at that scale, and only the first shows up in a throughput benchmark. The first is commit capacity, above. The second is recovery time. The storage chapter’s monthly partitioning keeps only recent months in the live database, but even 90 days at ten times today’s volume is about 3.6 TB, and restoring that at about 500 MB a second takes two hours before any write-ahead log is replayed. The third is blast radius. One primary means one bad migration, one runaway query or one failed disk stops every city at dinner time.</p>
      <p>So the decision we are about to write down is not only “we need more write throughput”. It is closer to “no single database should carry more than a fraction of dinner commits, hold more hot data than we can restore in well under an hour, or stop every city when it fails”. That sentence also tells us how many shards to start with. Eight shards at the tenfold target means about 1,300 commits a second and about 450 GB of hot data each, restorable in roughly 15 minutes. We build for eight, knowing that today each of them will be lightly loaded.</p>

      <h3>List the questions before choosing the key</h3>
      <p>A shard key is the column whose value decides which database a row lives in. A query that includes the key goes to one shard. A query that does not must ask all of them and merge the answers, which is called scatter-gather. So before choosing the key we list how the orders table is actually read, and how often.</p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Question</th><th>Who asks</th><th>Rough rate at dinner peak</th><th>Freshness needed</th></tr>
          </thead>
          <tbody>
            <tr><td>Active orders for this restaurant</td><td>Restaurant tablet</td><td>~20,000 open restaurants refreshing every 10 s: ~2,000/s today, growing with every new restaurant</td><td>A second or two; a missed order is lost money</td></tr>
            <tr><td>This order, by id</td><td>Customer status page, rider app, support</td><td>Around a thousand/s</td><td>Immediate</td></tr>
            <tr><td>My past orders</td><td>Customer app</td><td>A few hundred/s</td><td>Seconds of lag are fine</td></tr>
            <tr><td>Orders per city in the last 15 minutes</td><td>Operations dashboard</td><td>A handful/s</td><td>A minute is fine</td></tr>
            <tr><td>Restaurant earnings for last month</td><td>Restaurant owner, finance</td><td>Low</td><td>Hours are fine</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>Two rows dominate: the restaurant tablet and the lookup by order id. The tablet is both the highest rate and the one with the least tolerance for staleness. Whatever key we choose has to keep that query on one shard.</p>

      <Predict q={<>Suppose we shard orders by city: all Bengaluru orders on one database, all Mumbai orders on another, and so on. It is 20:30 on the night of a cricket final, and Bengaluru carries 30% of all orders. What happens to the Bengaluru shard, and what can we do about it without changing the key?</>}>
        <p>The Bengaluru shard takes 30% of all writes and reads while the Ahmedabad shard is nearly idle. With eight shards the fair share would be 12.5%, so Bengaluru runs at well over twice the load we sized each database for.</p>
        <p>Without changing the key, the options are thin. We can give Bengaluru a bigger machine, which buys time but is the vertical scaling we were trying to leave behind. We cannot split Bengaluru across two databases, because the key has only one value for the whole city: every Bengaluru order maps to the same place. Any split inside a city means a new key, such as city plus restaurant, and that is a migration.</p>
      </Predict>

      <h3>Three candidate keys, one dinner peak</h3>
      <p>City is the tempting key because it matches how the business thinks. Most queries are local, an order’s customer, restaurant and rider are almost always in the same city, and operations dashboards become single-shard. The trouble is granularity. A key with fifty values can never spread load more evenly than the cities themselves are spread, and Dabba’s cities are very uneven.</p>
      <Fig caption="Share of dinner-peak writes per shard. Sharding by city leaves the Bengaluru shard carrying 30%; hashing the restaurant id spreads the same load almost evenly.">
        <ShardKeyLoad />
      </Fig>
      <p>Customer id spreads load well, since there are millions of customers and none of them orders very much. “My past orders” becomes a single-shard query. But the restaurant tablet, our hottest query, now has to ask every shard, because one restaurant’s orders come from customers spread everywhere. At 2,000 tablet refreshes a second and eight shards, that is 16,000 shard queries a second to answer what used to be 2,000, and both numbers grow with the restaurant count.</p>
      <p>The extra load is not even the worst part. A scatter-gather request is as slow as its slowest shard. If each shard answers within 20 ms 99% of the time, the chance that all eight answer within 20 ms is 0.99 to the power 8, about 92%. So 8% of tablet refreshes see at least one shard’s worst-case latency, compared with 1% before. Add shards and it gets worse: with 16 shards it is 15%.</p>
      <p>Restaurant id, hashed, keeps the tablet query on one shard, because every order belongs to exactly one restaurant. There are about 50,000 restaurants, so hashing spreads them evenly, and even the busiest outlet takes a few hundred orders on a busy evening, which no shard notices. The lookup by order id can also stay single-shard if the order id itself carries the shard number; the chapter on IDs builds exactly that.</p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Shard key</th><th>Stays on one shard</th><th>Becomes scatter-gather</th><th>Skew at the dinner peak</th></tr>
          </thead>
          <tbody>
            <tr><td>City</td><td>Tablet, city dashboard, most order lookups</td><td>Customers who order in two cities</td><td>Severe; Bengaluru cannot be split</td></tr>
            <tr><td>Customer id (hashed)</td><td>My past orders</td><td>Restaurant tablet, the hottest read</td><td>Low</td></tr>
            <tr><td>Restaurant id (hashed)</td><td>Tablet, restaurant earnings, order by id if the id encodes the shard</td><td>My past orders, city dashboard</td><td>Low; one outlet is tiny next to a shard</td></tr>
            <tr><td>Order id (hashed)</td><td>Order by id</td><td>Everything else</td><td>None, and nothing else works well</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>So we write the decision down in a form someone could argue with: <em>we shard orders by a hash of restaurant_id, because the restaurant tablet is the highest-rate read with the tightest freshness need, and every order belongs to exactly one restaurant. Customer history, which tolerates seconds of lag, will be served from a separate copy keyed by customer_id.</em> That last clause is a promise the derived-data chapter has to keep.</p>
      <p>Notice what the key also decided about the product. An order from two restaurants at once, a combined cart, would now span two shards and need a cross-shard transaction. That is not impossible, but it means the product team’s idea for “add a dessert from the place next door” now has an infrastructure cost attached. The shard key is a product decision; it is better that the product people hear about it now.</p>

      <h3>Logical shards, so we only choose the number once</h3>
      <p>The obvious way to map a key to a shard is <code>hash(restaurant_id) mod N</code>. It works until N changes. Going from 8 to 9 databases, a key stays where it was only if its hash gives the same remainder for 8 and for 9, which is true for about one key in nine. The other eight in nine of all orders would have to move at once.</p>
      <Fig caption="Consistent hashing places keys and nodes on a ring. A new node takes over one arc, so roughly 1/N of keys move instead of nearly all of them.">
        <HashRing />
      </Fig>
      <p>Consistent hashing is one fix: keys and nodes sit on a ring, and adding a node moves only the arc it takes over. Key-value stores like Cassandra and DynamoDB work this way. Teams sharding a relational database more often use a simpler arrangement with the same effect, called logical shards.</p>
      <p>We fix a large number of logical shards up front and never change it. Dabba uses 8,192. A restaurant’s logical shard is computed from its id, and because 8,192 never changes, the answer for a given restaurant never changes either. A small mapping table then says which physical database holds each logical shard. On day one, eight databases each hold 1,024 logical shards. Adding a ninth means moving some logical shards to it, one at a time, and updating the map.</p>
      <p>How the logical shard is computed deserves one deliberate decision. The plain choice, <code>hash(restaurant_id) mod 8192</code>, scatters every city across every logical shard, so logical shard 3,071 holds a few restaurants from Bengaluru, Pune and Kolkata. That is harmless inside one region and becomes a wall later: when Dabba wants to serve each city from a home region, as the multi-region chapter does, no logical shard can move without dragging other cities with it. So Dabba gives each city its own block of logical shards, sized to its expected share (Bengaluru gets 2,048, a new city 64, with room left unallocated for cities not yet launched), and hashes restaurants within their city’s block: <code>block_start(city) + hash(restaurant_id) mod block_size(city)</code>.</p>
      <p>This does not bring back the hot-city problem from the prediction above. That problem came from a key with one value per city; here Bengaluru is spread over 2,048 logical shards, which the map spreads across every physical database. What it costs is a block size per city that must be guessed in advance; a city that outgrows its block needs a second block and a migration for the restaurants moved into it. It also has to be decided before the first sharded order id is issued, because the chapter on IDs bakes the logical shard number into every order id.</p>
      <p>The map has 8,192 rows. Every application server keeps a copy in memory and refreshes it when it changes. Routing a query costs a hash and an array lookup. This is the shape Vitess uses for YouTube’s MySQL and the one Instagram described for its Postgres shards, and it turns resharding from a rewrite into a series of small, reversible moves.</p>

      <h3>A resharding move, and where it loses writes</h3>
      <p>Here is a move as it is usually first implemented. We want logical shard 3,071, which holds a handful of Bengaluru restaurants (about six on average, 50,000 ÷ 8,192), to go from db-2 to the new db-9.</p>
      <ol>
        <li>Copy a consistent snapshot of shard 3,071’s rows from db-2 to db-9.</li>
        <li>Tail db-2’s replication log and apply every later change to those rows on db-9.</li>
        <li>When db-9 has caught up to within a fraction of a second, update the map: 3,071 now lives on db-9.</li>
        <li>Delete shard 3,071’s rows from db-2 later.</li>
      </ol>
      <p>Now walk it at 20:15 with real traffic. Application servers refresh the map every 30 seconds. The map changes at 20:15:00. Server 14 last refreshed at 20:14:50, so until 20:15:20 it still believes shard 3,071 is on db-2. At 20:15:07 a customer orders from restaurant 88213, which is in shard 3,071. Server 14 inserts the order on db-2. The replication tail from step 2 has already been stopped, because the move is “done”.</p>
      <p>The order now exists only on db-2. The restaurant tablet, served by a server with the new map, reads db-9 and never sees it. The customer has paid and watches a spinner for forty minutes. Nobody gets an error, which is why this kind of bug survives testing.</p>
      <p>The fix has two parts. Before flipping the map, we fence the source: db-2 stops accepting writes for shard 3,071 (the application checks a per-shard read-only flag, or the database rejects them), we wait for db-9 to apply the last change, and only then flip. Second, the map carries a version number, every write carries the version the server used, and a database that no longer owns a shard rejects the write with “moved, map version 42”. A server that gets that answer refreshes its map and retries.</p>
      <p>The cost is a short write freeze for that one logical shard, usually a few seconds, during which about six restaurants cannot accept new orders and the client retries. That is the trade we accept: a brief, bounded, visible pause for a tiny slice of restaurants, instead of silent loss. We would schedule moves for the afternoon lull, not the dinner peak.</p>

      <h3>The queries that leave the shard</h3>
      <p>Choosing restaurant id did not make the other queries disappear. Each one needs a deliberate answer, and the honest answer is often “not from this database”.</p>
      <p>“My past orders” is the clearest case. Asking eight shards for one customer’s history is affordable at a few hundred requests a second, but it gets worse as shards are added, and it puts a customer-facing page at the mercy of the slowest shard. The better plan is a second table, <code>customer_orders</code>, sharded by customer id and holding just enough to list the history: order id, restaurant name, total, date. It is filled from the stream of order events that the next chapter builds, and it lags by a second or two, which this page tolerates.</p>
      <p>The operations dashboard, “orders per city in the last 15 minutes”, should not touch the order shards at all. It is an aggregate over a stream of events, and it belongs in the analytics path. Restaurant earnings for a month is a warehouse query.</p>
      <p>Unique constraints are the quieter casualty. A rule like “a first-order coupon may be used once per customer” used to be a unique index on <code>(customer_id, code)</code>, checked in the same database as the order. Now two orders from the same customer at two restaurants land on two shards, and each shard’s index only sees its own rows, so both succeed. A unique index only enforces uniqueness among rows on its own shard. The writes chapter’s <code>coupon_redemptions</code> table had the same weakness once orders split: it was written inside the order transaction, on the order’s shard. The rule has to move to a table keyed by what must be unique, here <code>coupon_redemptions</code> sharded by customer id and checked before the order is written, with a compensating release if the order then fails.</p>
      <p>Transactions that cross shards follow the same logic. Placing an order touches one restaurant, so it stays on one shard and keeps its ordinary transaction. Anything that must change two shards together, like moving a refund between a restaurant’s balance and a customer’s wallet held elsewhere, becomes a saga of local steps with compensations, the pattern from the chapter on getting writes right.</p>

      <h3>When sharding is the wrong answer</h3>
      <p>Everything above has a running cost: routing code, a map to keep consistent, resharding tools, and every new feature asking “which shard?”. Before paying it, Dabba should try the cheaper moves, because they often push the problem out by years.</p>
      <p>At today’s volume, the cheaper moves are the right ones, and the storage chapter already made the main one. A delivered order is read heavily for a few hours and then rarely. With orders partitioned by month and anything older than 90 days moved to the analytics store and an archive, the live tables hold about 90 million orders, roughly 360 GB with indexes, and recent orders fit comfortably in memory. Dropping an old partition is instant where deleting millions of rows is not.</p>
      <p>Separating unrelated workloads helps too, and Dabba has already done it. Rider locations, 10,000 writes a second, left the orders database for Redis in the storage chapter. Menus live in their own database behind a cache. Each of these moves takes load off the primary without adding routing to every query. If the tenfold plan slips, the sharding work above can wait; the key choice and the logical-shard layout are still worth deciding now, because they shape the order id and every table that references it.</p>
      <p>We would revisit the decision in two situations. If the restore-time or blast-radius goal still fails after archiving, sharding is the next step. And if the product changes the shape of an order, for example combined carts across restaurants, the restaurant key stops keeping orders on one shard, and the key itself is back on the table.</p>

      <Callout>Pick the shard key from the highest-rate query with the tightest freshness need, then give every other query a deliberate home: a second copy keyed differently, the analytics path, or an accepted scatter-gather.</Callout>

      <p>Sharding put Dabba’s orders in eight places and promised a second copy of them keyed by customer. Meanwhile every new order already owes work to the restaurant tablet, rider assignment, notifications and analytics. The next chapter, on streams and the log, gives the order service one place to record what happened, so that every other system can catch up in its own time.</p>

      <Notes items={[
        'Check the split against real numbers: at Dabba’s current volume one primary copes, and the tenfold plan breaks commit capacity, restore time and blast radius together.',
        'A query that includes the shard key hits one database; every other query is scatter-gather and inherits the slowest shard’s latency.',
        'Dabba shards orders by hashed restaurant_id because the restaurant tablet is the hottest read and each order has exactly one restaurant.',
        'A fixed number of logical shards, allocated in per-city blocks and mapped to physical databases by a small table, lets you reshard by moving one slice at a time and later home whole cities to regions.',
        'A shard move must fence writes on the source and version the routing map, or stale routers will write to the old location.',
        'Unique constraints and transactions only hold within a shard; anything global needs its own table or a saga.',
      ]} />
    </>
  ),

  /* ── Streams ──────────────────────────────────────────────── */
  streams: (
    <>
      <p>A log is an ordered, append-only record of what happened, which many readers can follow at their own pace. It lets one service write down an event once and lets every other service react to it later, without the first service knowing they exist. This chapter takes the outbox from the writes chapter and connects it to a log, then works through the places where such a design usually goes wrong: the relay that ships events, duplicate deliveries, and one bad event that stops a reader.</p>
      <p>The situation is the moment a customer taps “Place order”. The order row commits. Then, before the customer’s food is on its way, at least six other things have to happen: the restaurant tablet must ring, rider assignment must start looking for a rider, the customer needs a push notification, fraud scoring wants to see the payment, analytics wants a record, and an invoice email must eventually go out. Last chapter also promised a <code>customer_orders</code> copy that has to learn about every order.</p>

      <h3>Why the order request cannot call everyone</h3>
      <p>The first version usually does the obvious thing: after inserting the order, the order service calls each of those systems in turn, inside the customer’s request. It is easy to read and it works in testing. It fails in production in two separate ways.</p>
      <p>Latency adds up. Six calls at 30 to 80 ms each put several hundred milliseconds on every order, all of it spent on work the customer is not waiting for. Availability multiplies. If each of the six downstream systems answers successfully 99.9% of the time, the chance that all six succeed is 0.999 to the power 6, about 99.4%. At 1 million orders a day, that is around 6,000 orders a day where some call failed and the order service has to decide what to do: fail the order the customer already paid for, or carry on and leave, say, the restaurant tablet unaware.</p>
      <p>The common next step is to fire those calls off in background threads so the request returns quickly. That fixes latency and quietly makes correctness worse. The calls now live only in the memory of one process. If that process is restarted by a deploy at 20:00, every call it was holding is gone, and nothing records that they were ever owed.</p>
      <p>What we need is a durable place to write “order 8812 was placed” once, in a form that survives crashes, that any number of systems can read, and that keeps events in order. The writes chapter already provides the first half: the <code>outbox</code> row written in the same transaction as the status change. This chapter supplies the second half, the log that outbox rows are shipped to.</p>

      <h3>What a log is, mechanically</h3>
      <Fig caption="A log is one ordered history. Producers append at the end; each consumer remembers only its own offset and reads at its own pace.">
        <TheLog />
      </Fig>
      <p>A log is a sequence of records, each given a position called its offset when it is appended. Records are never edited in place. A consumer reads from some offset forward and periodically saves the offset it has reached. That saved number is the whole of a consumer’s state. If the search indexer is slow, its offset falls behind; nobody else waits for it. If we deploy a new consumer next month, it can start from the oldest retained record and read history as if it had always been there.</p>
      <p>Kafka is the system most teams mean by this, and its vocabulary is worth having. A topic is a named log, such as <code>order-events</code>. A topic is split into partitions, each an independent log with its own offsets. A record’s key decides its partition, through a hash, so records with the same key always land in the same partition and stay in the order they were written. There is no ordering across partitions. Records are kept for a retention period, say seven days, whether or not anyone has read them.</p>
      <p>Consumers come in consumer groups. Every group receives every record; that is how notifications and analytics both see each event. Within one group, each partition is read by exactly one member at a time, which is how a group spreads work across several machines while keeping each partition’s order intact.</p>
      <p>Dabba’s volumes are modest for a log. About eight events per order (the six status changes, payment confirmation and rider assignment) at today’s dinner-hour average of 42 orders a second is about 340 events a second; at the design target of 150 orders a second, 1,200. A single Kafka partition can take tens of thousands of small records a second. So the partition count for <code>order-events</code> is not chosen for throughput. It is chosen for how many consumer machines we might want to run in parallel, which brings us to the first prediction.</p>

      <Predict q={<><code>order-events</code> has 48 partitions, keyed by order id. The notifications team is behind on a busy night and scales its consumer group from 24 instances to 60. What do the new instances do? And if another team had instead keyed the topic by event type (all “placed” events together, all “cancelled” events together), what could rider assignment see?</>}>
        <p>Only 48 of the 60 instances get a partition. The other 12 sit idle, because within a group a partition is read by one member at a time. Parallelism in a consumer group is capped by the partition count. If notifications needs more, the fix is either more partitions or doing less work per event (for example, batching calls to the push provider).</p>
        <p>Keying by event type breaks the one guarantee consumers rely on. “Placed” and “cancelled” for the same order would sit in different partitions, read independently. Rider assignment can process the cancellation first, ignore it because it has never heard of the order, then process the placement and send a rider to collect food that nobody will cook.</p>
      </Predict>

      <h3>Choose the partition key from the order the readers need</h3>
      <p>The rule that falls out of that answer is: key by the entity whose events must be seen in order. For <code>order-events</code> that is the order. Keying by restaurant id would also work, since every event of an order shares its restaurant, and it would additionally keep each restaurant’s events in order, which the tablet might like. The cost is skew: a cloud kitchen running six brands from one kitchen sends all its events to one partition. Keying by order id spreads load evenly and gives exactly the ordering consumers need.</p>
      <p>Rider locations are a separate topic, <code>rider-locations</code>, keyed by rider id. At 50,000 riders reporting every 5 seconds that is 10,000 records a second, the stream the storage chapter routes into the location-history store; here the partition count is chosen for throughput as well as parallelism. Keeping them out of <code>order-events</code> means a slow location consumer never delays a restaurant learning about an order.</p>
      <p>One warning about partition counts: increasing them later changes which partition a key hashes to. For a while, old events for order 8812 sit in partition 5 and new ones go to partition 17, and a consumer can see them out of order. So we pick a generous count at the start (Dabba uses 48 for <code>order-events</code>, about double the consumer parallelism it expects to need even at ten times today’s volume) rather than plan to grow it.</p>

      <h3>From the outbox to the log</h3>
      <p>The writes chapter closed the gap between committing an order and announcing it. Recall the two failures it removed: commit then publish, and a crash in between leaves a paid order the kitchen never hears about; publish then commit, and a rolled-back order gets cooked anyway. Its answer was the <code>outbox</code> table, written in the same transaction as the status change, with a relay that publishes new rows afterwards. Now we decide where the relay publishes to, and look at the relay itself, because it is where the next set of bugs lives.</p>
      <p>We extend the outbox row by one column, <code>order_id</code>, so that the relay can use it as the partition key, and the relay appends each row to <code>order-events</code>. After sharding there is one outbox per shard and one relay per shard, each shipping only its own shard’s rows.</p>
      <p>Here is how the relay goes wrong the first time someone scales it. The relay on db-3 falls behind during a dinner spike, so a second relay instance is started against the same outbox. Both run the polling query. Relay A picks up rows 1001 to 1500, relay B, a moment later, rows 1501 to 2000 plus a few that A has not yet marked. Row 1180 is <code>order_ready</code> for order 8812 and row 1620 is <code>order_picked_up</code> for the same order. B is faster and appends 1620 first. The log now says the order was picked up before it was ready, and rider assignment, which reads in log order, sees an order picked up by a rider it has not yet sent.</p>
      <p>The order inside a partition is only as good as the order in which events are appended to it. Two fixes keep it. Run exactly one active relay per outbox, with a lease so that a standby takes over only when the active one stops, or split the work so that each relay owns a fixed subset of order ids, for example by <code>order_id mod 4</code>, and so publishes every event of a given order itself, in outbox order. The cost of the first is throughput capped at one process per shard, which at a few hundred events a second is ample. The cost of the second is a little more configuration. Either is better than a log whose order cannot be trusted.</p>
      <Fig caption="The outbox from the writes chapter, connected to a log: the order change and its event commit together, and one relay per shard ships events in outbox order. The relay may send an event twice; it never loses one.">
        <OutboxRelay />
      </Fig>
      <pre><code>{`BEGIN;
  UPDATE orders SET status = 'PLACED' WHERE id = 8812 AND status = 'PAYMENT_PENDING';
  INSERT INTO order_events (order_id, status, at) VALUES (8812, 'PLACED', now());
  INSERT INTO outbox (event_id, order_id, type, payload)
    VALUES ('ev-8812-2', 8812, 'order_placed', '{...}');
COMMIT;

-- the single relay for this shard, in a loop
SELECT * FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT 500;
-- append each to order-events, keyed by order_id, in this order
UPDATE outbox SET sent_at = now() WHERE id IN (...);`}</code></pre>
      <p>The relay itself can crash between appending to the log and marking the rows sent. On restart it sends those rows again. So the outbox does not give exactly-once delivery; it gives at-least-once, which is a much easier promise to keep. Instead of polling the table, the relay can also read the database’s replication log for inserts into <code>outbox</code>; that is change data capture, and the next chapter uses it for more than events.</p>
      <p>The relay’s health needs its own number: the age of the oldest unsent outbox row. If it passes a few seconds at dinner, restaurants are hearing about orders late, whatever the consumers’ dashboards say. The other costs are small: one extra row per event, already paid in the writes chapter, and a cleanup job that deletes sent rows after a day.</p>

      <h3>At-least-once means every reader handles the second copy</h3>
      <p>Duplicates come from two directions. The relay may send twice, as above. And consumers themselves follow a read, act, save-offset cycle: if a consumer sends the push notification and then crashes before saving its offset, it reads the same event again after restart and sends the notification again.</p>
      <p>How much a duplicate hurts depends on what the consumer does. A second “your order is on the way” push is annoying. A second rider assignment request might pull two riders to the same restaurant. A second refund is money. Each consumer has to decide how it recognises an event it has already handled, and the cheapest tool is the event id the outbox assigned.</p>
      <p>When the consumer’s effect is a database write, it records the event id in a <code>processed_events</code> table with a unique index, in the same transaction as the effect. A second copy hits the unique index, and the consumer skips it. When the effect is an external call, such as the payment provider’s refund API or the push provider, the consumer passes the event id as the provider’s idempotency key if the provider supports one. Where none exists, we accept that a rare duplicate push is the cost of never dropping one.</p>
      <p>Kafka does offer transactions that give exactly-once processing for a consumer that reads from one topic and writes to another. That guarantee covers the Kafka side only. The moment a consumer sends a push or calls a bank, we are back to idempotency, and the design must say how each consumer provides it.</p>

      <h3>One bad event can stop a partition</h3>
      <p>Here is a failure that every log-based system eventually meets. A new rider app version has a bug that leads to one <code>order_picked_up</code> event with a null restaurant id. It lands in partition 7 at 20:04. The analytics consumer reads it, throws an exception while building its row, and crashes. It restarts, reads its last saved offset, which is just before the bad event, reads the bad event again, and crashes again.</p>
      <p>Partition 7 is now stuck for analytics. Every other partition carries on, so the overall dashboard looks almost normal, and lag on partition 7 grows quietly. If the same bug were in the restaurant tablet consumer instead, one in 48 restaurants would stop receiving orders at dinner, and only those restaurants would notice.</p>
      <p>The fix has three parts. First, measure lag per partition and in seconds, not only in record counts: “partition 7 is 14 minutes behind” is the alert, and it fires well before anyone complains. Second, bound retries: after three failed attempts, the consumer writes the event to a dead-letter topic with the error, alerts, and moves on. Third, think about what moving on breaks. For analytics, skipping one event is fine and it can be replayed after a fix. For a consumer that needs per-order ordering, skipping <code>order_picked_up</code> and then processing <code>order_delivered</code> leaves the state wrong. Those consumers should park every later event for the same order alongside the bad one, so the order is held back while everything else flows.</p>
      <p>The cost is a dead-letter topic to watch and a replay tool to write. Without them, a single malformed record holds a partition hostage until someone notices.</p>

      <h3>Queue or log</h3>
      <p>Logs and queues are often mentioned together, and they solve different problems. The difference is what happens to a message after it is read.</p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Property</th><th>Queue (SQS, RabbitMQ style)</th><th>Log (Kafka style)</th></tr>
          </thead>
          <tbody>
            <tr><td>After a message is processed</td><td>It is deleted</td><td>It stays until retention expires</td></tr>
            <tr><td>Number of independent readers</td><td>Usually one kind of worker</td><td>Any number of groups, each sees everything</td></tr>
            <tr><td>Ordering</td><td>Weak or per group, often traded for throughput</td><td>Strict within a partition</td></tr>
            <tr><td>Replay last week</td><td>Not possible</td><td>Reset the offset</td></tr>
            <tr><td>Per-message retry and delay</td><td>Built in</td><td>Built by the consumer</td></tr>
            <tr><td>Fits at Dabba</td><td>“Resize this photo”, “send this invoice email”</td><td>“Order 8812 was placed”, rider locations</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>A useful test: is the message a task for someone to do, or a fact about something that happened? Tasks belong in queues, where each one is done once and deleted. Facts belong in logs, where many readers each draw their own conclusions and a new reader can arrive later.</p>

      <h3>When a log is more than the problem needs</h3>
      <p>A Kafka cluster is a system to run: brokers, disks, upgrades, partition rebalancing, consumer-group tuning. A team with one database and two consumers can get most of the benefit from the outbox table alone, with a worker that polls it and calls the consumers directly. That keeps the atomic write and the at-least-once delivery, and drops the cluster until there are enough readers to justify it.</p>
      <p>At the other end, some teams make the log the source of truth itself. In event sourcing, the current state of an order is computed by replaying its events, and the orders table is only a cached projection. That suits domains that are ledgers by nature, like Dabba’s restaurant payouts, where every change must be explained forever. For orders in general it adds work everywhere: every schema change becomes an event versioning problem, and every read is a projection to maintain. Dabba keeps the orders table as the truth and the log as the record of changes to it.</p>
      <p>We would revisit the log if Dabba ever needed cross-region ordering of events, which a single partitioned log does not provide, or if consumer count stayed at one or two for years, in which case the cluster is overhead.</p>

      <Callout>Make one local write the moment of truth, ship events from it in the order they were written, and have every consumer recognise an event it has already handled.</Callout>

      <p>The log now carries every change to Dabba’s orders, and several systems want to build their own versions of that data: the customer history copy, a search index over restaurants and menus, and an analytics warehouse. The next chapter, on derived data, is about building those copies so that they agree with the source within a stated time, and can be thrown away and rebuilt.</p>

      <Notes items={[
        'Calling every downstream system inside the order request adds their latencies and multiplies their failure rates.',
        'A log keeps records in order within a partition, retains them for a period, and lets each consumer group read at its own offset.',
        'The partition key should be the entity whose events must be seen in order; for order events, that is the order id.',
        'The outbox from the writes chapter turns “maybe lost” into “maybe duplicated”; one relay per outbox, publishing in outbox order, keeps the log’s order trustworthy.',
        'Every consumer needs a stated way to recognise a duplicate, usually the event id stored with a unique index.',
        'Measure lag per partition in seconds and send repeatedly failing events to a dead-letter topic so one bad record cannot stall a partition.',
      ]} />
    </>
  ),

  /* ── Derived data ─────────────────────────────────────────── */
  derived: (
    <>
      <p>Derived data is any copy of the truth reshaped to answer a question the source answers badly. A search index, an analytics warehouse, a cache and the <code>customer_orders</code> table from the sharding chapter are all derived data. This chapter is about building such copies so that they agree with the source within a time we promise, and so that losing one is an inconvenience rather than an incident.</p>
      <p>Two Dabba questions start it. At 20:10 a customer in Indiranagar types “paneer” into the search box and expects restaurants that are open now, deliver to her, have a matching dish in stock, and are ranked sensibly. Meanwhile the operations team wants average preparation time per restaurant per hour for the last 90 days, to find kitchens that slow down at the peak. Neither question should be asked of the order shards or the menu database.</p>

      <h3>Why the source database cannot answer the search box</h3>
      <p>By the brief, there are about 50,000 restaurants. With roughly 80 dishes each, the menu tables hold around 4 million dishes. The naive query is <code>{`WHERE name ILIKE '%paneer%'`}</code>. An ordinary B-tree index cannot help with a pattern that starts with a wildcard, because the index is sorted by the beginning of the string. So the database reads all 4 million rows, for every keystroke, for every customer, on the same menu database that is busy building menus for 16 million views a day.</p>
      <p>Speed is only the first problem. Customers type “panner”, “panir” and “paneer tika”. They expect “cottage cheese” to find paneer and “biryani” to find “dum biriyani”. And the answer must be ranked by a mix of text relevance, distance, rating, delivery time and whether the restaurant is busy. A relational query can be bent into doing some of this, but the structure built for it is different.</p>
      <p>That structure is the inverted index. Instead of storing, for each dish, the words it contains, it stores for each word the list of dishes that contain it. Building it starts with analysis: each dish name and description is lowercased, split into tokens, and normalised, so “Paneer Tikka (Half)” becomes the terms <code>paneer</code>, <code>tikka</code>, <code>half</code>. Synonym rules add <code>cottage cheese</code> as another way to reach <code>paneer</code>. Each term then points to a sorted posting list of dish ids.</p>
      <p>A query runs the same analysis on what the customer typed, looks up each term’s posting list, and intersects or unions them. That gives candidate dishes in milliseconds no matter how many dishes exist. Filters (this city, open now, in stock, delivers to this location) narrow the candidates, and a ranking function scores what is left. BM25, the standard text-relevance score, gives more weight to rare terms and less to long descriptions that mention a word in passing. Dabba then blends in distance and rating.</p>
      <p>Search is naturally local, so Dabba keeps one index per city. A Bengaluru query never needs Mumbai’s dishes, and a bad index rebuild in one city affects only that city.</p>
      <p>Most “search is broken” tickets come from analysis that differs between indexing and querying. If the index stems “tikka” to “tikk” but the query analyser does not, a search for “tikka” finds nothing. Using the same analyser on both sides is a rule worth checking first.</p>

      <h3>Two ways to fill the copy</h3>
      <p>The index needs to change whenever a menu changes. The obvious approach is the dual write: the menu service updates the database and then sends the same change to the search engine. It reads well, and it drifts.</p>

      <Predict q={<>A restaurant owner taps “out of stock” on butter chicken at 20:01:00 and, realising she tapped the wrong dish, taps “in stock” again at 20:01:02. The two requests are handled by two different menu-service servers, each of which updates the database and then sends the change to the search index. What can the index end up showing, and for how long?</>}>
        <p>The database applies the two updates in the order they commit, so it ends correctly: in stock. The search index receives two separate HTTP calls from two servers. If the second server’s call is quicker (a garbage-collection pause on the first, a retry, a slow network path), the index applies “in stock” and then “out of stock”.</p>
        <p>The index now says butter chicken is unavailable, and nothing will correct it until that dish changes again, which could be days. The restaurant loses orders for its most popular dish and the dashboards show nothing wrong. A related failure is simpler: the index call times out, the server logs a warning and moves on, and that one change is never applied.</p>
      </Predict>

      <h3>Read the database’s own log instead</h3>
      <p>The fix is to stop asking application code to keep two systems in step. The database already records every committed change, in commit order, in its write-ahead log (Postgres) or binlog (MySQL), because that is how replicas stay in step. Change data capture, CDC, reads that log and turns each committed row change into an event with the row’s before and after values. Debezium is a widely used open-source connector that does this and appends the events to Kafka.</p>
      <Fig caption="Change data capture. The application writes once; a connector turns the database’s own log into events, and each derived store reads them at its own offset.">
        <CdcFanout />
      </Fig>
      <p>Because the events come from the commit log, they arrive in commit order, and if we key them by dish id, every change to one dish stays in one partition, in order. The butter chicken race cannot happen: the index sees “out of stock” and then “in stock”, the order the database committed them. A timed-out index write is not lost either: the indexer has not saved its offset, so it retries the same event.</p>
      <p>Retries and replays mean the indexer sometimes applies an old change after a newer one, for example after it rewinds to rebuild. Versioned writes close that gap. Each event carries the log position at which it committed, and the indexer writes with that position as the document version. Elasticsearch’s external versioning rejects any write whose version is not higher than the stored one, so an old event arriving late is ignored instead of undoing a newer change.</p>
      <p>CDC has costs worth naming. There is a connector to run, monitor and upgrade. The events mirror table structure, so renaming a column in the menu database becomes a breaking change for the indexer, the warehouse loader and anyone else reading the stream. Some teams prefer to publish deliberate domain events through the outbox from the previous chapter (“DishAvailabilityChanged”) so that consumers depend on a contract instead of a table layout. Dabba uses raw CDC for the search index and warehouse, which want every column anyway, and outbox events for things other teams build products on.</p>
      <Tbl>
        <table>
          <thead>
            <tr><th>How the copy is updated</th><th>Ordering</th><th>What goes wrong</th><th>What it costs</th></tr>
          </thead>
          <tbody>
            <tr><td>Dual write from application code</td><td>Whatever order the network delivers</td><td>Reordered and dropped updates, silent drift</td><td>Nothing up front; the bill comes later</td></tr>
            <tr><td>CDC from the commit log</td><td>Commit order, per key</td><td>Consumers break when the table schema changes</td><td>A connector to operate; schema coupling</td></tr>
            <tr><td>Outbox domain events</td><td>Commit order, per key</td><td>An event the author forgot to emit</td><td>Discipline in every write path</td></tr>
            <tr><td>Periodic full rebuild</td><td>Not an issue; the copy is replaced</td><td>Stale between runs</td><td>Heavy reads on the source each run</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>Freshness is a number we promise and measure</h3>
      <p>A derived copy is always behind the source. The question is how far, and whether that is acceptable for the thing it answers. Saying “eventually consistent” and stopping there leaves every team guessing. We write a freshness target for each copy and measure it.</p>
      <p>For Dabba’s search index: availability changes are reflected within 30 seconds at p99; descriptions and photos within 10 minutes. The reason for the tight first number is money. A customer who orders a dish that went out of stock five minutes ago gets a cancellation and probably does not come back that evening. For the warehouse, 15 minutes is fine. For <code>customer_orders</code>, a few seconds.</p>
      <p>The measurement is consumer lag expressed in time: the current time minus the commit timestamp of the last event the consumer applied. It is the same per-partition lag from the last chapter, with a target attached. When the lag on the Bengaluru search indexer passes 30 seconds, someone is paged, before customers start ordering dishes that do not exist.</p>
      <p>One freshness problem is not about lag at all. The restaurant owner marks butter chicken out of stock, then opens her own menu page in the partner app to check. If that page reads from the search index, it may still show the dish in stock for a few seconds. She taps the toggle again, which turns it back on. The owner needs to read her own writes. So the partner app’s menu screen reads from the menu database, and only customers read from the index. Choosing which reader may see which copy is part of the design.</p>

      <h3>Analytics wants columns</h3>
      <p>The operations question was average preparation time per restaurant per hour for 90 days. That is about 90 million orders (1 million a day for 90 days). The query needs three fields from each: restaurant id, accepted time, and ready time.</p>
      <p>A transactional database stores rows together on disk, because its usual job is to fetch or update one whole order. To read three fields it must read the pages holding entire rows. If an order row with its columns is around 1 KB, scanning 90 million of them reads about 90 GB, and it competes with dinner traffic for the same disks and memory. A column store keeps each column in its own files. The same query reads three columns of 8 bytes each, about 2.2 GB, and columns of similar values compress well, often by a factor of five or more. The difference between those two numbers is why Dabba runs analytics in a warehouse fed from the log, and why it never runs them on a production replica during dinner.</p>
      <p>The warehouse is loaded in small batches every few minutes from the CDC topics. Because the log keeps seven days and the warehouse keeps raw events, we can change how preparation time is calculated next month and recompute history from the raw events. If the logic changes and history cannot be recomputed, last year’s numbers quietly disagree with this year’s.</p>

      <h3>Keeping the promise from the sharding chapter</h3>
      <p>The sharding chapter left a debt: orders are sharded by restaurant, and “my past orders” would be served from a <code>customer_orders</code> table sharded by customer id. That table is derived data, and building it shows the general recipe in a small space.</p>
      <p>A consumer reads <code>order-events</code>. For each event it computes the customer’s shard and upserts one row keyed by order id: restaurant name, item summary, total, status and time. It does not append a row per event; it keeps one row per order and overwrites it as the order progresses, so the table holds the current picture of each order, which is all the history page shows.</p>
      <p>Two details make it safe. Events for one order arrive in order, because the topic is keyed by order id, but the consumer may still see an event twice after a restart. So each row stores the sequence number of the last event applied, and the upsert only changes the row if the incoming event’s number is higher. A duplicate or a replayed old event becomes a no-op. And the restaurant name is copied into the row at the time of the order, rather than looked up when the page renders. If a restaurant later renames itself, past orders still show the name the customer ordered from, which is what a receipt should show, and the history page never needs to query another service.</p>
      <p>Its freshness target is a few seconds. A customer who places an order and immediately opens her history might not see it yet, so the history page also reads her active orders directly from the order shards, which it can find from the order ids the app already holds, and merges them in. That is the read-your-writes problem again, solved by reading the source for the small part of the page where it matters.</p>

      <h3>Rebuild is the test</h3>
      <p>The property that makes a copy derived is that it can be rebuilt from the source. If we cannot do that, it is a second source of truth with no backups, whatever we call it.</p>
      <p>Here is how that goes wrong in practice. A ranking engineer adds a “popularity” field that the search indexer computes by counting clicks on search results, storing the running total only in the index. Six months later a bad mapping change corrupts the Bengaluru index and it has to be rebuilt. The menus come back from the database. The popularity numbers do not, because the clicks were never kept anywhere else. Ranking for Bengaluru silently resets to six months ago. The fix is to make clicks an event stream of their own, retained in the warehouse, and compute popularity from that, so that it too can be rebuilt.</p>
      <p>Rebuilding without downtime is routine once the pipeline is right. We create a new, empty index, start a consumer that snapshots the menu tables at a known log position, and then reads the stream from that position. When the new index has caught up, we switch the alias that queries use from the old index to the new one, and delete the old one later. If the rebuild produces something wrong, the alias still points at the old index and customers never notice.</p>
      <p>Pipelines also need checking against the source, because bugs in consumers do not announce themselves. A nightly reconciliation job compares, per restaurant, the count of in-stock dishes in the database with the count in the index, and alerts on any difference. It is a dull job, and it catches problems that monitoring lag never would, since a consumer can be perfectly up to date and still wrong.</p>

      <h3>When a separate copy is not worth it</h3>
      <p>At ten cities, Postgres’s own full-text search, with a GIN index on a read replica, can answer “paneer” across 4 million dishes quickly enough. It supports stemming and ranking, and it needs no new system. A separate search engine adds a pipeline, a freshness target, a reconciliation job and an on-call rotation. Dabba should start there and move when the database version runs out: when ranking needs signals the database cannot combine efficiently, when typo tolerance and transliteration become product requirements, or when search load starts to hurt the replica’s other readers.</p>
      <p>The same applies to every copy. Each one has a pipeline to run, a freshness target to measure and a rebuild to rehearse. A copy earns that cost when the source genuinely cannot answer its question; otherwise an index on the source is the cheaper answer.</p>

      <Callout>A copy counts as derived only if it can be rebuilt from the source; every derived copy needs a pipeline that follows the commit log, a freshness target measured as lag, and a rebuild path we have tried.</Callout>

      <p>Some questions do not need a full copy at all. “How many different customers looked at this restaurant this week?” and “which dishes are trending in Pune right now?” only need a small summary that is approximately right. The next chapter, on sketches, covers data structures that answer such questions in kilobytes, and how to tell when an approximate answer is acceptable.</p>

      <Notes items={[
        'An inverted index maps each analysed term to the dishes containing it, which is why search answers in milliseconds where ILIKE scans every row.',
        'Dual writes from application code can reorder or drop updates; reading the database’s commit log keeps changes in commit order.',
        'Versioned writes keyed to the log position stop a late or replayed event from undoing a newer change.',
        'Every derived copy needs a freshness target, measured as consumer lag in seconds, and some readers must read the source instead.',
        'If a copy holds data that exists nowhere else, it is a second source of truth and needs to be treated as one.',
        'A search engine is worth its pipeline only once the database’s own full-text search can no longer meet the requirement.',
      ]} />
    </>
  ),

  /* ── Sketches ─────────────────────────────────────────────── */
  sketches: (
    <>
      <p>A sketch is a small data structure that summarises a large stream well enough to answer one kind of question approximately, with an error we can calculate in advance. This chapter covers the three sketches most systems meet: HyperLogLog for counting distinct things, count-min for estimating how often something occurred, and the Bloom filter for checking whether something has been seen. Just as important, it covers when the exact answer is cheap enough that none of them is needed.</p>
      <p>Dabba’s partner app is getting a dashboard. Restaurant owners want to know how many different customers looked at their menu today, this week and this month. The growth team wants a “trending near you” row showing the dishes being ordered most in each city in the last hour. Both questions are asked continuously, by many people, over data that arrives at thousands of events a second.</p>

      <h3>Start by pricing the exact answer</h3>
      <p>Before reaching for anything clever, we estimate what exact counting would cost, because often it is fine. The brief puts menu views at about 16 million a day, roughly sixteen for every order placed. Many are repeats: the same customer opening the same menu twice. Say 10 million distinct (restaurant, customer) pairs a day.</p>
      <p>For a nightly report, exact is easy. The warehouse from the last chapter runs <code>COUNT(DISTINCT customer_id)</code> grouped by restaurant over yesterday’s views, and nobody needs anything more. Exact counting becomes expensive under three conditions, which are worth naming because they decide when a sketch earns its place: when the answer must be live rather than nightly, when it must be combined across arbitrary ranges (“the last 30 days” starting from any day), and when the events are counted on many machines that each see only part of the stream.</p>
      <p>Dabba’s dashboard meets all three. Views are counted by the 30 API servers, the owner can pick any range, and the number should move while she watches it at dinner time. To keep exact answers we would store, for each restaurant and day, the set of customer ids that viewed it, and union 30 of those sets whenever someone opens the monthly view. For a popular restaurant with 40,000 viewers a month, that union reads and merges hundreds of thousands of ids for one tile on one screen.</p>

      <Predict q={<>Two API servers each keep an exact count of distinct customers who viewed restaurant 88213 today. Server A reports 4,000 and server B reports 3,000. How many distinct customers viewed the menu today?</>}>
        <p>We cannot tell. Somewhere between 4,000 and 7,000. If every customer who hit server B also hit server A (load balancers spread one customer’s requests across servers all the time), the answer is 4,000. If the two groups never overlap, it is 7,000.</p>
        <p>Distinct counts do not add. To combine them we need the sets themselves, or something that summarises a set in a way that can be merged. That property, mergeability, is the main reason HyperLogLog exists in production systems.</p>
      </Predict>

      <h3>How HyperLogLog counts what it never stores</h3>
      <p>HyperLogLog estimates how many distinct items a stream contains. It relies on one fact about random numbers. Hash each customer id to a random-looking 64-bit number. Half of all hashes start with a 0 bit, a quarter start with two 0 bits, one in eight with three. If, after hashing everyone who viewed the menu, the longest run of leading zeros we have seen is 12, then we have probably seen something like 2 to the power 12, about 4,000, different values. Seeing the same customer again produces the same hash, so repeats change nothing. That is what makes it count distinct items rather than events.</p>
      <p>One such observation is a noisy estimate; a single lucky hash can throw it off by a factor of two. So HyperLogLog splits the stream. It uses the first 14 bits of each hash to choose one of 16,384 registers, and in each register it keeps the longest run of leading zeros seen among the remaining bits. The final estimate combines all registers with a harmonic mean, which limits the damage from a few unlucky ones, plus corrections for very small and very large counts.</p>
      <p>The numbers that make it useful: 16,384 registers of 6 bits each is 12 KB, and the standard error is about 1.04 divided by the square root of the register count, which comes to 0.81%. That is the same whether the true count is a thousand or a billion. Redis implements it with exactly these parameters in <code>PFADD</code> and <code>PFCOUNT</code>, and stores small counts in a sparse encoding of a few hundred bytes, moving to the 12 KB form only as they grow.</p>
      <p>Merging is where it pays off. Two HyperLogLogs built with the same parameters merge by taking the larger value in each register, and the result is exactly the sketch we would have built from the combined stream. So each API server keeps its own sketch per restaurant per day, they merge freely, and “the last 30 days” is a merge of 30 small objects. For the restaurant with 40,000 monthly viewers the answer is 40,000 plus or minus about 320, computed in microseconds.</p>
      <pre><code>{`PFADD  views:r88213:2026-10-15  cust:4471
PFADD  views:r88213:2026-10-16  cust:4471 cust:9902
PFCOUNT views:r88213:2026-10-15 views:r88213:2026-10-16
-- merges the two days on the fly; customer 4471 counted once`}</code></pre>
      <p>Is ±0.8% acceptable? For an owner deciding whether her new menu photos brought more people in, yes. She is comparing 40,000 with 31,000, not 40,000 with 40,100. For anything that is paid on, it is not, and the last section returns to that line.</p>

      <h3>Which dishes are trending: estimating frequency</h3>
      <p>The trending row asks a different question: for each dish, how many times was it ordered in this city in the last hour, and which are the top 20? The exact answer is a hash map from dish to count. At Dabba’s order rate that map is small: about 150,000 orders in the dinner hour, perhaps 450,000 item events, across at most a few hundred thousand distinct dishes nationally, a few tens of megabytes. One process could hold it exactly.</p>
      <p>So for orders, Dabba counts exactly. The case changes when we move from orders to impressions: each time a dish card appears on someone’s screen. At around 40 cards per session and 4 million sessions a day, that is 160 million impressions a day. The dinner hour carries 15% of the day, 24 million impressions, about 6,700 a second, spread over 30 servers, with a long tail of dishes that appear once. Exact per-server maps that must be shipped and merged every minute become a real cost. A count-min sketch replaces each map with a fixed-size grid.</p>
      <Fig caption="A count-min sketch: one dish hashes to one counter in each row. Other dishes sharing a counter only ever add to it, so the smallest of the four counters is the closest estimate.">
        <CountMinGrid />
      </Fig>
      <p>The grid has d rows of w counters, and each row has its own hash function. To record an impression of “chicken biryani”, we hash it once per row and add one to the chosen counter in each row. To estimate its count, we read those same d counters and take the smallest. Other dishes that happen to hash to the same counter add to it, so every counter can only overestimate. The row where the dish shared its counter with the fewest others gives the closest answer.</p>
      <p>The error has a precise and slightly surprising shape. With w counters per row, the overestimate is at most e/w times the total number of events counted, with probability 1 − e<sup>−d</sup>. Take w = 2,000 and d = 5: 10,000 counters, 40 KB at 4 bytes each. If Bengaluru shows 7 million impressions in the dinner hour (about 30% of 24 million), the overestimate for any dish is at most about 0.14% of 7 million, roughly 9,500, with 99.3% probability.</p>
      <p>Notice that the error is relative to the whole stream, not to the dish. For a popular biryani with 150,000 impressions, an overestimate of up to 9,500 hardly changes its rank. For a dish with 1,000 impressions, the estimate is noise. That makes count-min good at exactly one thing: finding the heavy hitters, the items far above the noise floor. Alongside the grid we keep a small heap of the current top 100 candidates; each new event updates the grid, and if the dish’s estimate beats the smallest entry in the heap, it takes that place. Like HyperLogLog, count-min merges simply: add two grids cell by cell.</p>
      <p>The same structure has a less visible use. Counting requests per cache key with a count-min sketch finds the hot keys, the handful of menus receiving a large share of reads, so they can be replicated or cached closer to the user before they overload one cache node.</p>

      <h3>Bloom filters: a cheap “definitely not”</h3>
      <p>A Bloom filter answers “have we seen this item before?” with one asymmetry. A “no” is certain. A “yes” means probably. It is a bit array of m bits and k hash functions. Adding an item sets the k bits its hashes point to. Checking an item looks at those k bits: if any is 0, the item was never added; if all are 1, it was either added or its bits were all set by other items.</p>
      <p>Its main use is skipping expensive work whose answer is usually “not here”. Dabba stores each rider’s location history, used for disputes and payouts, in an LSM-based store such as Cassandra or RocksDB. Data there is spread over many immutable files, and a read for rider 4411’s history at 20:15 might otherwise open dozens of them. Each file carries a Bloom filter of the keys it contains, so the read checks the filters in memory and opens only the one or two files that might hold the rider. Most teams use Bloom filters this way without ever writing one; it helps to know they are there and why.</p>
      <p>When we do size one ourselves, the formula is fixed. For n items and a target false-positive rate p, we need m = −n ln p ÷ (ln 2)<sup>2</sup> bits and about (m/n) ln 2 hash functions. For p = 1% that is about 9.6 bits per item and 7 hashes. Eight million items, roughly a day of Dabba’s order events at eight events per order, need about 10 MB.</p>

      <Predict q={<>The notifications consumer from the streams chapter wants to skip duplicate events cheaply. Someone proposes: keep a Bloom filter of processed event ids, and if the filter says “seen”, skip the event. The filter is sized for 1% false positives. What goes wrong?</>}>
        <p>A false positive means the filter says “seen” for an event that was never processed. With this design, 1% of genuinely new events are skipped. At about 340 events a second in the dinner hour, that is three or four notifications a second that silently never go out, including “your rider has arrived”.</p>
        <p>The filter is pointed in the wrong direction. Used correctly, it answers only the question it is certain about: if the filter says “definitely not seen”, process the event without checking the database; if it says “maybe seen”, check the <code>processed_events</code> table, which is authoritative. A false positive then costs one extra database read, not a lost message.</p>
      </Predict>
      <p>Before asking how big a filter must be, it is worth asking what a false positive costs in each use. In the LSM store it costs one wasted file read. In the dedupe check it costs one database read, if the filter is used as a pre-check, and a lost notification if it is used as the authority. And at Dabba’s few hundred order events a second, the database check is cheap enough that the filter may not be worth having at all. It would earn its place on a much faster stream, like the 10,000 rider locations a second.</p>

      <h3>A filter that quietly filled up</h3>
      <p>Here is how a Bloom filter usually fails. A team sizes a filter for 2 million event ids a day at 1% false positives: about 19 million bits, 7 hashes. It works well at launch. A year later, after Dabba expands to more cities and adds new event types, the same filter receives 8 million ids a day. Nobody changed the code, so nobody looked at it.</p>
      <p>The false-positive rate of a Bloom filter with n items is about (1 − e<sup>−kn/m</sup>)<sup>k</sup>. With k = 7, n = 8 million and m = 19.2 million, kn/m is about 2.9, e<sup>−2.9</sup> is about 0.054, and 0.946 to the power 7 is about 0.68. The filter now says “maybe seen” for 68% of new ids. Used as a pre-check, it sends 68% of events to the database it was supposed to protect, and the database load that the filter used to absorb arrives all at once on a busy evening. Used as an authority, it would be dropping two-thirds of notifications.</p>
      <p>The fix is to treat the expected item count as a parameter that must be revisited. Dabba rotates the filter daily, sizes it for twice the current daily volume, and exports its fill ratio (the fraction of bits set) as a metric with an alert at 50%. During the first minutes after midnight the consumer checks both today’s and yesterday’s filters. The cost is memory sized for growth that has not happened yet and two lookups for a short period each day. In exchange, the filter fails loudly on a dashboard instead of quietly in the database.</p>

      <Tbl>
        <table>
          <thead>
            <tr><th>Sketch</th><th>Question it answers</th><th>Size</th><th>Shape of the error</th><th>Merges by</th></tr>
          </thead>
          <tbody>
            <tr><td>HyperLogLog</td><td>How many distinct items?</td><td>12 KB, whatever the count</td><td>±0.81% standard error, either direction</td><td>Taking the max per register</td></tr>
            <tr><td>Count-min</td><td>How many times did this item occur?</td><td>w × d counters, e.g. 40 KB</td><td>Overestimates only, by up to a fraction of the total stream</td><td>Adding grids cell by cell</td></tr>
            <tr><td>Bloom filter</td><td>Have we seen this item?</td><td>~9.6 bits per item at 1%</td><td>False “yes”, never a false “no”; worsens as it fills</td><td>OR-ing bit arrays of the same size</td></tr>
            <tr><td>Exact set or map</td><td>Any of the above</td><td>Grows with the data</td><td>None</td><td>Union, which needs all the data</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>When the approximate answer is the wrong one</h3>
      <p>A sketch belongs where the answer informs a decision and a small error does not change the decision: dashboards, trending lists, capacity planning, choosing what to cache. It does not belong where the number is a promise. Restaurant payouts are computed from exact order totals. “One first-order coupon per customer” is checked against an exact table. A customer’s order count shown on a loyalty badge is an exact count, because a customer who sees “9 orders” after her tenth will write to support.</p>
      <p>We also revisit sketches when the data is small. A restaurant with 50 viewers a day is better served by an exact set; Redis’s sparse HyperLogLog encoding is partly there to avoid paying 12 KB for small counts, but an exact answer is still easier to explain. And if the question moves from “roughly how many” to “exactly which”, for example a list of customers who viewed and did not order, no sketch can help, because sketches keep no members.</p>

      <Callout>Use a sketch when an answer must be live, combined across machines or time ranges, and accurate only to within a percent; price the exact answer first, because at moderate scale it is often affordable.</Callout>

      <p>The trending row has one more requirement: “near you”. Ranking dishes per city is easy because city is a column. Finding restaurants within delivery range of a customer, and riders within a few hundred metres of a restaurant, is not something any index we have met so far can do. The next chapter, on geospatial indexing, builds the structures for it.</p>

      <Notes items={[
        'Distinct counts from different machines cannot be added; HyperLogLog sketches can be merged, which is why they exist.',
        'HyperLogLog estimates distinct counts to about 0.81% in 12 KB regardless of size, by tracking leading zeros of hashes in 16,384 registers.',
        'Count-min overestimates by up to a fraction of the whole stream, so it finds heavy hitters well and says little about rare items.',
        'A Bloom filter’s “no” is certain and its “yes” is probable, so use it to skip work, never as the authority that something happened.',
        'A Bloom filter sized for last year’s volume degrades sharply; size for growth, rotate it, and alert on its fill ratio.',
        'Payouts, coupon limits and anything shown as a promise must be exact; sketches are for dashboards and decisions.',
      ]} />
    </>
  ),

  /* ── Geo ──────────────────────────────────────────────────── */
  geo: (
    <>
      <p>A geospatial index answers “what is near this point?” without measuring the distance to everything. Every practical version does it the same way: it divides the map into cells, gives each cell a value that an ordinary index can sort, fetches candidates from a few cells around the point, and only then measures exact distances on that short list. This chapter builds the two location queries Dabba depends on, and shows why they need different designs even though both are about nearness.</p>
      <p>The first query runs when a customer opens the app: which restaurants deliver to where I am standing? The restaurants barely move, and there are about 50,000 of them. The second runs when an order is ready to be picked up: which available riders are closest to this restaurant right now? The brief from the first chapter says about 50,000 riders online at the dinner peak, each reporting a location every 5 seconds. That is 10,000 location updates a second, and an answer that is 30 seconds old can send a rider who has already left.</p>

      <h3>Why an index on latitude and longitude does not work</h3>
      <p>The obvious approach stores latitude and longitude as columns, indexes them, and asks for rows within a box: latitude between a and b, longitude between c and d. A B-tree on latitude can find the rows in the latitude range quickly. It has no help to offer for the longitude condition, which is checked row by row on everything the first range returned.</p>
      <p>The trouble is how much the first range returns. A 5 km band around Bengaluru’s latitude, about 12.97° north, is a thin strip running across the whole country. Chennai sits at about 13.08° north, inside that strip. So the index on latitude hands back every rider in Bengaluru and every rider in Chennai, and the database then discards the Chennai ones by checking longitude. A composite index on (latitude, longitude) has the same problem, since it sorts first by latitude. B-trees order one dimension; nearness on a map needs two.</p>
      <p>The fix every geospatial index uses is to map two dimensions onto one ordering in which nearby points mostly get nearby values. Then a normal sorted index can find them.</p>

      <h3>Geohash: cells with names that sort</h3>
      <p>A geohash is built by repeatedly halving the world. The first bit says whether the point is in the eastern or western half of the longitude range; the next bit halves the latitude range; the next halves longitude again, and so on, alternating. The bits are then written five at a time as base-32 characters. Each character adds five more halvings, so each extra character makes the cell 32 times smaller in area.</p>
      <p>The useful sizes, near the equator: five characters give a cell about 4.9 km by 4.9 km; six characters, about 1.2 km by 0.6 km; seven characters, about 150 m by 150 m. Central Bengaluru sits in cells starting <code>tdr1</code>. Because of the way the bits are built, two points whose geohashes share a long prefix are in the same small cell, and so close together. A B-tree index on the geohash string turns “riders in this cell” into a prefix range scan, which any database does well.</p>
      <p>The reverse is not true, and the mistake that follows from it is the one to avoid.</p>

      <Predict q={<>A restaurant sits near the eastern edge of geohash cell <code>tdr1x</code>. To find riders nearby, the rider service scans for every rider whose geohash starts with <code>tdr1x</code>. There is an available rider 150 m away, just across the cell boundary. Does the query find that rider?</>}>
        <p>No. The cell to the east is <code>tdr38</code>. It shares only the prefix <code>tdr</code> with <code>tdr1x</code>, because the boundary between them is also a boundary between larger cells. A prefix scan on <code>tdr1x</code> finds riders inside that cell only, which here means one rider 3 km away on the far side.</p>
        <p>Points in the same cell are close, but close points are not always in the same cell. Every correct query therefore searches the point’s cell and its eight neighbours, then measures the real distance to each candidate and discards those outside the radius.</p>
      </Predict>
      <Fig caption="A restaurant near the edge of its geohash cell. The closest rider is in the neighbouring cell, whose name shares only “tdr”. Search the 3 × 3 block, then measure.">
        <GeohashNeighbours />
      </Fig>
      <p>Geohash cells have two other weaknesses worth knowing. They are rectangles whose width shrinks away from the equator, which matters little in most of India (Delhi at 28.6° north has cells about 10% narrower than Bengaluru’s) and a great deal in Oslo. And their size is fixed, while density is not: a six-character cell over Koramangala holds hundreds of restaurants, while the same size cell on the city’s edge holds none.</p>

      <h3>Other ways to cut the map</h3>
      <p>A quadtree handles uneven density directly. It starts with one square and splits any square holding more than some number of points, say 100, into four. Dense neighbourhoods end up with small squares and sparse ones with large ones, so every leaf holds a manageable list. It is a good structure for in-memory indexes of points that do not move much. For points that move constantly, splitting and merging squares as riders drive around becomes its own source of work.</p>
      <p>S2, from Google, projects the sphere onto the six faces of a cube and orders each face’s cells along a Hilbert curve, a path that visits every cell and keeps consecutive cells close together. Every cell, at every level from a face down to about a square centimetre, is a 64-bit integer. Its strength is covering arbitrary shapes: a delivery zone drawn as a polygon becomes a small set of cells of mixed sizes, and “is this point in the zone?” becomes a few integer range checks.</p>
      <p>H3, from Uber, uses hexagons. A hexagon’s six neighbours are all the same distance from its centre, where a square has four neighbours sharing edges and four more touching only at corners, further away. That makes H3 well suited to anything that spreads across neighbouring cells, like smoothing demand into nearby areas or computing rings of cells around a point. Useful sizes: resolution 7 cells are about 5 km² with edges of about 1.2 km; resolution 8, about 0.74 km² with edges of about 460 m; resolution 9, about 0.1 km² with edges of about 175 m. The price is that hexagons do not nest exactly: a parent hexagon’s seven children cover approximately, not exactly, the same area.</p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Structure</th><th>Good at</th><th>Weakness</th><th>Where Dabba uses it</th></tr>
          </thead>
          <tbody>
            <tr><td>Geohash</td><td>Fits any database with a string index; easy to debug</td><td>Edge effects, rectangular cells, fixed size regardless of density</td><td>Inside Redis GEO, which holds live rider locations</td></tr>
            <tr><td>Quadtree</td><td>Adapts to density</td><td>Restructuring cost when points move often</td><td>Not used; riders move too much</td></tr>
            <tr><td>S2</td><td>Covering polygons with few cells; 64-bit ids</td><td>Harder to reason about by eye</td><td>Delivery-zone polygons</td></tr>
            <tr><td>H3</td><td>Equal-distance neighbours, rings, aggregation</td><td>Inexact nesting between resolutions</td><td>Serviceability, demand heatmaps</td></tr>
            <tr><td>R-tree (PostGIS GiST)</td><td>Shapes and points in a database, exact queries</td><td>Heavy updates are expensive</td><td>Restaurant locations and zone edits</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>Restaurants: precompute the answer, because they barely move</h3>
      <p>Each restaurant has a location and a delivery area, usually a polygon drawn by the operations team that follows roads and avoids, say, a river with no bridge nearby. The question “which restaurants deliver here?” is a point-in-polygon test against every restaurant’s zone.</p>
      <p>PostGIS with a GiST index (an R-tree) can answer that directly, and for an admin tool it is the right choice. For the customer’s home screen, asked thousands of times a second, Dabba precomputes. Bengaluru covers about 740 km², roughly 1,000 H3 cells at resolution 8. For each cell, a batch job lists the restaurants whose delivery zone covers it. When a customer opens the app, we compute her cell, read one list, and filter by “open now”. One key lookup replaces a geometric query.</p>
      <p>The job reruns when a restaurant’s zone changes, which happens a few times a day across the whole country, and the change flows through the same CDC pipeline as everything else. The cost is that a cell is coarse: a customer at the very edge of a zone may see a restaurant that cannot quite reach her, or miss one that could. Dabba checks the exact polygon at checkout for the restaurant she has chosen, so the coarse list only decides what she browses.</p>

      <h3>Riders: the Redis index from the storage chapter, and what it needs next</h3>
      <p>Riders are the opposite case, and the storage chapter has already told the story of what happened when their locations lived in the orders database: 10,000 updates a second, each one a new row version, a spatial index full of dead entries, and order placement slowing down at dinner. The fix there was to keep each rider’s latest position in Redis with a geospatial index, and to send the history through a stream into an LSM or time-series store for disputes and payouts. This chapter starts from that design and looks at what it does and where it needs help.</p>
      <p>Redis’s geospatial commands are this chapter’s geohash idea, packaged. <code>GEOADD</code> stores a rider as a member of a sorted set whose score is a 52-bit interleaved geohash of the position, so updating a location overwrites one score in memory. <code>GEOSEARCH</code> with a radius works out which geohash ranges cover the circle, the centre cell and its neighbours, reads those ranges from the sorted set, and then filters the candidates by exact distance. That is the over-fetch-then-measure pattern from the prediction above, done for us.</p>
      <p>Dabba keeps one key per city and per state: <code>riders:avail:blr</code> holds only Bengaluru riders who are free. When a rider accepts an order, the dispatcher removes him from that key; when he delivers, he is added back. A rider in city traffic averages perhaps 20 km/h, about 28 m between 5-second updates, so each update is a single score overwrite. The search for an order then reads only free riders, without paging through busy ones.</p>
      <p>When an order is ready at a restaurant, the search goes like this:</p>
      <ol>
        <li><code>GEOSEARCH riders:avail:blr FROMLONLAT lng lat BYRADIUS 1 km ASC COUNT 30</code>: the closest free riders within a kilometre, already sorted by straight-line distance.</li>
        <li>If fewer than 10 come back, double the radius and repeat, up to a limit of a few kilometres.</li>
        <li>Drop any candidate whose last update is older than 20 seconds, four missed updates (the next section explains where that time comes from).</li>
        <li>Keep the closest 10 of those that remain.</li>
        <li>Ask the routing service for travel times for those 10 and offer the order to the best one.</li>
      </ol>
      <p>The last step matters because straight-line distance lies in a real city. A rider 400 m away on the other side of a flyover with no nearby ramp may be eight minutes away by road. Routing is expensive, so we spend it only on the short list the index produced. The pattern is the same throughout: a cheap coarse filter, then an exact measurement on what survives.</p>
      <p>Partitioning the rider index follows naturally. Here city is a good key, unlike for orders in the sharding chapter, because these queries never cross a city boundary. All 10,000 updates a second fit one Redis primary comfortably, and Bengaluru’s 30% share is about 3,000. Per-city keys mean a city can move to its own Redis node when it needs to, and a city that outgrows even that can split by zone, since a restaurant in the north of the city never needs a rider from the south. The cost from the storage chapter still applies: if a Redis node restarts, dispatch is blind for that city for about one update interval, 5 seconds, until riders report again.</p>

      <h3>Counting supply and demand per cell</h3>
      <p>The same cells serve a third purpose that is not a nearness query at all. Every minute, Dabba counts, for each resolution-8 cell, how many orders are waiting for a rider and how many riders are available. Where orders outnumber riders, the app shows longer delivery estimates, the delivery fee rises slightly, and the rider app shows a heatmap nudging free riders towards those cells.</p>
      <p>Raw per-cell counts are noisy. A cell with 3 waiting orders and no riders looks like a crisis, while the cell next door has 8 idle riders two minutes away. So the ratio for each cell is smoothed with its ring of neighbours, weighting the cell itself most and its six neighbours less. This is where hexagons earn their place: all six neighbours are the same distance away, so one weight fits all of them. With squares, the four edge neighbours and four corner neighbours sit at different distances and need different weights, and getting that wrong leaves visible diagonal artefacts in the heatmap.</p>
      <p>This is where Dabba’s geo design moves beyond the Redis index it started with. Redis GEO answers “who is near this point?” well; it has no notion of hexagonal cells or neighbour rings. The demand computation is an aggregate over the rider-location and order-events streams, keyed by H3 cell and recomputed every minute, so it belongs in a stream processor and not in the rider index. It is derived data in the sense of the derived-data chapter: if it is lost, the next minute rebuilds it.</p>

      <h3>Ghost riders: a walk-through</h3>
      <p>At 20:40 rider 4411 finishes a delivery in a basement car park and loses signal just as the app marks him free again. His last update put him near the entrance of a busy restaurant. He stays in <code>riders:avail:blr</code> at that position, looking like the ideal candidate for the next three orders from that restaurant.</p>
      <p>Each time, the dispatcher offers him the order and waits 30 seconds for an acceptance that never comes, then moves to the next candidate. Three customers each lose 30 seconds of preparation-to-pickup time, and the restaurant’s food sits on the counter. Worse, the dispatcher might mark him as declining orders, which affects his pay.</p>
      <p>The step-3 freshness check in the search above catches him after 20 seconds of silence, but it needs something Redis GEO does not have: a sorted-set member carries a position and nothing else, and Redis expires whole keys, not individual members. So Dabba keeps a companion sorted set, <code>riders:seen:blr</code>, scored by the time of each rider’s last update. The search reads it to filter candidates, and a sweep every few seconds uses <code>ZRANGEBYSCORE</code> to find riders silent for more than 20 seconds, removes them from the available set and marks them “unreachable”. Their next update adds them back. Without the sweep, the available set fills with ghosts and every search pays to read and discard them.</p>
      <p>The cost is visible to riders with poor networks. A rider whose phone drops a few updates in a row flickers out of the pool and misses offers. Dabba sets the threshold at four missed updates rather than two, and the rider app sends a lightweight heartbeat when location has not changed, so that standing still at a restaurant does not look like silence.</p>

      <h3>When this machinery is not needed</h3>
      <p>At launch, with 2,000 riders and 400 updates a second, the storage chapter’s first design, a PostGIS table in the main database, was adequate. Redis became necessary at tens of thousands of riders, and the companion freshness set and sweep are worth adding as soon as dispatch is automated. A small operation that assigns riders by hand from a map needs none of it.</p>
      <p>We would revisit the cell choices if the product changed shape. Batching two orders onto one rider makes the question “which rider is near both restaurants and both customers?”, a route problem rather than a nearest-point problem. And scheduled deliveries make it a question about where riders will be, not where they are.</p>

      <Callout>Every nearness query works the same way: turn the point into cells, fetch candidates from those cells and their neighbours, then measure exactly on the short list. Points that rarely move get precomputed answers; points that move every few seconds get an in-memory index and a way to forget the ones that fall silent.</Callout>

      <p>The rider search ends by offering order 8812 to rider 4411, and that order id has been passing through every chapter so far: in shard routing, in event keys, in index documents. The next chapter, on identity and unique IDs, asks where it comes from, and what an order id reveals to anyone who sees two of them.</p>

      <Notes items={[
        'A B-tree orders one dimension, so a latitude range for Bengaluru also returns Chennai; geospatial indexes map two dimensions onto one sortable value.',
        'Points sharing a geohash prefix are close, but close points can have very different geohashes; always search neighbouring cells, then measure.',
        'H3 hexagons give equal-distance neighbours and rings; S2 covers polygons well; quadtrees adapt to density but dislike moving points.',
        'Restaurants barely move, so Dabba precomputes which restaurants serve each cell and checks the exact polygon only at checkout.',
        'Redis GEO is the geohash method packaged; add per-city availability keys and a last-seen set with a sweep, because members cannot expire on their own.',
        'Straight-line distance filters candidates; road travel time, computed only for the short list, decides the assignment.',
      ]} />
    </>
  ),

  /* ── IDs ──────────────────────────────────────────────────── */
  ids: (
    <>
      <p>An ID scheme decides three things: who is allowed to create identifiers without asking anyone, what an identifier reveals to whoever sees it, and how new identifiers behave in an index. This chapter designs Dabba’s order id with all three in view, because once order ids are printed on receipts, stored in other teams’ tables and pasted into support chats, changing the scheme is a multi-year project.</p>
      <p>The trigger is the sharding chapter. Until now, order ids came from the one database’s auto-increment column. After the split, eight databases each have their own counter, and on the first evening two of them both issue order 48,213,007. The event log, the search index and the support tool all treat order id as unique, so the second order overwrites the first wherever they meet.</p>

      <h3>What an order id has to do</h3>
      <p>It helps to write the requirements down before comparing schemes, because each scheme is good at a different subset.</p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Requirement</th><th>Why Dabba needs it</th></tr>
          </thead>
          <tbody>
            <tr><td>Unique across all shards, without a network call per id</td><td>Placing an order should not depend on one more service being up</td></tr>
            <tr><td>Tells us which shard holds the order</td><td>The sharding chapter promised lookups by order id stay on one shard</td></tr>
            <tr><td>Roughly ordered by creation time</td><td>Index locality, and “newest first” lists without a separate sort</td></tr>
            <tr><td>Fits in 64 bits</td><td>It appears in every order, item, event and index row</td></tr>
            <tr><td>Does not reveal business volume</td><td>Competitors and journalists can place orders too</td></tr>
            <tr><td>Can be read over the phone</td><td>Support conversations start with “what is your order number?”</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>What auto-increment gets right, and what it leaks</h3>
      <p>The single-database counter was not a bad choice. It is compact, it is ordered by creation time, and new rows always go to the end of the primary-key index, which keeps inserts cheap. Its first problem is the one we hit: it needs one authority. There is a workaround, giving each database a different starting offset and a step equal to the number of databases (db-1 issues 1, 9, 17…, db-2 issues 2, 10, 18…). It works until we add a ninth database and have to change the step on every server without overlap.</p>
      <p>Its second problem existed all along. Sequential public ids reveal volume. Someone who places an order at 19:00 on Monday and gets #41,220,118, then orders at 19:00 on Tuesday and gets #42,210,407, has learned that Dabba took about 990,000 orders that day. Two orders a week is enough to chart Dabba’s growth more accurately than any analyst. This is the same reasoning the Allies used in the Second World War to estimate German tank production from the serial numbers on captured tanks.</p>
      <p>Sequential ids also invite enumeration. If the order page is <code>/orders/41220118</code>, someone will try <code>41220119</code>. Authorisation should stop them, but one missing check on one endpoint becomes a leak of every customer’s address. Guessable ids turn small authorisation bugs into large ones.</p>

      <h3>Random UUIDs and the index that stops fitting in memory</h3>
      <p>A version-4 UUID is 122 random bits plus a few fixed ones. Any server can create one without asking anyone, the chance of two colliding is negligible at any volume Dabba will see, and it reveals nothing. It is the obvious fix, and for many tables it is fine. For a high-volume, ever-growing table it has a cost that shows up months later.</p>

      <Predict q={<>The <code>order_events</code> table receives about 250 new rows a second at peak, one per status change, and its primary-key index is several times larger than the memory available to cache it. Index leaf pages are 8 KB and hold a few hundred keys each. How many different leaf pages does a second of inserts touch if keys are sequential? And if they are random UUIDs?</>}>
        <p>With sequential keys, every new key is larger than all existing ones, so it goes into the rightmost leaf page. A few hundred keys fill a page, so 250 inserts touch one or two pages a second, all of them already in memory.</p>
        <p>With random keys, each insert lands in a random leaf somewhere in the index. 250 inserts touch about 250 different pages. If only a fraction of the index fits in memory, most of those pages must first be read from disk, then written back dirty. Pages also split when a random insert lands in a full one, leaving both halves partly empty, so the index grows larger than the data requires. In Postgres there is one more cost: the first change to each page after a checkpoint writes the whole 8 KB page into the write-ahead log, so 250 scattered changes can produce a couple of megabytes of log a second where sequential inserts produce a fraction of that.</p>
      </Predict>
      <p>That answer is the reason time-ordered ids matter. They keep the working set of an insert-heavy index small: only the newest pages are hot, and older pages can stay on disk until someone reads an old order. In MySQL’s InnoDB the effect is stronger, because the table itself is stored in primary-key order and every secondary index stores a copy of the primary key: a random 16-byte key scatters the rows and doubles the key’s cost in every other index.</p>
      <p>Random UUIDs also fail two of our other requirements. They say nothing about which shard holds the order, and a 36-character string is not something anyone reads aloud to support.</p>

      <h3>Packing time, shard and sequence into 64 bits</h3>
      <p>Twitter’s Snowflake scheme showed how to get uniqueness and time order without coordination per id. A 64-bit id is split into fields: the time in milliseconds since a chosen epoch in the high bits, the id of the machine that made it in the middle, and a counter for ids made by that machine within the same millisecond in the low bits. Because time is in the high bits, ids sort by creation time. Because each machine has its own id, no two machines can produce the same value.</p>
      <p>Instagram adapted this for sharded Postgres by replacing the machine id with the logical shard number, and generating the id inside the shard’s database as part of the insert. Dabba copies that layout, because it uses the same 8,192 logical shards from the sharding chapter.</p>
      <Fig caption="Dabba’s 64-bit order id. The time bits keep the index appending at its right edge; the shard bits route any lookup by order id to one database.">
        <OrderIdLayout />
      </Fig>
      <p>41 bits of milliseconds covers about 69 years (2 to the power 41 milliseconds), so from a 2024 epoch the scheme lasts until the 2090s. 13 bits hold the logical shard, 0 to 8,191, numbered in the per-city blocks the sharding chapter chose. 10 bits allow 1,024 distinct values per millisecond per shard. Each logical shard sees about 122 orders a day (1 million ÷ 8,192), so the low bits are never close to running out.</p>
      <pre><code>{`id    = (ms_since_epoch << 23) | (logical_shard << 10) | low_bits
shard = (id >> 10) & 0x1FFF          -- 8,191: which logical shard
when  = (id >> 23) + EPOCH_MS        -- creation time, to the millisecond`}</code></pre>
      <p>The routing promise from the sharding chapter is now kept: given any order id, the application extracts the logical shard with a shift and a mask, looks up the physical database in its map, and goes straight there. No lookup table of order to shard is needed. And because the id is minted inside the shard’s own insert, there is no separate id service to keep available.</p>
      <p>What goes in the low 10 bits deserves its own question.</p>

      <Predict q={<>Instagram’s published version fills the low 10 bits with the shard’s sequence counter, modulo 1,024. Suppose Dabba does the same. A competitor places two orders from the same restaurant, one day apart, and decodes both ids. What can they learn?</>}>
        <p>Both orders come from the same restaurant, so they are in the same logical shard. The low bits are that shard’s counter modulo 1,024. The shard sees about 122 orders a day, so the counter wraps only about once a week and has not wrapped between two orders a day apart: the difference between the two low-bit values is the number of orders that shard took in a day.</p>
        <p>Multiply by 8,192 shards, and the competitor has Dabba’s daily volume again, the very leak we were trying to remove. The fix is to fill the low bits with random values instead of a counter. Two orders in the same shard in the same millisecond are already rare at 122 a day; when it happens, the chance that they also draw the same 10 random bits is 1 in 1,024, and the primary-key index rejects the second insert, which retries with fresh bits.</p>
      </Predict>
      <p>After that change, an order id reveals the time it was created, to the millisecond, and the logical shard of its restaurant, which, because of the city blocks from the sharding chapter, also says which city the order belongs to. Dabba decides all of this is acceptable: the customer knows when and where she ordered, and the shard number means nothing else outside our systems. That decision is worth writing down, because the next person to look at the layout will ask.</p>

      <h3>Where clocks break the scheme</h3>
      <p>Any id that contains time inherits the clock’s faults. Here is how that plays out. At 20:22 the virtual machine running db-5 is live-migrated to another host, and when it resumes, its clock is 2 seconds ahead. NTP notices and steps it back. For the next 2 seconds, db-5 mints order ids with timestamps earlier than ids it issued just before the correction.</p>
      <p>Uniqueness survives, thanks to the random low bits and the primary-key check. Ordering does not. The restaurant tablet app syncs by asking for “orders for this restaurant with id greater than the last id I saw”. A tablet that synced at 20:22:01, after receiving an id stamped 20:22:02 from the fast clock, now ignores any order stamped earlier, including the three placed during the correction window. Those three orders never ring. Nobody gets an error.</p>
      <p>Two changes fix it, at two levels. The generator stores the last millisecond it issued for each logical shard and uses the larger of that and the current clock. If the clock steps back, ids keep increasing and their time bits run slightly ahead of the wall clock until real time catches up. Twitter’s Snowflake chose differently: it refuses to issue ids until the clock passes the last value, which stalls inserts instead of skewing timestamps. Either choice is defensible; failing to choose is what causes the outage.</p>
      <p>The second change is in the tablet. Time-ordered ids are approximately ordered, and a sync protocol should not depend on approximate order. The tablet now syncs with a per-restaurant change sequence that the shard database increments in the same transaction as each order change. It costs one more column and one more index, and it is correct regardless of clocks.</p>
      <p>A dedicated id service using machine ids, rather than shard ids, has one more failure worth knowing. If two instances are started with the same machine id, perhaps from a copied configuration, they produce duplicate ids whenever they mint in the same millisecond with the same counter value. The usual protection is to lease machine ids from a coordination service such as etcd or ZooKeeper at start-up, with an expiry, so that no two running instances can hold the same one. Dabba avoids this by minting inside the shard, where the shard number is already unique.</p>

      <h3>Comparing the schemes</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Scheme</th><th>Coordination per id</th><th>Time ordered</th><th>Size</th><th>Finds the shard</th><th>Reveals</th></tr>
          </thead>
          <tbody>
            <tr><td>Auto-increment</td><td>One database</td><td>Yes</td><td>64 bits</td><td>No</td><td>Exact volume</td></tr>
            <tr><td>UUID v4</td><td>None</td><td>No</td><td>128 bits</td><td>No</td><td>Nothing</td></tr>
            <tr><td>UUID v7</td><td>None</td><td>Yes, to the millisecond</td><td>128 bits</td><td>No</td><td>Creation time</td></tr>
            <tr><td>Snowflake (machine id)</td><td>Machine id leased once</td><td>Yes</td><td>64 bits</td><td>No</td><td>Time; volume if the counter is exposed</td></tr>
            <tr><td>Dabba’s layout (shard id, random low bits)</td><td>None beyond the shard insert</td><td>Yes</td><td>64 bits</td><td>Yes</td><td>Creation time and logical shard</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>UUID version 7, standardised in RFC 9562, deserves a mention as the default for tables that do not need shard routing or 64-bit compactness. It puts a 48-bit millisecond timestamp in front of 74 random bits, so it sorts by time, needs no coordination at all, and can be generated by a client. Dabba uses it for the rider app’s offline events: a rider in a basement can record “picked up” with a UUIDv7 and upload it later, and the id is still unique and roughly ordered when it arrives.</p>

      <h3>The order id is not the retry key</h3>
      <p>One confusion is worth clearing up because it causes duplicate orders. The order id is minted by the server when the order row is inserted, so the client does not know it until the request succeeds. If the customer taps “Place order”, the request reaches the server, the order is created, and the response is lost on a weak connection, the app sees a timeout. It retries, and the server, seeing a new request, creates a second order with a new id. The customer is charged twice.</p>
      <p>The protection is a separate idempotency key: a random value (a UUID is fine) that the app generates when the customer first taps the button and sends with every retry of that same attempt. The order service stores the key with the order, under a unique index scoped to the customer. A retry with the same key finds the existing order and returns it instead of creating another. The chapter on getting writes right covers the pattern in detail; the point here is that it needs its own identifier. The order id answers “which order is this?”; the idempotency key answers “is this the same attempt as before?”, and only the client can create the second one, because only the client knows when it is retrying.</p>

      <h3>The id on the outside</h3>
      <p>A 64-bit id has two practical problems at the edges of the system. The first is JavaScript, which represents all numbers as 64-bit floating point and can store integers exactly only up to 2 to the power 53. Dabba’s ids pass that limit for any order created more than about 12 days after the epoch, since 2 to the power 53 divided by 2 to the power 23 is about a billion milliseconds. A web client that parses <code>7234567890123456789</code> as a number silently rounds it to a different order id and fetches the wrong order or none. The API therefore sends ids as strings, always.</p>
      <p>The second is people. Nineteen digits read over the phone go wrong. The app shows a short display code for each order, derived from the id, and support looks orders up by the customer’s phone number plus that code. The display code is unique only within one customer’s orders, which is all a support conversation needs.</p>

      <h3>When this is more than the problem needs</h3>
      <p>A product on one database does not need any of this inside its own walls. A <code>bigserial</code> primary key is compact, ordered and simple. The one thing worth doing from day one is to never expose it: give the outside world a separate random token for each order, so that the internal key can change later without breaking links, and so that volume does not leak while the company is small and the numbers are most sensitive.</p>
      <p>The city blocks matter again later. Because every order id carries a logical shard, and every logical shard belongs to exactly one city, any order id identifies its city without a lookup. The multi-region chapter relies on this when it homes each city in one region: routing an order lookup to the right region needs nothing but the id. We would revisit the layout if a single city’s orders ever had to be created in two regions at once, because clocks in different regions disagree by more than a millisecond and ids from the two would interleave imperfectly.</p>

      <Callout>Write down what each id must guarantee and what it may reveal before choosing a scheme; then design for the clock going backwards and for the low bits leaking more than intended, because those are where id schemes fail.</Callout>

      <p>Orders now have ids that route, sort and reveal only what we chose. The next thing every order screen needs is pictures: menus with dish photos, uploaded from restaurant owners’ phones. The next chapter, on blob storage, covers where those bytes live, how they get there without passing through our servers, and why resizing them is not optional.</p>

      <Notes items={[
        'Auto-increment needs a single authority and reveals exact volume to anyone who sees two ids a day apart.',
        'Random UUIDs scatter inserts across the whole index, so an insert-heavy table’s working set becomes the entire index.',
        'Dabba’s 64-bit id holds milliseconds, the logical shard and random low bits, so it sorts by time and routes to its shard.',
        'A counter in the low bits can leak per-shard volume; random bits with a retry on collision avoid it.',
        'A clock stepping back makes time-based ids go backwards; keep the last issued millisecond, and never build sync protocols on id order.',
        'Send 64-bit ids to clients as strings, because JavaScript numbers lose precision above 2 to the power 53.',
      ]} />
    </>
  ),

  /* ── Blob storage ─────────────────────────────────────────── */
  blob: (
    <>
      <p>Blob storage keeps large, opaque files, such as photos, videos and documents, in a system built for bytes, while the database keeps the facts about them: who uploaded what, for which dish, and whether it is ready to show. Getting a file feature right is mostly about keeping those two jobs apart and deciding how bytes travel between the phone, the store and the screen. This chapter does that for Dabba’s dish photos.</p>
      <p>The brief from the first chapter counts about 3 million dish photos across Dabba’s 50,000 restaurants, most taken on the owner’s phone and around 2 to 4 MB each as uploaded. A menu page shows 20 to 40 dish thumbnails, and every customer who opens a menu loads them. Those two facts, millions of large originals and an enormous number of small reads, decide almost everything below.</p>

      <h3>Why the bytes do not go in the database</h3>
      <p>Three million originals at an average of 2 MB is about 6 TB. The live orders database from the sharding chapter is about 360 GB. Putting photos in database rows would make the menu database many times larger than everything else Dabba stores, and every database job would get slower with it: backups would copy 6 TB, replicas would replay megabytes per upload, and the database’s memory cache would fill with image bytes that push out the menu rows it was meant to hold.</p>
      <p>Object storage, the service S3 made familiar, is built for exactly the opposite workload. Its interface is small on purpose: put a whole object at a key, get it, delete it, list keys by prefix. There are no partial updates and no transactions across objects. In exchange it stores many copies or erasure-coded fragments across separate facilities, scales without planning, and costs a small fraction of database storage per gigabyte. Since late 2020, S3 also returns the new object to any read that follows a successful write, which removes a class of upload bugs older designs had to work around.</p>
      <p>Facebook’s Haystack paper, linked at the end of this chapter, explains why even a normal filesystem struggles here. At billions of small files, the metadata, directory entries and per-file records, costs more disk reads than the photos themselves. Haystack packed many photos into large files and kept a small in-memory index from photo id to position, so that reading any photo took one disk seek. Object stores apply the same idea at larger scale, and we inherit it by not storing files ourselves.</p>
      <p>The database keeps one row per photo: dish id, storage key of the original, keys of the resized versions, status, uploader, and timestamps. That row is small, transactional and indexed, which is what databases are good at.</p>

      <h3>The upload path that keeps our servers out of the way</h3>
      <p>The first version usually sends the photo through the API: the app posts the image to Dabba’s server, which writes it to object storage. It works, and it puts the slowest part of the system in the most expensive place. A restaurant owner on a 4G connection with a 3 Mbps uplink takes about 10 seconds to send a 3.8 MB photo. For those 10 seconds an API server holds the connection and buffers the bytes, and an upload burst, for example a few thousand restaurants onboarding in the same week with 80 photos each, ties up API capacity that customers placing orders need.</p>
      <p>The standard alternative is the presigned URL. The API does not receive the photo; it gives the app permission to send it straight to object storage.</p>
      <Fig caption="A presigned upload. The API handles two small JSON calls and decides what may be uploaded where; the photo itself goes directly from the phone to object storage.">
        <PresignedUpload />
      </Fig>
      <ol>
        <li>The app asks the API: “I want to upload a photo for dish 5521.” The API checks that this user manages the restaurant that owns dish 5521.</li>
        <li>The API creates a photo row with status <code>pending</code>, chooses the storage key itself, for example <code>uploads/r88213/d5521/7f3c…e1.jpg</code> with a random part, and returns a URL signed with Dabba’s storage credentials. The signature covers that key, the HTTP method, and an expiry of ten minutes.</li>
        <li>The app sends the bytes directly to object storage using that URL. Storage checks the signature and accepts the upload. Dabba’s API never sees the bytes.</li>
        <li>Object storage emits an “object created” event, which goes onto a queue.</li>
        <li>An image worker picks it up, processes the photo, and updates the row to <code>ready</code>.</li>
      </ol>
      <p>Two details in step 2 matter for security. The server chooses the key, never the client, so a client cannot overwrite another restaurant’s photo by naming its key. And the signature should restrict what can be sent: with S3’s presigned POST policy, for instance, the API can require a content-type starting with <code>image/</code> and a size between 10 KB and 15 MB. Without a size limit, a leaked URL lets someone store a 5 GB file at Dabba’s expense for as long as the URL is valid.</p>
      <p>Content-type checks at upload are only a hint, because the client chooses what to declare. The worker in step 5 makes the real decision by decoding the file.</p>

      <h3>What the worker does before anyone sees the photo</h3>
      <p>The original upload is never what customers see. The image worker runs through a fixed list, and each step exists because something went wrong without it somewhere.</p>
      <p>It decodes the image with a proper library. A file that does not decode is rejected, whatever its declared type. This also catches files that are valid images with something else appended. It applies the orientation recorded by the phone’s camera, so that photos do not appear sideways, and then strips the metadata. Phone photos usually carry GPS coordinates of where they were taken, and a home-kitchen restaurant owner’s photos would otherwise publish her home address on every menu.</p>
      <p>It produces the four sizes the apps actually display, from a 160-pixel thumbnail up to a 1,080-pixel full view, encoded as WebP, which every Android version Dabba supports can show. It runs an automated content check and flags doubtful images for a person to review. It writes each derived image to object storage under a key that includes a hash of its content, then records those keys on the photo row and sets the status to <code>ready</code>.</p>
      <p>Every step must be safe to run twice. The queue delivers at least once, as in the streams chapter, and a worker killed halfway through will see the same upload again. Because derived keys come from the content hash, running twice writes the same objects to the same keys, and the status update is a simple “set to ready” that can be repeated.</p>

      <Predict q={<>The owner of restaurant 88213 replaces the photo of paneer tikka with a better one. The design stores the thumbnail at a fixed key, <code>dishes/5521/thumb-480.webp</code>, overwritten with the new image, and the CDN caches images for 30 days. What do customers see, and for how long?</>}>
        <p>Customers who load the menu through a CDN location that has the old thumbnail cached keep seeing the old photo for up to 30 days. Customers routed to a location without a cached copy see the new one. The owner checks on her phone, sees the new photo, and then gets a call from a regular asking why the photo has not changed.</p>
        <p>We could purge that key from the CDN on every replacement, which works but adds a purge call to every edit and depends on purges arriving everywhere. The simpler fix, and the reason earlier chapters gave photos content-hashed URLs, is never to overwrite: each new image gets a new key, derived from its content hash, and the menu points at the new key. Old keys can be cached forever because they never change, and a change is visible as soon as the menu data that references it is.</p>
      </Predict>

      <h3>Serving: the numbers that make resizing mandatory</h3>
      <p>The brief counts about 100 image loads per session, 400 million a day: about 4,600 a second on average, and about 17,000 a second in the dinner hour, which carries 15% of the day.</p>
      <p>Now the bytes. If the menu served the original 2 MB photos, 400 million requests would move about 800 terabytes a day, and customers on mobile data would wait several seconds per menu. Served as resized images of about 60 KB, the same requests move about 24 TB a day. That thirty-fold difference is why resizing is part of the design, not a later optimisation.</p>
      <p>Twenty-four terabytes a day still should not come from object storage directly. Data transfer out of a cloud provider is charged per gigabyte, typically at several times the monthly cost of storing that gigabyte, and object stores are not built for very low latency to phones in Patna. So images go through a CDN, as covered earlier in this pathway, with keys that never change and cache headers that say so: <code>Cache-Control: public, max-age=31536000, immutable</code>. With 3 million photos in four sizes and most views concentrated on popular restaurants, the CDN serves the large majority of requests from its edge, and object storage sees mainly the long tail.</p>
      <p>There is a second way to produce sizes: resize on demand. The app requests <code>/img/5521/w480.webp</code>; an image service at the CDN origin fetches the original, resizes it on the first request, and the CDN caches the result. That avoids generating sizes nobody requests and makes adding a new size a client change. Its cost is on the first request for each size, and on the image service, which now sits in the read path.</p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Approach</th><th>First view of a new photo</th><th>Adding a new size</th><th>What can fail</th><th>Fits when</th></tr>
          </thead>
          <tbody>
            <tr><td>Resize at upload</td><td>Fast; sizes already exist</td><td>A backfill job over every original</td><td>Worker backlog delays “ready”</td><td>A small, stable set of sizes</td></tr>
            <tr><td>Resize on demand behind the CDN</td><td>Slow once per size per CDN region</td><td>Change the URL in the app</td><td>Image service overload on a cold cache</td><td>Many sizes or frequent design changes</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>Dabba resizes at upload, because it has four sizes that change rarely, and because the worker’s other jobs, metadata stripping and content checks, have to happen before publication anyway.</p>

      <h3>Uploads that never finish: a walk-through</h3>
      <p>Here is a failure every upload system meets. An owner onboarding her restaurant at 15:00 uploads 80 photos on a patchy connection. Photo 37’s upload completes in object storage, but the app was designed to call the API with “upload done” afterwards, and that call fails when the connection drops. The app retries a few times and gives up. The photo row stays <code>pending</code>. The owner sees a spinner on dish 37, uploads the photo again, and that one works.</p>
      <p>Two things are now wrong, and neither raises an error. Dabba is storing an original that nothing refers to. And in a quieter variant, a row is marked pending forever for an object that does exist. Across a few thousand onboardings a month, this adds up to many gigabytes of orphaned originals and a support queue of “my photo is stuck”.</p>
      <p>The fix moves the source of truth for “upload finished” from the app to the store. The object-created event from step 4 above, not a client call, is what triggers the worker and moves the row along. A client that loses its connection after uploading does not matter, because storage has already reported the upload. For uploads that never complete at all, a lifecycle rule on the bucket deletes anything under the <code>uploads/</code> prefix after two days, since originals are copied to a permanent prefix only once processed. A nightly reconciliation job lists rows that have been <code>pending</code> for more than an hour and checks whether their object exists, fixing whichever side is wrong.</p>
      <p>The costs: an event queue between storage and the worker, a lifecycle rule someone has to understand before changing, and a reconciliation job. In exchange, a dropped connection on the owner’s side cannot leave Dabba’s data inconsistent.</p>

      <h3>Files that must stay private</h3>
      <p>Dish photos are public; anyone may see them, which is why a long-lived CDN cache is fine. Dabba also stores files that are not: the food safety licence and tax documents each restaurant uploads during onboarding, and the identity documents riders provide. These use the same upload path, into a separate bucket that allows no public reads at all.</p>
      <p>Reading them is the mirror image of uploading. When an operations reviewer opens a restaurant’s licence, the admin API checks that this reviewer may see it, records the access in an audit log, and returns a presigned GET URL for that one object, valid for a few minutes. The browser fetches the document directly from storage. The bytes never pass through the admin service, and the permission decision never leaves it.</p>
      <p>Two settings go with that. The URL’s expiry is short, because a presigned URL is a bearer credential: anyone who has it can use it until it expires, whether or not they are the reviewer. And responses for private objects are marked as not cacheable, so that no CDN or shared proxy keeps a copy that outlives the reviewer’s permission. The cost is that every view of a private document is a fresh fetch from storage, which is fine for a few thousand reviews a day and would not be for a public menu.</p>

      <h3>Deleting, and paying for what stays</h3>
      <p>When a restaurant leaves Dabba, its photos must go: the originals, every derived size, and the cached copies. Content-hash keys make deletion slightly harder than fixed keys, because we must look up every key the photo rows recorded rather than deleting by a prefix. Dabba therefore stores each restaurant’s derived images under a prefix that includes the restaurant id, so the deletion job can remove them by listing that prefix. CDN copies expire on their own, or are purged if the removal is urgent, for instance after a legal request.</p>
      <p>Storage cost has a second lever: storage classes. Originals are read once by the worker and then almost never, only when a new size is added. Moving them after 30 days to an infrequent-access class cuts their storage price substantially. Archive classes are cheaper still but charge to retrieve and can take hours, which would make a backfill of a new size slow and expensive. The class is a promise about how the data will be read, and we choose it from the access pattern, not from the price list alone.</p>

      <h3>When this design is more than the problem needs</h3>
      <p>Very small files with strict consistency needs can stay in the database. A delivery signature image of a few kilobytes, stored with the order it belongs to and backed up with it, is simpler there than split across two systems. The line is not exact, but once files are larger than a few hundred kilobytes, numerous, or served to the public, they belong in object storage.</p>
      <p>We would revisit the design when Dabba adds video, for example short clips of dishes. Video needs transcoding into several bitrates, segmenting for adaptive streaming, and range requests so players can seek. The upload path above still applies, but the worker becomes a pipeline, and the serving path is a different problem.</p>

      <Callout>Keep facts about files in the database and the bytes in object storage; let clients upload directly with narrowly signed URLs, let storage events drive processing, and give every derived file a key that never changes.</Callout>

      <p>Customers can now see the menu and the dishes. Once they order, they want to see something else: the rider, moving on a map, every few seconds. Until now the client has always asked and the server answered. The next chapter, on realtime delivery, covers what changes when the server has news first, and what it costs to keep a connection open to every customer waiting for dinner.</p>

      <Notes items={[
        'Three million originals are about 6 TB, far more than the live orders database; the database keeps one small row per photo and object storage keeps the bytes.',
        'A presigned URL lets the phone upload directly to storage; the server picks the key and the signature limits method, expiry, type and size.',
        'The worker decodes, rotates, strips location metadata, resizes and checks each upload, and must be safe to run twice.',
        'Serving 60 KB resized images instead of 2 MB originals turns about 800 TB a day into about 24 TB, and the CDN absorbs most of that.',
        'Derived images get new, content-based keys on every change, so they can be cached forever without purges.',
        'Let storage events, not client confirmations, mark uploads complete, and clean up abandoned uploads with lifecycle rules and reconciliation.',
      ]} />
    </>
  ),

  /* ── Realtime ─────────────────────────────────────────────── */
  realtime: (
    <>
      <p>Realtime delivery lets the server send news to a client as soon as it has it, instead of waiting to be asked. It is the right tool when updates arrive at unpredictable moments and the client needs them within a second or two. It also turns connections into state that the system must hold, route to and recover, which is where most of the design effort goes.</p>
      <p>Dabba has two screens that need it. The customer, once her order is picked up, watches the rider move towards her on a map. The restaurant tablet must ring within a second or two when a new order arrives, because a kitchen that notices an order three minutes late delivers cold food. This chapter works out what each needs, starting from the simplest design that could work.</p>

      <h3>How many people are watching, and how often things change</h3>
      <p>Little’s law gives the number of orders in flight at any moment: arrival rate times time in the system. In the dinner hour Dabba averages about 42 orders a second, and an order takes about 35 minutes from placement to delivery, so 42 × 2,100 ≈ 88,000 orders are in progress, the figure the brief carries. If about half of those customers have the app open at any moment, roughly 44,000 people are watching an order screen. Around 20,000 restaurant tablets are open at dinner.</p>
      <p>Things change at very different rates on those two screens. A rider’s location changes every 5 seconds, by the brief. An order’s status changes about six times over its whole life: placed, accepted, preparing, ready, picked up, delivered. A restaurant tablet sees a new order every few minutes on a busy night, and nothing for an hour on a quiet afternoon. Those rates, more than any technology preference, decide the design.</p>

      <h3>Polling is a reasonable first answer</h3>
      <p>The simplest design is for the customer’s app to ask “where is my rider?” every 5 seconds. 44,000 viewers polling every 5 seconds is 8,800 requests a second, the same figure the brief reached for all 88,000 orders polling every 10 seconds. Each request is small: the app already has a connection open, the request is authenticated with a token, and the answer comes from the Redis rider index described in the geo chapter. A few stateless API servers can handle that.</p>
      <p>The common objection, that polling wastes requests, does not apply much here. The location really does change every 5 seconds, so almost every poll returns something new. A push design would send about the same 8,800 messages a second. What push saves on the location screen is the request overhead and up to 5 seconds of delay, not the message count.</p>
      <p>Now change one variable: look at the restaurant tablet instead. It needs to know about a new order within about 2 seconds, so it would poll every 2 seconds. 20,000 tablets polling every 2 seconds is 10,000 requests a second, as much as the whole API was designed for, and at 42 orders a second spread across 20,000 restaurants each tablet sees a new order about every eight minutes. That is about 240 polls per order, so nearly every request returns “nothing new”. The same applies to order status on the customer’s screen: polling every 5 seconds to catch six changes in 35 minutes is about 420 polls for 6 useful answers.</p>
      <p>That is the real dividing line. Polling is efficient when data changes about as often as we ask. It is wasteful when changes are rare but must arrive quickly, because the poll interval has to be short for latency and almost every poll finds nothing.</p>

      <h3>The options, from simplest up</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Mechanism</th><th>How it works</th><th>Fits when</th><th>What it costs</th></tr>
          </thead>
          <tbody>
            <tr><td>Short polling</td><td>Ask every n seconds</td><td>Data changes about every n seconds, or a delay of n seconds is fine</td><td>Requests even when nothing changed</td></tr>
            <tr><td>Long polling</td><td>The server holds each request open until there is news or a timeout, then the client asks again</td><td>Rare updates, and networks that break other options</td><td>An open request per client; a new request after every message</td></tr>
            <tr><td>Server-sent events (SSE)</td><td>One HTTP response kept open; the server writes events into it</td><td>Server-to-client only; standard HTTP; reconnect built in</td><td>An open connection per client; one direction</td></tr>
            <tr><td>WebSocket</td><td>The HTTP connection is upgraded to a two-way channel of messages</td><td>Both sides send often, or the client must acknowledge</td><td>An open connection per client; more custom protocol to build</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>The customer’s order screen only receives. SSE suits it: it is ordinary HTTP, so proxies and load balancers handle it without special settings, and the browser’s <code>EventSource</code> reconnects automatically and tells the server the id of the last event it received. Native mobile apps use a small SSE client library to the same effect.</p>
      <p>The restaurant tablet is different because it must answer. When an order arrives the tablet rings until someone taps “accept”, and Dabba needs to know that the tablet received the order, separately from whether a person has accepted it. A tablet that shows nothing because its connection silently died is the failure that costs money. So the tablet uses a WebSocket and acknowledges each order message; if the acknowledgement does not arrive within 10 seconds, the server tries again, and after two minutes without acceptance an automated phone call goes to the restaurant.</p>
      <p>The rider app sends rather than receives. Its location updates go up as ordinary HTTP requests, batched when the network is poor: after a gap, the app sends the last few points in one request rather than one request per point. Sending location needs no persistent connection. Receiving does: when the dispatcher offers the rider an order, the offer has to reach the phone within a second or two and be accepted or declined, so the rider app also holds a WebSocket, used for offers and their replies rather than for location. Those rider connections, about 50,000 at peak, live on a separate pool of connection servers owned by dispatch, so the numbers below cover customers and tablets only.</p>

      <h3>Getting one rider’s location to the right connection</h3>
      <p>With 44,000 customers on SSE and 20,000 tablets on WebSockets, we have about 64,000 open connections. One idle connection costs a socket and some buffers, tens of kilobytes. A server built on an event loop handles tens of thousands of them, so Dabba runs four connection servers, about 16,000 connections each, with room to lose one.</p>
      <p>Now the routing problem. A location update for rider 4411 arrives at an ingest server. The customer waiting for rider 4411 is connected to one particular connection server, out of four. Which one? We could keep a table of “customer to server” and update it on every connect and disconnect, but that table would always be slightly wrong, because connections drop and move constantly.</p>
      <p>The usual answer is publish and subscribe. When the customer for order 8812 connects, her connection server looks up the order’s rider and subscribes to the topic <code>rider:4411</code> on a pub/sub system, such as Redis pub/sub or NATS. The ingest server publishes each update for rider 4411 to that topic and does not know or care who is listening. Every connection server subscribed to it receives the update and writes it to the connections that wanted it.</p>
      <Fig caption="Live location fan-out. Ingest publishes each rider’s location on that rider’s topic; whichever connection servers hold interested customers are subscribed, so nobody has to know where a customer is connected.">
        <LocationFanout />
      </Fig>
      <p>The subscription is the routing table, and it is maintained by the connection servers themselves as clients come and go. Ingest stays stateless. If the order is reassigned to another rider, the order-events log from the streams chapter carries that event, and the connection server moves the customer’s subscription from the old rider’s topic to the new one.</p>
      <p>Only riders with a customer watching need to be published at all. Of 10,000 location updates a second, the ones for riders on an active delivery with a watcher come to roughly the same 8,800 a second we estimated for polling. Pub/sub at that rate is comfortable for one Redis node, and it is easy to partition by rider id if it ever is not.</p>

      <Predict q={<>The customer’s phone goes through an underpass and loses its connection for 40 seconds. During that time, the rider sends 8 location updates, and the order’s status changes from “ready” to “picked up”. When the phone reconnects, what should the server send it?</>}>
        <p>For location, only the latest point. The 8 missed points describe where the rider was; the customer wants to know where he is. Replaying them would animate the rider racing along an old route. Location is state: the newest value replaces everything before it.</p>
        <p>For status, the change to “picked up” must not be lost. Status changes are events: each one matters, and the app shows a different screen for each. On reconnect the client sends the id of the last status event it saw, and the server sends everything after it. If the gap is too old for the server’s short buffer, the client fetches the current order state from the API and starts again from there.</p>
      </Predict>

      <h3>State and events need different reconnection rules</h3>
      <p>That answer separates two kinds of data that travel down the same connection, and treating them alike causes bugs in both directions.</p>
      <p>Location is state. The ingest service already writes each rider’s position to the Redis geo set from the storage chapter, and it publishes the same update. A reconnecting client is first sent the rider’s current position from Redis, then receives new updates from the topic. If updates pile up for a slow client, for example on a weak mobile connection, the connection server keeps only the newest one per rider and drops the rest. That is called conflation, and it is correct for state: a slow client gets fewer updates, not older ones.</p>
      <p>Order status is a sequence of events. Each status event carries a sequence number for its order. The connection server keeps the last few minutes of events per order, a small version of the log from the streams chapter. A reconnecting client sends its last sequence number, with SSE’s <code>Last-Event-ID</code> header doing this automatically, and the server replays what follows. Conflation would be wrong here: dropping “picked up” because “delivered” is newer loses a step the customer was entitled to see, and some steps, like “rider has arrived”, are the reason she has the app open.</p>
      <p>Behind both rules sits the API. The connection is an optimisation for timeliness; the order’s real state lives in the order shard and can always be fetched. A client that is unsure what it missed fetches the order and starts again. That keeps the realtime path simple: it never has to be the only way to learn something.</p>

      <h3>A deploy that disconnects everyone: a walk-through</h3>
      <p>The connection servers hold state, and that changes how they can be deployed. Here is what happens the first time someone deploys them like stateless API servers.</p>
      <p>At 19:45 a routine release restarts the four connection servers within two minutes. Each restart drops its 16,000 connections. Every client notices within a second and reconnects immediately. Each reconnect re-authenticates against the session service, which normally sees a few hundred logins a second and now receives tens of thousands. It slows down, reconnects time out, and clients retry immediately, adding more load. Pub/sub sees tens of thousands of subscribe requests in the same seconds. For several minutes customers see frozen maps and some tablets miss new orders, at the start of the dinner peak.</p>
      <p>Each part of the fix addresses one step of that sequence. Clients reconnect with exponential backoff and random jitter: each failed attempt doubles the wait, up to a cap, and the actual wait is a random value below it, so that 16,000 clients spread their reconnects over tens of seconds instead of one. The failure chapter later in the pathway covers retries in general; here the point is only that clients must not all retry at the same moment. The connection tier checks a signed access token locally, without calling the session service, so reconnecting costs CPU on the connection server rather than a database lookup. Deploys drain one server at a time: the server stops accepting new connections, then sends its clients a “please reconnect” message spread over a few minutes, and only restarts once they have moved to other servers. And connection servers are not deployed during the dinner peak.</p>
      <p>The costs are real. A full deploy of the connection tier now takes half an hour instead of two minutes. Signed tokens checked locally cannot be revoked instantly, so they are kept short-lived, around 15 minutes, and refreshed over the API. The connection servers also get their own release schedule, separate from the rest of the platform.</p>

      <h3>Balancing connections that last for hours</h3>
      <p>Load balancers were built for requests that last milliseconds. Spreading new requests evenly keeps servers evenly loaded, because old requests finish quickly. Connections that last an hour behave differently, and the difference shows up the first time we add a server.</p>
      <p>Say the connection tier is running hot at dinner and we add a fifth server. The load balancer starts sending it new connections, but the existing 64,000 stay where they are, because nothing makes them move. For the next hour the four old servers remain overloaded while the new one fills slowly with only the connections that happen to start. The same happens after a server crashes and returns: it comes back empty while its former clients have piled onto the others.</p>
      <p>Two measures help. The load balancer should route new connections to the server with the fewest open connections, not round-robin, so that the new server gets nearly all new arrivals until it catches up. And each server should cap its connections and, when it is well above the fleet average, ask a slice of its clients to reconnect, using the same gradual “please reconnect” message as a deploy. Connections then move a few hundred at a time, and no client notices more than a brief pause in updates. The cost is one more piece of logic in the connection tier and a metric, connections per server, that has to be watched as closely as CPU.</p>

      <h3>Connections die quietly</h3>
      <p>A connection that has broken does not always say so. A mobile network’s NAT, or a load balancer with an idle timeout (60 seconds is a common default), can drop a connection that has carried nothing for a while, and neither end learns about it until it tries to send. A tablet in a quiet restaurant at 16:00 could sit on a dead connection for an hour, believing it is online.</p>
      <p>Heartbeats prevent this. The server sends a small message every 20 to 25 seconds; in SSE a comment line, which clients ignore, is enough. That keeps idle timeouts from firing, and if the client sees no heartbeat for, say, 60 seconds, it knows the connection is dead and reconnects. For the tablet, Dabba also tracks the other direction: a tablet that has not acknowledged a heartbeat for a minute is shown as offline on the operations dashboard, and new orders for that restaurant trigger the phone call immediately instead of after two minutes.</p>
      <p>Finally, when the app is in the background, mobile operating systems close its connections to save battery. Then the only route left is a push notification through Apple’s or Google’s push services. Those are delivered on a best-effort basis and can be delayed or merged, so Dabba uses them to say “your rider has arrived” and to bring the app back to the foreground, never as the only record of an event. When the app opens, it fetches the order from the API.</p>

      <h3>When realtime is more than the problem needs</h3>
      <p>For the location map alone, polling every 5 seconds is a perfectly good design and the right first version: stateless, easy to cache, easy to deploy. Dabba would add SSE for customers only when the latency of status updates or the cost of 420 polls per order became a problem worth an always-on connection tier. The tablet, with its rare and urgent orders, is the case that justified building the connection tier first.</p>
      <p>We would revisit these choices if customers began interacting during delivery, for example live chat with the rider. Two-way traffic from customers would move them from SSE to WebSockets, and chat history would need the full event treatment, with sequence numbers, storage and delivery receipts.</p>

      <Callout>Choose polling or push from how often the data changes compared with how quickly the client needs it; then treat open connections as state, sending the latest value for state and replaying missed messages for events.</Callout>

      <p>Behind every screen in this chapter, work is happening that no customer is waiting for: the receipt email and SMS after an order, refunds, payouts calculated each night, photos waiting to be resized. The next chapter, “Background work: queues, schedulers and cron at scale”, picks that work up: how to answer the customer once the order is safely recorded and still make sure everything owed afterwards happens, on time and without doing it twice in a way that hurts.</p>

      <Notes items={[
        'By Little’s law, about 88,000 Dabba orders are in flight at the dinner peak, which sets the number of connections to plan for.',
        'Polling is efficient when data changes about as often as the client asks; it is wasteful for rare changes that must arrive quickly.',
        'Dabba uses SSE for customers, who only receive, and WebSockets with acknowledgements for restaurant tablets, which must confirm receipt.',
        'Publish and subscribe makes the subscription the routing table, so ingest never needs to know which server holds a customer.',
        'Location is state, so a reconnecting client gets the latest value; order status is a sequence of events, so it gets every missed one.',
        'A connection tier needs drained, jittered deploys, local token checks and heartbeats, or a routine restart becomes a reconnect storm.',
      ]} />
    </>
  ),
}
