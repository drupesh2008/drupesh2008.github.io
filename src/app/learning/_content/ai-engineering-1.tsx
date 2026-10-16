/**
 * AI Engineering pathway, part 1: ml-basics, ml-toolbox, deep-learning,
 * model, inference, prompting, context. Keyed by stage id; rendered one
 * per page by StageView.
 *
 * Running example for the whole pathway: a support assistant for a
 * stock-broking app. It answers customer questions from the help centre
 * and product docs, looks up an order's status, and can raise a ticket.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
import { ContextAssembly, PrefillDecode } from './ai-engineering-diagrams'
import {
  ThresholdSlide,
  TreeSplit,
  TinyNet,
  AttentionWeights,
  DecodeStepBudget,
  RetrievalPipeline,
} from './ai-engineering-1-diagrams'

export const sections: Record<string, ReactNode> = {
  /* ── 01 · Learning from data ─────────────────────────────────── */
  'ml-basics': (
    <>
      <p>
        This pathway follows one system from its first line of code to production: a support
        assistant for a stock-broking app. Customers ask it why an order was rejected, when a
        withdrawal will reach their bank, what a charge on their contract note means. It answers
        from the help centre and the product docs, it can look up the status of a specific order,
        and when it cannot help it raises a ticket for a human. By the end it will be a language
        model with retrieval, tools and evaluations around it. It does not start there.
      </p>
      <p>
        It starts with a triage desk. The support team receives about 30,000 messages a day, most
        of them between the market opening at 9:15 and a little after the close. Three people read
        each incoming message and drop it into a queue: order status, funds and withdrawals, account
        and KYC, charges, app or login trouble, and one queue that matters more than the rest, which
        the team calls “urgent: possible unauthorised activity”. A customer who writes “someone sold
        my shares, I did not do this” needs a human on the fraud desk within minutes, not in the
        afternoon batch.
      </p>
      <p>
        The team has two years of messages that agents already sorted by hand. This chapter uses
        them to build a model that does the sorting, and spends most of its length on the harder
        question: how we know whether that model is any good. Every later chapter, including the
        ones about language models, leans on the habits we form here.
      </p>

      <h3>Why rules stop working, and what replaces them</h3>
      <p>
        The obvious first attempt is a set of keyword rules. A message containing “withdraw” goes to
        funds. A message containing “not me” or “did not place” goes to the fraud queue. This works
        for a week. Then a customer writes “my order did not place, please check”, which is an order
        status question, and it lands on the fraud desk. Another writes “there is a sell order in my
        history I don’t recognise”, which contains none of the trigger phrases and goes to order
        status, where it waits four hours. Each fix adds a rule, each rule interacts with the
        others, and after a month nobody can say why a given message went where it did.
      </p>
      <p>
        Machine learning replaces the rules with examples. We give the computer messages
        (the <strong>features</strong>, here the words in each message) together with the queue an
        agent chose (the <strong>label</strong>), and ask it to find weights that reproduce those
        choices. For one yes-or-no question, “is this possible fraud?”, the simplest useful model is
        logistic regression. It gives each word a weight, adds up the weights of the words present,
        adds a constant called the bias, and squashes the total into a probability between 0 and 1
        with the sigmoid function, σ(z) = 1 / (1 + e<sup>−z</sup>).
      </p>
      <p>
        Take the message “someone sold my shares without my permission”. Suppose training has
        settled on weights of +0.4 for “sold”, +0.9 for “without”, +1.6 for “permission”, about zero
        for “my” and “shares”, and a bias of −2.5. The score is 0.4 + 0.9 + 1.6 − 2.5 = 0.4, and
        σ(0.4) is about 0.60. The model thinks this is more likely fraud than not. Notice that the
        bias is strongly negative: before reading any words, the model assumes a message is not
        fraud, which matches the fact that almost none are.
      </p>
      <p>
        Training is the search for those weights. We need a number that says how wrong the current
        weights are, called the <strong>loss</strong>. For probabilities the standard choice is log
        loss: if the true label is fraud, the loss is −ln(p); if not, −ln(1 − p). With p = 0.60 and a
        true label of fraud, the loss is 0.51. Had the agent labelled it “order status”, the loss
        would be −ln(0.40) = 0.92. Training nudges every weight in the direction that lowers the
        average loss across all labelled messages, thousands of times over. The deep learning
        chapter works through that nudge with numbers. For now, the important point is what the
        loss rewards: agreement with the labels on the messages it is shown. Nothing in it asks the
        model to be right about messages it has not seen.
      </p>

      <h3>A model is judged on messages it has never seen</h3>
      <p>
        That gap is the central problem of the field. A model with enough freedom can drive its
        training loss close to zero by memorising. Give logistic regression every token in the
        corpus as a feature, including account numbers and order ids, and it will learn that
        “ORD-88213” means fraud because the one message containing it was fraud. Training accuracy
        reaches 99%. On fresh messages that id never appears again, and the weight is useless or
        worse.
      </p>
      <p>
        So we hold data back. Of the 60,000 labelled messages we use, 42,000 go into
        the <strong>training</strong> set the weights are fitted on, 9,000 into
        a <strong>validation</strong> set we use to compare choices (which features, how much
        regularisation, which threshold), and 9,000 into a <strong>test</strong> set we look at once,
        at the end, to estimate how the model will do in production. The test set loses its value
        the moment we start making decisions based on it. If we try five feature sets and keep the
        one with the best test score, the test score is now a selected maximum, biased upward, and
        we have no honest estimate left.
      </p>
      <p>
        The two ways to fail have names. A model that does well on training data and noticeably
        worse on validation is <strong>overfitting</strong>: it learned details of the training
        messages that do not carry over. A model that does poorly on both
        is <strong>underfitting</strong>: it is too simple, or its features do not contain the
        signal. The cure for one makes the other worse. Adding features and freedom reduces
        underfitting and invites overfitting; removing them does the reverse. Plotting training and
        validation scores as we add more labelled data tells us which side we are on. If the two
        curves have already met and flattened, more data will not help and we need better features.
        If there is still a wide gap that is narrowing, more labels are worth paying for.
      </p>

      <Predict
        q={
          <>
            The team splits its 60,000 messages at random and the intent model scores 94% accuracy on
            the test portion. A colleague re-runs the experiment training on January to August and
            testing on September, and gets 88%. Which number belongs in the launch document, and
            where did six points go?
          </>
        }
      >
        <p>
          The September number. Production will always be predicting next month from last month,
          which is exactly what the time-based split simulates.
        </p>
        <p>
          The random split flattered the model in two ways. Customers who are upset write more than
          once: the same complaint arrives three times, lightly edited, and a random split puts one
          copy in training and another in test, so the model gets credit for recognising a message
          it has effectively seen. And topics drift. In September the app changed how margin from
          pledged shares is shown, and a new kind of question appeared that no training message
          covered. A random split mixes September messages into training and hides that drift. The
          fix is to split by time, and to keep all messages from one customer thread on the same side
          of the split.
        </p>
      </Predict>

      <h3>The feature that arrives after the answer</h3>
      <p>
        A month into the project, a new version of the fraud model scores 98% recall on validation,
        up from 80%. The team is pleased for about a day. Here is what happened, step by step,
        because this failure is common enough that every team meets it eventually.
      </p>
      <p>
        The training data came from an export of the support tool. Someone added a feature to make
        the export richer: the text of the first agent reply, joined onto each customer message. For
        fraud cases that reply almost always contains a phrase like “I have escalated this to our
        risk team” or “we have temporarily blocked your account”. The model found that phrase and
        leaned on it. On validation data, drawn from the same export, the reply was present, and the
        model looked brilliant.
      </p>
      <p>
        In production the model runs the moment a message arrives. No agent has replied yet. The
        feature is empty for every message, and the model, which had shifted weight from the
        customer’s words to the agent’s, now does worse than the old version. This is
        called <strong>leakage</strong>: the training data contains information that will not exist,
        or will not mean the same thing, at the moment the prediction is made. The tell is a jump in
        score that is too large for the change that caused it.
      </p>
      <p>
        The fix is a rule applied to every feature: write down when that value becomes known, and
        drop anything that becomes known after the prediction time. For the triage model the
        prediction time is “message received”, so the allowed features are the message text, the
        customer’s account state as of that moment, and their history before it. Doing this
        properly costs something. The team had to rebuild the export from event logs so that
        account state was taken as of the message timestamp rather than as of today, which took a
        week, and the honest recall went back to 80%. That 80% is the number production will see.
        The 98% was never available.
      </p>
      <p>
        Leakage has quieter forms. Computing the average message length over the whole dataset and
        using it to normalise every message lets test statistics into training, a small effect.
        Labelling messages with the queue they finally ended up in, rather than the queue the triage
        agent first chose, leaks the outcome of an investigation into the input. Each one follows
        the same pattern and yields to the same question.
      </p>

      <h3>Why accuracy is the wrong number for fraud</h3>
      <p>
        With leakage removed, we need a number that says whether the fraud model is useful. Accuracy,
        the share of messages labelled correctly, is the first one people reach for. In our 9,000
        test messages, 90 are genuine reports of unauthorised activity: 1%. A model that answers
        “not fraud” for every message is right 8,910 times out of 9,000. Its accuracy is 99.0%, and it
        never catches a single case.
      </p>
      <p>
        Now take the real model at a threshold of 0.5: it flags any message it scores above 0.5. It
        flags 150 messages, of which 72 are real fraud reports. It misses 18 real ones and raises 78
        false alarms. That is 96 errors, so its accuracy is 8,904 / 9,000 = 98.9%, lower than the
        model that does nothing. Accuracy ranks the useless model above the useful one, because with
        a rare class it is dominated by the easy majority.
      </p>
      <p>
        Two numbers describe the useful model properly. <strong>Precision</strong> asks: of the
        messages we flagged, how many were real? Here 72 / 150 = 48%. <strong>Recall</strong> asks:
        of the real cases, how many did we flag? Here 72 / 90 = 80%. Precision is what the fraud
        desk feels, since every false alarm costs an analyst a few minutes. Recall is what customers
        feel, since every miss is a compromised account that stays open while its holdings are
        sold. The do-nothing model has a recall of zero, and that one number exposes it.
      </p>

      <Fig caption="The two kinds of message get overlapping scores. A threshold decides how much of each side gets flagged; no threshold separates them perfectly.">
        <ThresholdSlide />
      </Fig>

      <h3>The threshold is a staffing decision</h3>
      <p>
        The model does not output “fraud” or “not fraud”. It outputs a score, and we choose where to
        draw the line. Moving the line changes precision and recall in opposite directions, and the
        right place for it depends on things outside the model. Scaling the test-set counts up to the
        real daily volume (30,000 messages, so multiply by 3.3) gives the following.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Threshold</th><th>Flagged per day</th><th>Real cases caught</th><th>Precision</th><th>Recall</th><th>Missed per day</th></tr>
          </thead>
          <tbody>
            <tr><td>0.8</td><td>≈200</td><td>≈170 of 300</td><td>85%</td><td>57%</td><td>≈130</td></tr>
            <tr><td>0.5</td><td>≈500</td><td>≈240 of 300</td><td>48%</td><td>80%</td><td>≈60</td></tr>
            <tr><td>0.2</td><td>≈1,330</td><td>≈287 of 300</td><td>21%</td><td>96%</td><td>≈13</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The fraud desk has four analysts. A careful review of a flagged message, which includes
        checking the account’s recent logins and orders, takes about three minutes, so each analyst
        can clear roughly 150 a day and the desk about 600. At 0.2 the desk receives more than twice
        what it can review, and a queue that never empties is worse than a smaller one, because
        real cases wait behind false alarms. At 0.8 the desk is comfortable and 130 genuine reports a
        day go to the ordinary queues. At 0.5 the desk is busy but keeps up.
      </p>
      <p>
        The team chose 0.5 and added a second tier: messages scoring between 0.2 and 0.5 go to the
        front of the general queue rather than to the fraud desk, so they are read within the hour.
        That decision can be written as a sentence another engineer can challenge: “We flag at 0.5
        because the desk can review 600 messages a day, and we route 0.2 to 0.5 to priority general
        support because a miss costs more than a fast read.” If the desk grows, or if the business
        decides an unreviewed fraud report is unacceptable at any volume, the threshold moves. The
        model stays the same.
      </p>
      <p>
        This only works if the scores mean something. A model is <strong>calibrated</strong> if,
        among messages it scores around 0.6, roughly 60% turn out to be fraud. Logistic regression
        tends to be reasonably calibrated out of the box; many other models are not, and their
        scores are only good for ranking. When a score feeds a decision directly, such as “freeze
        the account above 0.9”, check calibration on validation data by grouping messages by score
        and comparing each group’s average score with its actual fraud rate.
      </p>

      <h3>The number to beat comes first</h3>
      <p>
        Before training anything we should know what a trivial approach achieves, because a model
        is only worth its upkeep if it beats that by a margin. For the intent classifier the
        baselines are cheap to compute. Predicting the most common queue for every message (order
        status, 34% of traffic) is right 34% of the time. The old keyword rules, run over the
        September test month, are right 71% of the time. Logistic regression on word counts reaches
        88%. That 17-point gain over the rules is what pays for building, monitoring and retraining a
        model. Had it been two points, the honest recommendation would have been to tidy the rules.
      </p>
      <p>
        Baselines also catch bugs. If a sophisticated model scores below the keyword rules, the
        likeliest explanation is a mistake in the pipeline (labels shifted by one row, a feature
        computed on the wrong date) rather than a property of the model.
      </p>

      <h3>When a trained classifier is the wrong tool</h3>
      <p>
        Everything above assumes a stable set of categories and enough labelled examples. Both can
        fail. If the support team reorganises its queues every quarter, every reorganisation
        invalidates the labels, and a model that needs 40,000 fresh examples to retrain will always
        be behind. If a new category appears with only 200 examples, such as questions about a newly
        launched product, a classifier will do poorly on it for months.
      </p>
      <p>
        In those situations the later chapters offer alternatives: a language model can classify a
        message from a written description of each queue and a handful of examples, with no
        training at all. It costs more per message and is slower, and it must still be measured with
        the same split, metrics and thresholds as this chapter. A useful way to decide is to ask
        how often the categories change, how many labelled examples each category has, and what one
        prediction may cost. Stable categories, plenty of labels and a tight per-message budget point
        to a trained classifier. Shifting categories and thin labels point to a prompted model.
      </p>
      <p>
        What does not change is the discipline. Whatever produces the prediction, we split by time,
        check every input for leakage, choose metrics from the cost of each kind of error, and set
        thresholds from the capacity of the people downstream.
      </p>
      <p>
        The next chapter, <em>The classical toolbox</em>, stays with structured data. The team wants
        to predict, at the start of a conversation, whether it will end up needing a human agent.
        The inputs there are account fields rather than words, and the choice between a linear model
        and a tree ensemble starts to matter.
      </p>

      <Notes
        items={[
          'A model is trained to agree with labels it has seen; only held-out data tells you how it does on messages it has not.',
          'Split by time and by customer thread when production will predict the future from the past.',
          'For every feature, write down when its value becomes known, and drop anything known only after the prediction.',
          'With a 1% class, accuracy rewards a model that never fires; report precision and recall instead.',
          'The threshold is set by the cost of a miss and the capacity of the people who handle the flags, not by the model.',
          'Compute a trivial baseline first; the model’s value is its margin over that number.',
        ]}
      />
    </>
  ),

  /* ── 02 · The classical toolbox ──────────────────────────────── */
  'ml-toolbox': (
    <>
      <p>
        The previous chapter’s classifier read words. This chapter’s problem reads account fields.
        About 18% of the broking app’s support conversations end with a human agent taking over,
        usually after the customer has spent several minutes going back and forth with whatever
        automated help was available. The team wants to predict, when a conversation opens, whether
        it is likely to end that way, so that those customers can be offered a human early and the
        rest can be served by the assistant.
      </p>
      <p>
        At the moment a conversation opens, the system knows a good deal about the customer: how old
        the account is, whether a withdrawal is pending, how many orders were rejected today, whether
        derivatives trading is enabled, whether the market is open, how many times they contacted
        support in the last week, and which app version they are on. These are rows and columns, the
        kind of data most businesses have most of. On this kind of data, the models that win are
        usually not neural networks. This chapter explains why, by building the escalation predictor
        with a linear model and with trees and watching where each one fails.
      </p>

      <h3>Decide what “better” means before comparing models</h3>
      <p>
        We need one number to compare candidates, and it should reflect how the prediction will be
        used. The plan is to offer a human agent to the conversations the model ranks highest, and
        the agents can absorb about 10% of conversations this way. So the useful metric is precision
        in the top 10%: of the conversations the model ranks in its top tenth, how many really did
        escalate? A random ranking scores 18%, the base rate.
      </p>
      <p>
        We split by time as before, training on six months and validating on the seventh. Then we
        compute the baseline that needs no model at all. Support leads already have a rule of thumb:
        “a pending withdrawal during market hours means trouble”. Ranking conversations by that rule
        (and breaking ties at random) puts 41% escalations in the top tenth. Any model must beat 41%,
        and must beat it by enough to justify being a model.
      </p>

      <h3>What a linear model can see, and what it cannot</h3>
      <p>
        Logistic regression on these fields is the natural first model. It learns one weight per
        field, adds them up, and turns the total into a probability. On the validation month it
        reaches 52% precision in the top tenth, a real improvement on the rule.
      </p>
      <p>
        Its limits come from that weighted sum. Each field pushes the score up or down by an amount
        that does not depend on the other fields. That causes two specific problems with our data.
        First, a pending withdrawal matters a great deal during market hours, when customers want to
        move money before a trade, and much less at night, when they expect a delay. A linear model
        gives “withdrawal pending” one weight for both situations, so it underrates the first and
        overrates the second. Second, account age has a U-shaped relationship with escalation. Brand
        new accounts escalate often (they are confused by the KYC and funding steps), and so do very
        old accounts returning after years of dormancy (their bank details or nominee records are
        stale). Middle-aged accounts rarely do. A single weight on account age can express “older
        is better” or “older is worse” but not “both ends are worse”.
      </p>
      <p>
        We can fix both by hand. Adding a column that is 1 only when a withdrawal is pending during
        market hours lets the linear model weight that combination separately. Replacing account age
        with buckets (under 30 days, 30 days to 3 years, over 3 years) lets it give each bucket its
        own weight. This is <strong>feature engineering</strong>, and it is where knowledge of the
        domain enters a classical model. With those two columns added, logistic regression rises to
        56%. The cost is that someone had to know to add them, and every interaction we fail to think
        of stays invisible.
      </p>

      <h3>How a tree finds its first question</h3>
      <p>
        A decision tree learns the interactions instead of being told them. It works by asking
        yes-or-no questions about the fields, choosing at each step the question that best separates
        escalations from the rest. “Best” needs a number, and a common one is Gini impurity: for a
        group where a fraction p escalates, impurity is 1 − p² − (1 − p)². It is zero when the group is
        all one kind and highest when it is an even mix.
      </p>
      <p>
        Take a sample of 1,000 conversations, of which 180 escalated. Impurity is 1 − 0.18² − 0.82² =
        0.295. The tree considers splitting on “withdrawal pending”. Of the 200 conversations with a
        pending withdrawal, 110 escalated (55%), impurity 0.495. Of the 800 without, 70 escalated
        (8.75%), impurity 0.160. Weighting each side by its size, 0.2 × 0.495 + 0.8 × 0.160 = 0.227. The
        split lowers impurity by 0.068.
      </p>
      <p>
        It then considers “market open”. Of the 600 conversations during market hours, 140 escalated
        (23%), impurity 0.358. Of the 400 outside, 40 escalated (10%), impurity 0.180. The weighted
        total is 0.6 × 0.358 + 0.4 × 0.180 = 0.287, a drop of only 0.009. The tree asks about
        withdrawals first. Then, within the “withdrawal pending” branch, it repeats the search, and
        it may well find that “market open” is now the best question there, which is the interaction
        we had to hand-code for the linear model. The tree discovered it because it asks each
        question only of the conversations that reached that branch.
      </p>

      <Fig caption="A tree scores every candidate question by how much purer it leaves the two halves. Here the withdrawal question wins by a wide margin.">
        <TreeSplit />
      </Fig>

      <p>
        Left alone, a tree keeps splitting until each leaf holds a handful of conversations that all
        went the same way. A leaf that says “accounts on app version 5.1.3, opened in March, with
        exactly two rejected orders, escalate” is describing three customers, not a pattern. A single
        deep tree on our data reaches 70% top-tenth precision on training and 44% on validation, which
        is barely above the rule. Limiting depth helps, but a shallow tree misses detail. The
        standard answer is to use many trees.
      </p>

      <Predict
        q={
          <>
            A single tree is trained on six months of conversations. A second tree is trained on the
            same six months with 5% of rows dropped at random. Will the two trees ask the same first
            question? Will they agree on the last few levels?
          </>
        }
      >
        <p>
          The first question will almost certainly be the same. The withdrawal split beats its rivals
          by a wide margin, and dropping 5% of rows does not change that.
        </p>
        <p>
          The deep levels will differ a lot. Down there each branch holds a few dozen conversations,
          the best and second-best splits are separated by tiny amounts, and removing a few rows
          flips which one wins. Each different choice then changes everything beneath it. This
          instability is the overfitting in another form: the deep structure reflects which rows
          happened to be present. It is also the reason averaging many trees works, since the
          random parts disagree and cancel while the shared structure agrees and remains.
        </p>
      </Predict>

      <h3>Two ways to turn many trees into one prediction</h3>
      <p>
        A <strong>random forest</strong> trains a few hundred deep trees, each on a random resample of
        the rows and considering a random subset of fields at each split, and averages their
        predictions. Each tree overfits in its own way, the errors are partly independent, and the
        average is much steadier than any member. Forests need little tuning and are hard to break,
        which makes them a good second model to try. On our data a forest reaches 59%.
      </p>
      <p>
        <strong>Gradient boosting</strong> builds trees in sequence instead. The first tree is small,
        often only three to six levels deep, and makes rough predictions. The second tree is trained
        to predict the errors of the first: where the first said 0.30 for a conversation that did
        escalate, the second tree learns to push that one up. The third corrects what the first two
        still get wrong, and so on, for hundreds of rounds, each tree’s contribution shrunk by a
        learning rate so that no single tree dominates. Libraries such as XGBoost and LightGBM
        implement this efficiently. On our data, after tuning depth, learning rate and the number of
        rounds against the validation month, boosting reaches 61%.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Model</th><th>Top-10% precision</th><th>What it buys</th><th>What it costs</th></tr>
          </thead>
          <tbody>
            <tr><td>Support lead’s rule</td><td>41%</td><td>no training, fully explainable</td><td>one interaction, chosen by hand</td></tr>
            <tr><td>Logistic regression</td><td>52%, 56% with two crafted columns</td><td>fast, calibrated, weights are readable</td><td>interactions and curves must be hand-built</td></tr>
            <tr><td>Single deep tree</td><td>44%</td><td>finds interactions</td><td>memorises small branches, unstable</td></tr>
            <tr><td>Random forest</td><td>59%</td><td>stable, little tuning</td><td>hundreds of trees to serve, scores less calibrated</td></tr>
            <tr><td>Gradient boosting</td><td>61%</td><td>usually the most accurate on tables</td><td>more knobs, easier to overfit, needs early stopping</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The team shipped the boosted model, and the decision reads: “We use gradient boosting because
        it beats the rule by 20 points and logistic regression by 5, the extra serving cost is a few
        milliseconds per conversation, and we accept that its scores need calibrating before we use
        them as probabilities.” If the gap over logistic regression had been one point, the readable
        weights and simpler monitoring of the linear model would have won.
      </p>

      <h3>The encoding that leaked the answer</h3>
      <p>
        One feature deserves its own walk-through. The team noticed that some customers escalate
        almost every time and others never do, and wanted the model to know which kind it was
        talking to. A customer id has millions of possible values, far too many for a column each, so
        they used target encoding: replace each customer id with that customer’s historical
        escalation rate.
      </p>
      <p>
        The first version computed that rate over the whole dataset, then split by time. Top-tenth
        precision jumped from 61% to 78%. Here is why that number was false. For a customer with two
        conversations in the training period, one of which escalated, the encoded rate was 0.5, and
        that rate was computed using the very label the model was trying to predict. The model was
        partly reading its own answer. Worse, for customers whose conversations fell in the
        validation month, the rate included those validation conversations too.
      </p>
      <p>
        In production the encoded value can only use conversations that finished before the current
        one. The team rebuilt the feature so that, for each conversation, the rate was computed only
        from that customer’s earlier conversations, and new customers got the overall average.
        Precision settled at 64%: a real three-point gain over 61%, not the seventeen it had seemed.
        The fix cost a more complicated feature pipeline that has to compute the rate as of each
        timestamp, both in training and in serving, and the two implementations must stay identical
        or the model will see different numbers in production than it learned from. That last
        requirement, keeping training and serving features consistent, is a large part of why
        companies build feature stores.
      </p>

      <h3>Text is where linear models still win</h3>
      <p>
        It would be easy to conclude that boosting should replace logistic regression everywhere. The
        intent classifier from the previous chapter is a counterexample. There, each message becomes
        a vector with one column per word in a vocabulary of about 50,000, nearly all zeros. Trees
        split on one column at a time, and on such sparse data most splits isolate a handful of
        messages. A linear model, by contrast, can give a small weight to each of thousands of
        relevant words and add them up, which suits text well. Logistic regression on word counts
        weighted by how rare each word is across messages (TF-IDF) remains a strong, fast text
        baseline, and boosting on the same columns usually does not beat it by enough to matter.
      </p>
      <p>
        The same sparse vectors show a weakness that will matter later. Compare two messages by the
        words they share and “withdrawal still pending” has nothing in common with “money not
        credited to my bank”, even though an agent would file both in the same queue. Methods that
        work by distance, such as k-nearest neighbours, which labels a message by the labels of its
        closest training messages, suffer most. In 50,000 dimensions where almost every coordinate is
        zero, nearly every pair of short messages is about equally far apart, so “nearest” carries
        little meaning. The fix is not a better classifier but a better representation, one in which
        messages with similar meaning sit close together. Building that representation is what the
        next chapter’s networks do.
      </p>

      <h3>Finding the queue nobody has labelled yet</h3>
      <p>
        Everything so far needed labels. One problem the triage desk had did not come with any. The
        “other” queue had grown from 4% of messages to 9% over three months, and nobody knew why.
        Reading a few hundred by hand suggested several different things were going on, but not how
        many or how large each was.
      </p>
      <p>
        Clustering finds groups without labels. k-means, the most common method, takes a number of
        groups k, places k centre points, assigns every message to its nearest centre, moves each
        centre to the average of its messages, and repeats until assignments stop changing. Run on
        the “other” messages, represented as TF-IDF vectors, with k = 8, it produced one large
        cluster that was plainly about a newly launched feature for pledging shares as margin. Word
        vectors are a weak way to measure meaning, as a later section explains, but this topic had
        distinctive vocabulary (“pledge”, “unpledge”, “collateral”) and that was enough. The feature
        had no queue and no help article. That finding became a new queue, a new article and,
        a month later, a new label for the intent classifier.
      </p>
      <p>
        Two cautions came with it. k-means always returns k groups, whether or not the data has that
        many natural groups, so the clusters are a starting point for a person to read and name, not
        a result. And with numeric fields rather than words, it is sensitive to scale: cluster
        accounts on balance in rupees and number of logins, and the balance column, whose values run
        into lakhs, decides the clusters on its own unless every field is first rescaled to a
        comparable range. The output of clustering is a hypothesis, checked by reading examples from
        each group.
      </p>

      <h3>Two things the model cannot tell you</h3>
      <p>
        The boosted model reports feature importances, and the top one is “rejected orders today”.
        It is tempting to read this as a cause and conclude that reducing order rejections would
        reduce escalations. The importance says only that this field was useful for predicting
        escalation in this data. Rejections and escalations could both be driven by a third thing,
        such as volatile markets, and fixing rejections might change little. Questions about cause
        need experiments, not importances.
      </p>
      <p>
        The second is that the model describes the period it was trained on. App version was a
        strong feature, because version 5.2 shipped with a bug in the withdrawal screen and its users
        escalated heavily. When 5.2.1 fixed the bug, the model kept raising scores for anyone on a
        5.2 build, and kept offering human agents to customers who no longer needed them. Any field
        that reflects a temporary condition will eventually mislead. The defence is to monitor
        precision on recent conversations every week and retrain on a rolling window.
      </p>

      <h3>When to skip this toolbox</h3>
      <p>
        Classical models need structured inputs. When the signal lives in free text, images or
        audio, hand-built columns cannot capture it, and the next chapter’s methods are the way in.
        When there are only a few hundred labelled rows, a boosted model will overfit and a simple
        rule reviewed by a domain expert may be more reliable. And when the decision is rare and
        high-stakes, a model may be the wrong frame entirely: if the business requires a human to
        review every account freeze, a predictor only changes the order of the queue.
      </p>
      <p>
        For the large middle ground of tabular business problems with tens of thousands of rows or
        more, the order of work holds up well: compute the rule-of-thumb baseline, fit logistic
        regression with a few crafted columns, try a forest, try boosting, and ship the simplest one
        whose margin over the next simpler one pays for its extra complexity.
      </p>
      <p>
        <em>Deep learning fundamentals</em> picks up the paraphrase problem. The team wants a
        representation of support messages in which “funds not credited” and “withdrawal stuck”
        land near each other, and that means learning features rather than writing them.
      </p>

      <Notes
        items={[
          'Pick the comparison metric from how the prediction will be used, here precision in the top 10% that agents can absorb.',
          'A linear model weighs each field independently, so interactions and U-shaped effects must be built as columns by hand.',
          'A tree chooses each question by how much it purifies the two halves, and finds interactions by asking questions only within a branch.',
          'Forests average many unstable trees; boosting adds small trees that each correct the errors of the sum so far.',
          'Target encoding must use only history before each prediction, computed the same way in training and serving.',
          'Feature importance says a field was useful for prediction in this data, not that changing it would change the outcome.',
        ]}
      />
    </>
  ),

  /* ── 03 · Deep learning fundamentals ─────────────────────────── */
  'deep-learning': (
    <>
      <p>
        The intent classifier from the first chapter is right 88% of the time. When the team reads
        through a sample of its mistakes, about a third share a cause. “Funds not credited”, “the
        money from my sale is stuck” and “paise abhi tak bank mein nahi aaye” all belong in the
        withdrawals queue, and they share almost no words. A model that sees each message as a set of
        word counts has no way to know that “credited”, “stuck” and “nahi aaye” are doing the same
        job.
      </p>
      <p>
        We could keep adding synonyms by hand, but the list never ends, and customers write in three
        languages and several spellings of each. What we want is for the model to learn its own
        features: a representation of each message in which messages that mean the same thing end up
        close together. Neural networks do this. This chapter builds one from the logistic
        regression we already have, works through how it learns with real numbers, and covers the
        ways training goes wrong. By the end, the transformer in the next chapter should look like
        an arrangement of parts you have already seen.
      </p>

      <h3>Logistic regression is a network with one neuron</h3>
      <p>
        Recall the fraud model: multiply each input by a weight, add the results and a bias, pass the
        total through the sigmoid. That is exactly one artificial neuron. A neural network puts
        several of these side by side in a layer, feeds their outputs into another layer, and so on.
        The units in the middle layers are called hidden units, and their outputs are features the
        network invents for itself.
      </p>
      <p>
        Between layers we need a nonlinear function. The usual choice is ReLU, which returns its
        input if positive and zero otherwise. Without it, stacking adds nothing. If one layer
        multiplies its input by 2 and the next multiplies by 3, the pair multiplies by 6, which a
        single layer could have done. The same holds for matrices: two linear layers
        W<sub>2</sub>(W<sub>1</sub>x) collapse into one, (W<sub>2</sub>W<sub>1</sub>)x, however many
        we stack.
      </p>
      <p>
        ReLU breaks the collapse, and a small case shows what that buys. Take two inputs from the
        escalation problem, “withdrawal pending” and “market open”, each 0 or 1. A hidden unit with
        weights of 1 on each and a bias of −1 computes ReLU(w + m − 1). It outputs 1 when both are 1
        and 0 in every other case. That unit has learned an AND, the interaction we had to hand-code
        as a column for the linear model in the previous chapter. A layer of 64 such units can learn
        64 different combinations, and the next layer can combine those. Nobody specifies what each
        unit should detect. Training finds whatever combinations reduce the loss.
      </p>

      <h3>Gradient descent, one step at a time</h3>
      <p>
        Training means adjusting weights to lower the loss. The <strong>gradient</strong> tells us,
        for each weight, how much the loss would change if we nudged that weight up a little. We
        move each weight a small step in the opposite direction, and repeat.
      </p>
      <p>
        Here is a single example worked through. The fraud model has one input, x = 1 (the message
        contains “unauthorised”), one weight w and a bias b, both starting at 0. The label is y = 1.
        The prediction is σ(0) = 0.5, and the log loss is −ln(0.5) = 0.693. For logistic regression
        with log loss, the gradient with respect to w has a tidy form: (p − y) × x = (0.5 − 1) × 1 =
        −0.5. The gradient for b is p − y, also −0.5. We choose a learning rate of 0.5 and update:
        w becomes 0 − 0.5 × (−0.5) = 0.25, and b becomes 0.25 as well.
      </p>
      <p>
        Run the example again. Now z = 0.25 + 0.25 = 0.5, p = σ(0.5) = 0.622, and the loss has fallen
        to 0.474. The gradient is 0.622 − 1 = −0.378, so both parameters grow by 0.5 × 0.378 = 0.189,
        to 0.439. Next time z = 0.878, p = 0.706, loss 0.348. Each step moves the prediction toward
        the label, and each step is smaller than the last because the error shrinks. With 42,000
        messages, we compute this gradient for a <strong>minibatch</strong> of, say, 64 messages at a
        time, average them, and step. One pass over all the training data is called an epoch.
      </p>
      <p>
        The learning rate is the knob that most often decides whether training works. To see why,
        drop the classifier and take the simplest possible loss: L(w) = (w − 3)², which is lowest at
        w = 3. Its gradient is 2(w − 3). Start at w = 0. With a learning rate of 0.1, the first step
        moves w by −0.1 × (−6) = 0.6, the next brings it to 1.08, then 1.46, approaching 3 a bit
        more slowly each time.
      </p>

      <Predict
        q={
          <>
            Same loss, same start at w = 0, but now the learning rate is 1.1. Where is w after two
            steps, and does it ever reach 3?
          </>
        }
      >
        <p>
          The first step moves w by −1.1 × (−6) = 6.6. It has jumped past 3 to 6.6, now 3.6 away on
          the other side. The gradient there is 2 × 3.6 = 7.2, so the second step moves it by −7.92,
          to −1.32, which is 4.32 away.
        </p>
        <p>
          Each step multiplies the distance from 3 by 1 − 2 × 1.1 = −1.2. The sign flips (it bounces
          from side to side) and the size grows by 20%. It never arrives; it diverges. Any learning
          rate above 1.0 does this for this loss. In a real network the symptom is a loss that
          suddenly jumps, or becomes NaN, a few hundred steps into training. Too small a rate fails
          more quietly: the loss falls so slowly that training appears stuck.
        </p>
      </Predict>

      <p>
        Real networks have millions of weights, and the right step size differs between them. Adam,
        the optimiser most networks use, keeps a running average of each weight’s recent gradients
        and of their squared size, and scales each weight’s step accordingly, so that weights with
        consistently large gradients take careful steps and rarely-updated ones take bolder ones. It
        is common to start with a very small learning rate for the first few hundred steps
        (warmup), while those running averages are still noisy, and to decay it toward the end of
        training.
      </p>

      <h3>Backpropagation is the chain rule with good bookkeeping</h3>
      <p>
        With one layer, the gradient formula is short. With several layers, a weight early in the
        network affects the loss only through everything after it. Backpropagation computes all the
        gradients in one backward sweep using the chain rule from calculus: the effect of a weight on
        the loss is the product of the effects along the path from that weight to the loss.
      </p>
      <p>
        Take the smallest network with a hidden layer. Input x = 1 goes through weight w<sub>1</sub>
        = 0.5 into a ReLU unit, giving h = 0.5. That goes through w<sub>2</sub> = 1.0 to the output,
        so z = 0.5 and p = σ(0.5) = 0.622. The label is 1, and the loss is 0.474.
      </p>

      <Fig caption="Values flow forward along the top. Gradients flow backward along the bottom, each one the previous gradient times the local slope.">
        <TinyNet />
      </Fig>

      <p>
        Going backward, the gradient of the loss with respect to z is p − y = −0.378, as before. The
        gradient for w<sub>2</sub> is that times the value w<sub>2</sub> multiplied, which was h: −0.378
        × 0.5 = −0.189. To keep going backward, we need the gradient with respect to h, which is −0.378
        × w<sub>2</sub> = −0.378. ReLU passes the gradient through unchanged when its input was
        positive, and its input w<sub>1</sub>x = 0.5 was. Finally, the gradient for w<sub>1</sub> is
        −0.378 × x = −0.378. With a learning rate of 0.5, w<sub>1</sub> rises to 0.689 and
        w<sub>2</sub> to 1.095. Running forward again gives h = 0.689, z = 0.754, p = 0.680, and a loss
        of 0.386, down from 0.474.
      </p>
      <p>
        One detail in that calculation explains a common failure. Had w<sub>1</sub> been −0.5, the
        ReLU input would have been negative, its output zero, and the gradient passed back through it
        zero. The unit would learn nothing from this example. If a large update pushes a unit’s weights
        so that its input is negative for every training example, it never receives a gradient again
        and stays switched off for good. A network that has lost many units this way has less
        capacity than its size suggests. Too high a learning rate is the usual cause.
      </p>
      <p>
        Backpropagation also explains why training needs much more memory than prediction. To
        compute the backward sweep, every intermediate value from the forward pass (every h, every z)
        must be kept until its gradient has been used, and the optimiser keeps its running averages
        for each weight as well. Prediction only needs the weights and the current layer’s values.
      </p>

      <h3>Embeddings are features the network writes for itself</h3>
      <p>
        Words are not numbers, so the first layer of a text network is a lookup table. Each token in
        the vocabulary gets a row of, say, 128 numbers, called its <strong>embedding</strong>. A
        message becomes the list of its tokens’ rows, and for a simple classifier we average them into
        one 128-number vector and put a small network on top. At the start, the rows are random.
      </p>
      <p>
        Training changes them. When “credited” appears in a message labelled withdrawals, the
        gradient flows back into the row for “credited” and moves it in whatever direction makes the
        withdrawals output more likely. The same happens to “stuck” in its withdrawal messages and to
        “nahi aaye” in its. Because they are all being pushed toward the same output, they drift
        toward the same region of the space. Nobody told the network they were synonyms. Their
        similar effect on the label made them similar vectors.
      </p>
      <p>
        We measure that closeness with cosine similarity: the dot product of two vectors divided by
        the product of their lengths, which is 1 for vectors pointing the same way and near 0 for
        unrelated ones. In a toy three-number space, suppose “withdrawal” = (0.8, 0.1, 0.3), “funds” =
        (0.7, 0.2, 0.4) and “chart” = (0.1, 0.9, 0.0). The dot product of withdrawal and funds is 0.56
        + 0.02 + 0.12 = 0.70, their lengths are 0.860 and 0.831, and the cosine is 0.98. For withdrawal
        and chart, the dot product is 0.17 and the cosine 0.22. The retrieval chapter will run exactly
        this calculation over help-centre passages, with vectors of a thousand numbers instead of
        three.
      </p>
      <p>
        In practice the team did not learn embeddings from its 42,000 messages alone. Embedding
        models trained on very large amounts of text, by predicting words from their surroundings,
        already place “credited” near “deposited” and “received”, because those words appear in
        similar company. The team took a pretrained sentence-embedding model that handles
        Hindi-English mixed text, turned each message into a vector, and trained logistic regression
        on top. Accuracy rose from 88% to 92%, and most of the paraphrase errors disappeared. This
        pattern, a pretrained representation with a small trained layer on top, is how most teams
        should use deep learning on modest amounts of labelled data.
      </p>
      <p>
        Averaging token vectors has one obvious flaw. “Order executed but not showing” and “order
        showing but not executed” contain the same words, so they average to the same vector. The
        first is a display problem and goes to app support; the second means an order is stuck and
        goes to order status. Order matters, and averaging throws it away. The next chapter is about
        the architecture that keeps it.
      </p>

      <h3>Reading what the training curves say</h3>
      <p>
        Before the team settled on pretrained embeddings, an engineer trained a network from scratch
        for 20 epochs and logged training and validation loss after each one. Here is what went
        wrong, because it is the most common story in the field.
      </p>
      <p>
        Both losses fell for the first four epochs. From epoch five, training loss kept falling while
        validation loss rose. The engineer saved the epoch-20 weights, since they had the lowest
        training loss, and reported validation accuracy from epoch 4, the best epoch. Production
        accuracy came in four points below the report. The network had spent sixteen epochs
        memorising training messages, and the shipped weights were the most overfitted of the run.
      </p>
      <p>
        The fix is <strong>early stopping</strong>: save weights after each epoch and keep the ones
        with the best validation loss, stopping once it has not improved for a few epochs. Two other
        tools slow overfitting so that the best epoch comes later and is better. Weight decay adds a
        small penalty for large weights. Dropout randomly zeroes a fraction of hidden units during each
        training step, so that no prediction can rely on any single unit. Each adds a setting to tune
        against validation data, and each makes a training run take longer to reach its best point.
      </p>
      <p>
        The second failure was quieter. The network’s validation loss looked healthy, but it never
        predicted the fraud intent. With 1% of examples in that class, the cheapest way to lower the
        average loss was to give fraud a tiny probability every time. Overall loss and accuracy hid
        this completely, and only per-class recall exposed it. The fix was to weight fraud examples
        more heavily in the loss, and then, because that weighting inflates fraud scores, to choose
        the threshold again from validation data as in the first chapter.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>What the curves show</th><th>Likely cause</th><th>First thing to try</th></tr>
          </thead>
          <tbody>
            <tr><td>Training falls, validation turns upward</td><td>overfitting</td><td>early stopping, then dropout or weight decay, then more data</td></tr>
            <tr><td>Both stay high and flat</td><td>learning rate too low, model too small, or a bug</td><td>raise the learning rate; check the model can fit one batch</td></tr>
            <tr><td>Loss jumps suddenly or becomes NaN</td><td>learning rate too high, exploding gradients</td><td>lower the rate, add warmup, clip gradient size</td></tr>
            <tr><td>Loss looks fine, one class never predicted</td><td>class imbalance</td><td>report recall per class, weight the rare class, re-pick the threshold</td></tr>
          </tbody>
        </table>
      </Tbl>
      <Callout>
        Before trusting a training run, check that the network can drive the loss close to zero on
        a single batch of 32 examples. A correct setup memorises that easily. If it cannot, the
        problem is a bug in the data or the code, and no amount of tuning will fix it.
      </Callout>

      <h3>Why deep networks needed extra parts</h3>
      <p>
        The backward sweep multiplies one local slope per layer. Through 30 layers, if each factor is
        around 0.8, the gradient reaching the first layer is 0.8<sup>30</sup>, about 0.001 of its
        original size, and the early layers barely learn. If each factor is around 1.2, it is
        1.2<sup>30</sup>, about 237 times larger, and training blows up. These are the vanishing and
        exploding gradient problems, and they kept networks shallow for years.
      </p>
      <p>
        Four parts fixed them, and every transformer uses all four. Careful initialisation sets the
        starting weights at a scale where signals neither shrink nor grow from layer to layer.
        Normalisation layers rescale each layer’s outputs to a steady range during training. Residual
        connections compute each layer’s output as its input plus a learned change, x + f(x), so
        that the gradient always has a path backward with a factor of exactly 1, however many layers
        there are. Dropout, as above, keeps the larger networks this allows from memorising. When you
        read the next chapter’s description of a transformer block, look for these four.
      </p>

      <h3>When not to train a network</h3>
      <p>
        The escalation predictor stayed a boosted tree model. On tables of account fields, networks
        rarely beat boosting, take longer to train, and are harder to explain to the compliance team.
        Training a text network from scratch on 42,000 messages was also the wrong call, as the
        overfitting story shows; the pretrained embedding with logistic regression on top was
        cheaper, faster to retrain and more accurate. A network trained from scratch earns its cost
        when there is a lot of labelled data, the inputs are raw text, images or audio, and nothing
        pretrained covers the domain. For a support team, that combination is rare.
      </p>
      <p>
        What the team does need is the vocabulary: weights, loss, gradients, learning rate,
        embeddings, overfitting. Every one of them reappears at a much larger scale in the language
        model that will power the assistant. The next chapter, <em>What the model actually does</em>,
        opens that model up: how text becomes tokens, how attention lets each token use the ones
        before it, and how a probability distribution becomes an answer to a customer.
      </p>

      <Notes
        items={[
          'Without a nonlinearity between them, any number of linear layers collapses into one.',
          'A gradient step moves each weight against its slope; too large a learning rate overshoots and diverges.',
          'Backpropagation multiplies local slopes backward along each path, and a ReLU that is off passes back nothing.',
          'Embeddings move toward each other when the tokens they represent push the output the same way.',
          'Keep the weights from the best validation epoch, not the last one, and check recall for every class.',
          'With modest labelled data, a pretrained embedding plus a small trained layer usually beats training from scratch.',
        ]}
      />
    </>
  ),

  /* ── 04 · What the model actually does ───────────────────────── */
  model: (
    <>
      <p>
        Classifying messages into queues helped the triage desk, but customers still waited for an
        agent to write the answer. The team now wants the assistant to write answers itself. A
        customer types “why was my order for 40 shares rejected at 3:28?” and the assistant should
        reply with a correct, specific explanation. For that the team will use a large language
        model, and this chapter explains what such a model computes when it produces that reply.
      </p>
      <p>
        There is a practical reason to understand the internals rather than treat the model as an
        API that returns text. Almost every behaviour the team will fight in later chapters (the
        confident wrong answer, the bill that grows with conversation length, the different reply to
        the same question, the order id it miscopies) follows directly from the mechanism. Knowing
        the mechanism tells us which problems to fix in the prompt, which in the surrounding code,
        and which cannot be fixed at all.
      </p>

      <h3>The only thing it outputs is a distribution over the next token</h3>
      <p>
        A language model takes a sequence of tokens and returns, for every token in its vocabulary,
        a probability that it comes next. That is its entire output. To write a reply, the
        surrounding software picks one token from that distribution, appends it to the sequence, and
        runs the model again on the longer sequence. A 200-token answer is 200 runs of the model,
        each one seeing everything before it, including the tokens it has just produced.
      </p>
      <p>
        The sequence it sees is assembled by our code. It contains the system prompt the team writes,
        any help-centre passages we retrieve, the conversation so far, and the customer’s latest
        message, all flattened into one list of tokens. The model has no other input. It does not
        know which customer this is, what time it is, or what the order book says, unless those
        facts appear somewhere in that list.
      </p>

      <Fig caption="Everything the model knows about this request is one sequence of tokens that our code assembled. What comes back is a probability for every possible next token.">
        <ContextAssembly />
      </Fig>

      <h3>Tokens are the unit everything is counted in</h3>
      <p>
        Models do not read characters or words. They read <strong>tokens</strong>, chunks of text
        drawn from a fixed vocabulary, commonly somewhere between 100,000 and 250,000 entries. The
        vocabulary is built before training by a procedure called byte-pair encoding: start with
        individual bytes, find the pair of adjacent symbols that occurs most often in a large sample
        of text, merge it into a new symbol, and repeat until the vocabulary is the desired size.
        Common words end up as single tokens. Rarer words are split into pieces.
      </p>
      <p>
        For English prose a token averages about four characters, or roughly three-quarters of a
        word, so a 900-word help article costs about 1,200 tokens. Other text costs more. Scripts that
        were less common in the tokenizer’s sample, such as Devanagari in many tokenizers, can take
        several times as many tokens for the same content. Identifiers fare worst of all. An order id
        like ORD-88213 or an ISIN like INE002A01018 is not a word the tokenizer knows, so it is cut
        into several fragments, and exactly where the cuts fall depends on the tokenizer.
      </p>
      <p>
        This has consequences the team will meet directly. Prices and context limits are counted in
        tokens, so a Hindi-speaking customer’s conversation can cost more than an English one with
        the same content. And the model never sees the individual digits of an order id as separate
        items, only the fragments. Asking it to check whether two long ids match digit by digit, or
        to count characters, is asking it to reason about something its input does not directly
        show. When the assistant needs to look up order ORD-88213, our code should extract the id
        and query the order system; the model should not be trusted to copy it perfectly from
        memory of an earlier turn without a check.
      </p>

      <h3>Attention is how each token gathers what it needs</h3>
      <p>
        Each token first becomes a vector by lookup in an embedding table, exactly as in the previous
        chapter, with a little extra information added to mark its position. The problem from that
        chapter was that averaging these vectors loses order and context. A transformer instead lets
        each position build a new vector by drawing on the positions before it, and it does this
        through <strong>attention</strong>.
      </p>
      <p>
        Take the sentence “The exchange rejected my order because it”, and consider the position for
        “it”. To predict what comes next, the model would do well to know what “it” refers to. In
        attention, every position produces three vectors from its current vector, each by
        multiplying with a learned matrix: a query (what this position is looking for), a key (what
        this position offers to others) and a value (what it will pass along if chosen). The query of
        “it” is compared with the key of every earlier position by a dot product, which gives a score
        for each.
      </p>
      <p>
        Suppose, with tiny four-number vectors, the scores come out as 2.0 for “order”, 1.0 for
        “exchange” and 0.5 for “rejected”, and near zero elsewhere. They are divided by the square
        root of the vector length, here 2, giving 1.0, 0.5 and 0.25. A softmax turns them into
        weights that sum to one: e<sup>1.0</sup> = 2.72, e<sup>0.5</sup> = 1.65 and e<sup>0.25</sup> =
        1.28, which sum to 5.65, so the weights are 0.48, 0.29 and 0.23. The new vector for “it” is the
        weighted sum of those three positions’ value vectors, nearly half of it drawn from “order”.
        The division by the square root matters: in real models the vectors have a hundred or more
        numbers, raw dot products get large, and without the scaling the softmax would put nearly
        all its weight on one position and pass back almost no gradient during training.
      </p>

      <Fig caption="The query for “it” scores each earlier token. The softmax weights decide how much of each token’s value flows into the new vector for “it”.">
        <AttentionWeights />
      </Fig>

      <p>
        Three details complete the picture. First, a mask stops each position from looking at later
        ones, so “it” cannot peek at the words after it. That is what allows the model to be trained
        on predicting every next token in a document at once. Second, a layer runs many attention
        computations in parallel, called heads, each with its own query, key and value matrices, so
        that one head can follow references while another tracks, say, which number is a quantity
        and which is a price. In trained models a few heads can be seen doing recognisable jobs like
        this; most are much less tidy. Third, nothing in the mechanism says which relationships
        matter. The matrices are learned, by the same gradient descent as before, from the single
        objective of predicting the next token.
      </p>

      <Predict
        q={
          <>
            A conversation’s prompt grows from 4,000 tokens to 8,000. In each attention head of each
            layer, how many more query-key comparisons does the model make?
          </>
        }
      >
        <p>
          Four times as many, not twice. Every position compares its query with every earlier
          position’s key, so the count grows with the square of the length. At 4,000 tokens there are
          about 8 million comparisons (half of 4,000 × 4,000, because of the mask); at 8,000 there are
          about 32 million.
        </p>
        <p>
          The rest of the model’s work, the per-position layers described next, grows only in
          proportion to length, so it doubles. For prompts of a few thousand tokens the proportional
          part still dominates the total; the squared part takes over as contexts grow into the tens
          and hundreds of thousands. The inference chapter turns this into seconds and money.
        </p>
      </Predict>

      <h3>What a transformer computes, from tokens to probabilities</h3>
      <p>
        A transformer is a stack of identical blocks, a few dozen of them in a typical model. Each
        position carries one vector through the whole stack, often called the residual stream. Each
        block reads that vector, computes a change, and adds the change back on, the residual
        connection from the previous chapter. Inside a block there are two steps. The attention step
        moves information between positions, as above. Then a feed-forward step, a small two-layer
        network with a nonlinearity in between, transforms each position’s vector on its own. Each
        step is preceded by a normalisation layer. Much of what the model “knows” in the sense of
        facts and associations appears to be stored in the weights of these feed-forward layers.
      </p>
      <p>
        After the last block, the vector at the final position is multiplied by one more matrix that
        produces a score, called a logit, for every token in the vocabulary. A softmax turns the
        logits into the probability distribution we started with. That is the full computation:
        look up embeddings, run a few dozen blocks of attention and feed-forward, project to the
        vocabulary, softmax.
      </p>
      <p>
        A useful rule of thumb follows. Producing one token takes about two arithmetic operations
        per parameter (one multiply and one add for each weight), plus the attention comparisons. A
        model with 8 billion parameters therefore does around 16 billion operations per token, and
        a 70-billion-parameter model around 140 billion. Those operations, and the memory needed to
        hold the weights they use, are what we pay for when we pay for inference.
      </p>
      <p>
        How the weights got their values matters too. The model was first trained on a very large
        amount of text to predict the next token, which gives it grammar, facts, styles and a broad
        sense of how documents continue. It was then trained further on examples of conversations in
        a fixed format, with markers separating a system message, user turns and assistant turns, and
        on human or model judgements of which replies are better. That second stage is why it answers
        a question instead of continuing it with more questions. Underneath, the chat format is still
        tokens: the role markers are special tokens in the same sequence. The fine-tuning chapter
        returns to this second stage.
      </p>

      <h3>Sampling turns probabilities into a reply</h3>
      <p>
        Suppose the assistant has written “Your order was rejected because of insufficient” and the
        model’s logits for the next token are 3.0 for “margin”, 2.5 for “funds”, 1.5 for “balance” and
        0.0 for “liquidity” (ignoring the long tail). A softmax gives probabilities of 0.53, 0.32, 0.12
        and 0.03. Something has to choose one.
      </p>
      <p>
        <strong>Temperature</strong> divides the logits before the softmax. At a temperature of 0.5
        they become 6, 5, 3 and 0, and the probabilities sharpen to 0.70, 0.26, 0.04 and 0.002. At
        2.0 they become 1.5, 1.25, 0.75 and 0, and the probabilities flatten to 0.40, 0.31, 0.19 and
        0.09. As the temperature approaches zero, the choice becomes always the top token. Top-p
        sampling adds a cut: keep the most likely tokens until their probabilities add up to p, and
        sample only among those. With p = 0.9 at temperature 1, “margin” and “funds” together reach
        0.85, adding “balance” reaches 0.97, so “liquidity” is excluded.
      </p>
      <p>
        For a support assistant that explains policies, we want low temperature: the most likely
        explanation, worded consistently. Higher temperature is for drafting marketing copy, not
        explaining why a margin call happened. But low temperature is not a guarantee of identical
        output. Many providers do not promise determinism even at temperature zero, because the
        floating-point arithmetic can differ slightly depending on how a request is batched with
        others on the same hardware, and a tiny difference in one logit can change which token wins a
        close race. Once one token differs, everything after it is conditioned on a different
        sequence. Tests that compare the assistant’s output to an expected string character by
        character will be flaky; the evaluation chapter deals with checking meaning instead.
      </p>

      <h3>Why the model answers confidently from the wrong year</h3>
      <p>
        Here is the failure that most shapes the rest of this pathway. In an early prototype the
        team sent customer questions to the model with only a short system prompt (“You are the
        support assistant for a stock-broking app. Answer helpfully.”). A customer asked, “I sold my
        shares this morning. When can I withdraw the money?”
      </p>
      <p>
        Walk through what the model has to work with. Its weights were fixed at training time, with
        a knowledge cutoff some months before deployment. The training text contained thousands of
        discussions of settlement and withdrawals, across many brokers, several countries and years
        of rule changes. The prompt contains nothing about this broker’s policy. So when the model
        reaches “You can withdraw the proceeds”, the distribution over the next tokens reflects
        whatever was common in that mixture. It produced “after two working days, once the trade
        settles”, fluently and without hedging.
      </p>
      <p>
        That answer described a settlement cycle the broker no longer used, and it ignored the
        broker’s own rule about when sale proceeds become available for withdrawal, which is in the
        help centre. Nothing inside the model flags that the continuation is uncertain or outdated.
        There is no lookup that failed and no error to catch. The model did the one thing it does,
        produce a likely continuation, and likely and true came apart. This is what
        “hallucination” means mechanically, and it is why the word is somewhat misleading: the model
        is not malfunctioning when it does this.
      </p>
      <p>
        The fix is to change the input, since the weights are fixed. The team retrieves the relevant
        help-centre article, places it in the prompt, and instructs the model to answer from the
        provided articles and to say it does not know, and offer to raise a ticket, when they do not
        cover the question. With the article present, the distribution after “You can withdraw the
        proceeds” is dominated by the article’s wording, because attention can draw on those tokens
        directly. The cost is real: about 1,000 to 3,000 more tokens per turn, a retrieval system to
        build and maintain, and a new failure mode when retrieval returns the wrong article. The
        context chapter is about paying that cost well. It also reduces rather than eliminates the
        risk; a model can still blend its prior with the article, which is why answers need checks.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>What we see</th><th>Mechanism</th><th>Where we deal with it</th></tr>
          </thead>
          <tbody>
            <tr><td>Outdated or invented policy, stated confidently</td><td>frozen weights; continuation of common patterns</td><td>put the source in context (context chapter)</td></tr>
            <tr><td>Miscopied order id or wrong character count</td><td>ids split into fragments; no character-level view</td><td>normalise ids in a structured field, then validate them in code before any lookup</td></tr>
            <tr><td>Different reply to the same question</td><td>sampling, plus batch-dependent arithmetic</td><td>low temperature, structured output, meaning-based evals</td></tr>
            <tr><td>Cost and delay grow with conversation length</td><td>every new token attends to every earlier one</td><td>context budgets (inference and context chapters)</td></tr>
            <tr><td>An instruction buried mid-prompt is ignored</td><td>attention spread across thousands of tokens</td><td>prompt structure and placement (prompting chapter)</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>How much of this you need day to day</h3>
      <p>
        Nobody on the assistant team will compute attention weights by hand at work. The point of
        knowing the mechanism is to classify problems quickly. If a failure comes from missing
        information, no amount of rewording the instructions will fix it; the information has to
        enter the context. If it comes from sampling, retries and constrained output help. If it
        comes from the cost of long sequences, the fix is in what we choose to include. A team that
        cannot make these distinctions tends to respond to every failure by editing the system prompt,
        and the prompt grows into a list of patches that interact in ways nobody can predict.
      </p>
      <p>
        There are also limits to what this picture explains. It tells us what the model computes, not
        why a particular model answers a particular question well or badly; that is an empirical
        question, settled by measuring on our own questions. And the details differ between model
        families (how positions are encoded, how many key-value heads there are, whether some layers
        route each token to a subset of specialised feed-forward networks). Those details change
        speed and cost more than they change behaviour, which brings us to the next chapter.
      </p>
      <p>
        <em>Serving and inference economics</em> takes the two numbers this chapter produced, the
        operations per token and the cost of attending to a long context, and turns them into what
        the business cares about: how long a customer waits for the first word of a reply, and what
        each support conversation costs.
      </p>

      <Notes
        items={[
          'A language model outputs one probability distribution over the next token; a reply is that step repeated, each time on a longer sequence.',
          'Prices, limits and some failures are about tokens, and identifiers split into fragments the model cannot inspect digit by digit.',
          'Attention lets each position take a weighted mix of earlier positions, and its cost grows with the square of the length.',
          'Producing one token costs roughly two operations per parameter, so model size sets the cost floor of every reply.',
          'Temperature reshapes the distribution; even at zero, identical outputs are not guaranteed.',
          'A confident wrong answer is the normal output of a model that lacks the facts; the fix is to put the facts in its context.',
        ]}
      />
    </>
  ),

  /* ── 05 · Serving and inference economics ────────────────────── */
  inference: (
    <>
      <p>
        The assistant went into a pilot with a few thousand customers. Two complaints arrived in the
        first week. Customers said the assistant “thinks for ages”: after sending a message they
        watched a spinner for five or six seconds before any reply appeared. And the finance team
        asked a question nobody had a ready answer for: if all 30,000 daily conversations went
        through the assistant, what would it cost per month?
      </p>
      <p>
        Both questions have the same root. The previous chapter showed that producing a reply means
        running the model once per output token, over a sequence that includes everything before.
        This chapter follows that work onto real hardware. We will work out where a reply’s seconds
        go, why the second half of generation is limited by memory rather than arithmetic, what the
        KV cache costs, how batching changes the numbers, and what one support conversation costs
        through an API. The numbers use a mid-sized open model and a current datacentre GPU so that
        every figure can be computed; the reasoning carries over to hosted models whose internals we
        cannot see.
      </p>

      <h3>A reply has two phases with different costs</h3>
      <p>
        The pilot’s typical turn sends about 6,000 tokens to the model: a 1,500-token system prompt,
        3,000 tokens of retrieved help-centre passages, 1,200 tokens of conversation history and a
        300-token question. The reply is about 250 tokens.
      </p>
      <p>
        Processing those 6,000 input tokens is called <strong>prefill</strong>. All 6,000 positions
        are known in advance, so the model processes them together, in one large parallel
        computation, and in doing so produces the first output token. The time until that first
        token appears is called time to first token, and prefill sets most of it.
      </p>
      <p>
        Then comes <strong>decode</strong>. Each subsequent token depends on the one before it, so
        they are produced one at a time, each step running the model for a single new position. The
        speed of this phase is measured in tokens per second per conversation. If the hosted model
        the pilot used decodes at about 60 tokens per second, 250 tokens take about four seconds.
      </p>

      <Fig caption="Prefill handles the whole prompt in one parallel pass and sets the time to the first token. Decode then adds one token per step, each step reading the cache built so far.">
        <PrefillDecode />
      </Fig>

      <p>
        The spinner complaint now has a precise explanation. The pilot waited for the complete reply
        before showing anything: about one second of prefill and queueing, then four seconds of
        decode, then display. Streaming the tokens to the screen as they are produced changes what
        the customer experiences without changing the work. The first words appear after about one
        second, and the rest arrive faster than most people read. Total generation time is the same,
        but the time the customer spends staring at nothing drops by about 80%. It was the cheapest
        fix in this chapter and the team shipped it first.
      </p>

      <h3>Decode is limited by memory, not arithmetic</h3>
      <p>
        To see why decode is slow, take a model with 8 billion parameters stored as 16-bit numbers.
        The weights occupy 16 GB. A GPU of the H100 class can perform on the order of 1,000 trillion
        16-bit operations per second and can read its own memory at about 3 TB per second.
      </p>
      <p>
        One decode step for one conversation needs about 16 billion operations (two per parameter,
        from the previous chapter). At 1,000 trillion per second, that is 16 microseconds of
        arithmetic. But to perform those operations the GPU must read every weight from memory into
        its compute units: 16 GB at 3 TB per second is about 5.3 milliseconds. The arithmetic units
        spend more than 99% of the step waiting for data. The step takes 5.3 milliseconds, so a single
        conversation can decode at most about 190 tokens per second on this hardware, however fast the
        arithmetic is. Real systems reach a fraction of that ceiling.
      </p>
      <p>
        Prefill is different. For a 6,000-token prompt, the weights are read once and used for all
        6,000 positions, so the arithmetic finally dominates: 6,000 × 16 billion = 96 trillion
        operations, about a tenth of a second at peak and perhaps a quarter of a second at realistic
        utilisation. Prefill is limited by compute, decode by memory bandwidth. That asymmetry is
        why API providers charge several times more per output token than per input token: an
        output token occupies the hardware for a whole memory-bound step, while an input token shares
        its step with thousands of others.
      </p>

      <h3>The KV cache, and what it costs</h3>
      <p>
        At every decode step, the new token’s query must be compared with the keys of every earlier
        token, and their values mixed in. Recomputing those keys and values from scratch each step
        would repeat the whole prefill for every output token. Instead, the server stores them as
        they are computed, in the <strong>KV cache</strong>, and each step only computes the new
        token’s keys and values and appends them.
      </p>
      <p>
        The cache is large. For each token, it holds a key and a value vector for every layer and
        every key-value head. A model shaped like common 8B open models has 32 layers, 8 key-value
        heads and 128 numbers per head, at 2 bytes each: 2 × 32 × 8 × 128 × 2 = 131,072 bytes, about
        131 KB per token. A 6,000-token conversation therefore carries about 0.79 GB of cache. On an
        80 GB GPU with 16 GB taken by weights, roughly 64 GB remains, enough for about 80 such
        conversations at once before anything else is accounted for. The cache, not the arithmetic,
        decides how many customers one GPU can serve concurrently.
      </p>
      <p>
        The 8 key-value heads in that calculation are themselves a cost-saving design. Earlier models
        gave every one of their 32 attention heads its own keys and values, which would make the
        cache four times larger and cut concurrency to about 20. Sharing each key-value head among
        several query heads, called grouped-query attention, was adopted largely for this reason.
      </p>

      <Predict
        q={
          <>
            The team considers retrieving more passages, which would take the typical prompt from
            6,000 to 12,000 tokens. On the self-hosted setup above, what happens to the number of
            concurrent conversations a GPU can hold, to time to first token, and to decode speed?
          </>
        }
      >
        <p>
          Concurrency roughly halves. Each conversation’s cache grows from 0.79 GB to about 1.57 GB,
          so the same 64 GB holds about 40 conversations instead of 80.
        </p>
        <p>
          Time to first token roughly doubles, and slightly more than doubles, because prefill work
          grows in proportion to length plus a squared attention term that is starting to matter.
          Decode slows too, but less: each step still reads 16 GB of weights, and now also reads twice
          as much cache per conversation. At batch size 1 the extra cache read is under 0.3
          milliseconds on a 5.3-millisecond step, barely noticeable. With many conversations batched
          together, as the next section shows, the cache read becomes the larger part of each step,
          and doubling it hurts.
        </p>
      </Predict>

      <h3>Batching trades one customer’s speed for everyone’s throughput</h3>
      <p>
        If each decode step is dominated by reading 16 GB of weights, the obvious move is to serve
        many conversations in the same step. Read the weights once and apply them to 32 conversations’
        new tokens. The arithmetic grows 32 times, from 16 microseconds to about half a millisecond,
        still small. The weight read stays 5.3 milliseconds. What does grow is the cache read, since
        each conversation’s attention must read its own cache.
      </p>
      <p>
        With 6,000-token conversations, batch 32 reads 32 × 0.79 = 25 GB of cache per step, about 8.4
        milliseconds, for a total step of about 13.7 milliseconds. Each conversation now decodes at
        about 73 tokens per second instead of 179, but the GPU produces about 2,340 tokens per second
        in total instead of 179. At batch 64 the step is about 22 milliseconds: 45 tokens per second
        each, about 2,900 in total. These are ceilings computed from bandwidth alone, and real servers
        reach perhaps half to three-quarters of them, but the shape holds.
      </p>

      <Fig caption="The weight read is paid once per step and shared by the batch; each conversation adds its own cache read. Bigger batches raise total throughput and slow each conversation.">
        <DecodeStepBudget />
      </Fig>

      <p>
        Serving software for open models, vLLM and SGLang being widely used examples, adds three
        things on top of this. Continuous batching lets a conversation join the batch at the next
        step instead of waiting for the current batch to finish, and leave as soon as its reply is
        done. Paged KV cache allocates cache memory in small blocks as a conversation grows, rather
        than reserving room for the longest possible conversation up front, which can otherwise waste
        a large share of memory. And prefix caching keeps the cache for a shared opening sequence,
        such as our 1,500-token system prompt, and reuses it across conversations so that it is
        computed and stored once. Hosted APIs use the same ideas internally; prompt caching discounts
        are how some of the saving is passed on to customers.
      </p>

      <h3>What one support conversation costs</h3>
      <p>
        Now the finance question. Suppose the hosted model charges $1 per million input tokens, $5
        per million output tokens, and $0.10 per million input tokens read from its prompt cache.
        These are illustrative prices; current price sheets vary widely by model, but the shape (output
        several times input, cached input a small fraction of input) is common.
      </p>
      <p>
        A typical pilot conversation has four turns, and each turn sends the whole conversation
        again, because the model keeps no memory between calls. Turn one sends 1,500 system tokens,
        3,000 retrieved, a 300-token question: 4,800 tokens. Each later turn adds the previous
        question and answer to the history, 550 tokens, and retrieves fresh passages. So the four
        turns send 4,800, 5,350, 5,900 and 6,450 tokens: 22,500 input tokens in all. The four replies
        total 1,000 output tokens.
      </p>
      <p>
        Without caching, input costs 22,500 × $1 / 1M = $0.0225 and output costs 1,000 × $5 / 1M =
        $0.005, so a conversation costs about $0.0275. At 30,000 conversations a day that is about $825
        a day, or roughly $25,000 a month. Note where the money goes: output tokens cost five times as
        much each, yet input is 82% of the bill, because the conversation resends its context every
        turn.
      </p>
      <p>
        Caching depends on the order in which the prompt is assembled, because a cache can only
        reuse an identical prefix. The pilot assembled each turn as system prompt, then retrieved
        passages, then history, then question. The passages change every turn, so everything after
        the system prompt differed from the previous call and only 1,500 tokens per turn were cached.
        That gives 6,000 cached and 16,500 uncached input tokens per conversation, for $0.0221 in
        total. Reordering to system prompt, then history, then passages, then question makes the
        system prompt plus all previous turns a stable prefix: 1,500, 2,050, 2,600 and 3,150 cached
        tokens over the four turns, 9,300 in all, with 13,200 uncached. The total falls to $0.0191, about
        30% below the uncached figure, from a change in concatenation order. Providers differ in the
        details (some charge extra to write the cache, entries usually expire after minutes of
        inactivity, and there is often a minimum prefix length), so the saving must be measured on the
        provider’s usage reports, not assumed.
      </p>
      <p>
        The biggest remaining lever is the retrieved context. Cutting it from 3,000 to 1,500 tokens
        per turn, by retrieving fewer but better passages, removes 6,000 uncached tokens per
        conversation and saves $0.006, taking the total to about $0.013. Whether that is safe depends
        on retrieval quality, which the context chapter measures. One cost goes the other way: if the
        team switches to a model that reasons before answering, those reasoning tokens are usually
        billed as output. At 500 reasoning tokens per turn, that adds 2,000 output tokens, $0.01 per
        conversation, and at 60 tokens per second about eight seconds before each visible reply.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Change</th><th>What it improves</th><th>What it costs or risks</th></tr>
          </thead>
          <tbody>
            <tr><td>Stream the reply</td><td>perceived wait falls to the time to first token</td><td>the interface must handle partial text and cancelled replies</td></tr>
            <tr><td>Stable parts of the prompt first</td><td>cached input is billed at a fraction; prefill is shorter</td><td>ordering discipline in code; cache expiry under low traffic</td></tr>
            <tr><td>Fewer, better retrieved passages</td><td>input cost and time to first token</td><td>a missing passage means a wrong or empty answer</td></tr>
            <tr><td>Cap reply length</td><td>decode time and output cost</td><td>cut-off answers if the cap is set too low</td></tr>
            <tr><td>Smaller model for easy intents</td><td>every per-token cost</td><td>a router to build; quality on hard questions must be measured</td></tr>
            <tr><td>Quantise weights to 8 or 4 bits (self-hosted)</td><td>memory read per step, so decode speed and concurrency</td><td>some quality loss, measured on our own questions</td></tr>
            <tr><td>Speculative decoding</td><td>decode latency: a small model drafts tokens, the large one checks several per step</td><td>complexity; gains depend on how often drafts are accepted</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>The morning the queue fell over</h3>
      <p>
        A month into the pilot, the market fell sharply in the first minutes of trading. Here is how
        the assistant failed, in order, because the sequence is typical of capacity failures in any
        system and this one has an LLM-specific twist.
      </p>
      <p>
        On a normal morning, the assistant handles about 3.3 turns per second at peak, each holding
        a slot for about five seconds. By Little’s Law (items in the system equal arrival rate times
        time in the system) that is about 17 turns in flight, and about 18,500 input tokens per second,
        a little over a million per minute. The provider account had a limit of 4 million tokens per
        minute, comfortable headroom.
      </p>
      <p>
        At 9:16 traffic rose eightfold. Customers whose orders were rejected for insufficient margin
        all asked why at once. Input demand reached about 9 million tokens per minute, over twice the
        limit, and the provider began rejecting requests with rate-limit errors. The assistant’s client
        library retried each failed call immediately, up to three times, which turned one rejected
        call into as many as four, and pushed demand higher still. Customers who saw an error typed
        their question again, adding another conversation each. Within three minutes most calls were
        failing, and the few that succeeded waited in the provider’s queue long enough that time to
        first token passed ten seconds. Among the failed conversations were customers reporting
        trades they had not made.
      </p>
      <p>
        The team made four changes. Retries now wait with exponential backoff and random jitter, and
        each conversation has a retry budget, so failures no longer multiply load. The assistant
        tracks its own token usage against the limit and, above 80% of it, stops starting new
        model conversations: new customers see a short message with a link to the market-status page
        and a button to raise a ticket, which costs no model tokens. Messages that the first chapter’s
        classifier scores as possible unauthorised activity skip the assistant entirely and go to
        the fraud desk, so they are never caught in a model queue. And under load, the assistant
        retrieves three passages instead of five and caps replies at 150 tokens, which cuts tokens per
        turn by about a fifth.
      </p>
      <p>
        None of these is free. During spikes, some customers get a ticket instead of an answer, and
        the answers that do go out are shorter. The team also bought a reserved-capacity arrangement
        that raises the limit for market hours, which costs money on quiet days. The decision they
        wrote down was: “On volatile mornings we prefer fewer, shorter answers and a reliable ticket
        path over a slow, failing assistant, and fraud reports never wait on the model.”
      </p>

      <h3>Buying tokens or renting GPUs</h3>
      <p>
        The calculations above for a self-hosted 8B model make one question tempting: why pay per
        token? One GPU running that model can produce a couple of thousand output tokens per second
        and hold about 80 conversations. The answer for this team was utilisation. Broking support
        traffic is concentrated in market hours: about 70% of conversations arrive between 9:00 and
        16:00, with a sharp peak at the open. A GPU sized for the 9:16 spike is mostly idle from late
        afternoon to the next morning and over weekends, but it is billed every hour. Per-token
        pricing charges nothing for idle hours.
      </p>
      <p>
        Self-hosting starts to win when traffic is high and steady enough to keep GPUs busy, when
        data cannot leave the company’s infrastructure, when a smaller open model is shown by the
        team’s own evaluations to be good enough for the task, or when the latency the team needs
        cannot be bought. Each of those is a measurable claim, and the comparison must be made in
        cost per conversation at the utilisation the team will actually achieve, including the
        engineers who keep a serving stack running. For the assistant, none of the conditions held,
        and it stayed on a hosted model.
      </p>

      <h3>When this arithmetic is not worth doing</h3>
      <p>
        At pilot scale the bill was about $8 a day. A week of engineering time to save a third of
        that would take years to pay back. Before volume arrives, the only optimisation that clearly
        pays is streaming, because customers feel latency from the first conversation. Cost work
        becomes worthwhile when the monthly bill is large enough that a third of it is worth an
        engineer’s month, or when a latency target is being missed. The order of the levers above,
        prompt order before context size before model size, also reflects risk: the first changes no
        answer, the second changes what the model reads, and the third changes the model.
      </p>
      <p>
        The next chapter, <em>Prompting and structured output</em>, looks inside the 1,500-token
        system prompt that every one of these conversations begins with: what it should say, what
        the model reliably does with it, and how to get replies the rest of the system can parse.
      </p>

      <Notes
        items={[
          'Prefill reads the whole prompt in parallel and sets time to first token; decode adds one token per step and sets reading speed.',
          'A decode step must read every weight from memory, so it is limited by memory bandwidth and batching is how throughput is recovered.',
          'The KV cache costs about 131 KB per token for a typical 8B model and decides how many conversations fit on one GPU.',
          'Each turn resends the whole conversation, so input tokens usually dominate cost even though output tokens are priced higher.',
          'Put stable content first in the prompt; caching only reuses an identical prefix.',
          'Plan for spikes with backoff, a retry budget and a degraded path that does not need the model.',
        ]}
      />
    </>
  ),

  /* ── 06 · Prompting and structured output ────────────────────── */
  prompting: (
    <>
      <p>
        The pilot’s first system prompt was two sentences: “You are the support assistant for a
        stock-broking app. Answer customers’ questions helpfully and accurately.” In the first week
        the team read 200 transcripts and sorted the problems they found. A customer asked whether to
        sell a stock before its quarterly results, and the assistant offered a view on it. Another
        complained about a charge, and the assistant promised to reverse it, which it has no power to
        do. A third asked about a pending withdrawal and was told it “should arrive within 24 hours”,
        a figure that appears nowhere in the help centre. And the code that decided whether to look
        up an order or raise a ticket, which searched the reply for phrases like “raise a ticket”,
        broke every time the model worded things differently.
      </p>
      <p>
        None of these needed a new model or more data. They needed the instructions and the output
        format to be designed with the same care as any other interface. This chapter rewrites the
        prompt as a specification, uses examples to teach a boundary that rules describe badly, gets
        replies the code can parse safely, and walks through how a one-line prompt edit broke the
        assistant’s handling of fraud reports.
      </p>

      <h3>Write the system prompt as a specification</h3>
      <p>
        The model reads the system prompt at the start of every conversation and has nothing else
        to tell it what this deployment is for. Everything the team expects (what it may discuss,
        where its facts come from, what it must not do, which actions exist, what replies look like)
        has to be written there, in words specific enough that two engineers would agree on whether a
        given reply follows them. Here is the core of the rewritten prompt.
      </p>
      <pre><code>{`You are the support assistant for a stock-broking app. You help customers
with their accounts, orders, funds and charges.

Sources
- Answer only from the help-centre articles inside <articles>. Each has an id.
- Cite the id of every article you relied on, like [HC-1042].
- If the articles do not answer the question, say so plainly and offer to
  raise a ticket. Do not fill gaps from general knowledge: policies differ
  between brokers and change often.

What not to do
- Do not say whether to buy, sell or hold any security, or predict prices.
  Support is not permitted to give investment advice, and customers act on
  what we say. Explain how the relevant feature works instead.
- Do not promise refunds, reversals or exceptions. Only the operations team
  can grant them. Offer to raise a ticket instead.

Actions
- To check an order, call get_order_status with the order id.
- To hand over to a person, call raise_ticket with a one-line summary.
- If the customer reports activity they did not authorise, call raise_ticket
  with priority "urgent" before doing anything else.

Style
- Reply in the customer's language (English, Hindi, or a mix of both).
- Two to five sentences for most answers. Plain words, no headings.`}</code></pre>
      <p>
        Each section answers a failure from the transcripts, and a few choices in it are worth
        explaining. The prohibitions carry their reasons. A model told only “do not give investment
        advice” has to guess where advice begins. A model told that customers act on what it says,
        and that support is not permitted to advise, can extend the rule to cases the list never
        mentions, such as “is this new share issue worth applying for?” Reasons generalise; bare rules
        get applied literally.
      </p>
      <p>
        Each prohibition also says what to do instead. “Do not promise refunds” alone leaves the
        model with a customer who wants a refund and no permitted move, and it tends to produce
        something evasive. “Offer to raise a ticket instead” gives it a move. The sources section
        licenses an honest “I don’t know”, which matters more than it looks. The model’s training
        rewarded helpful-sounding answers, and without explicit permission to decline, it will
        usually fill a gap with something plausible, as the model chapter showed.
      </p>
      <p>
        Finally, the prompt is code. It lives in version control, changes go through review, and,
        as we will see, every change is tested against recorded conversations before it ships.
        The model reads it on every call, so a one-word edit changes the behaviour of every
        conversation at once.
      </p>

      <h3>Instructions that can be checked</h3>
      <p>
        A useful test for each instruction is whether someone could look at a reply and say if it was
        followed. “Be accurate” fails the test: the model already tries to produce likely text, and
        the instruction gives it nothing new to act on. “Cite the id of every article you relied on”
        passes: code can check that every reply contains at least one id, and that each id was among
        the articles supplied. Checkable instructions are also the ones the team can later turn into
        automated evaluations.
      </p>
      <p>
        Even an instruction that looks precise can hide a choice. “Reply in the customer’s language”
        seemed clear until the team read replies to customers who write Hindi in Latin script, as
        in “mera withdrawal abhi tak nahi aaya”. The model often replied in Hindi written in
        Devanagari, which is the same language and a different script, and several customers said
        they found it hard to read on a phone. The instruction did not say which of the two it meant,
        so the model chose. The rewritten line says “Match the language and the script the customer
        used; if they mix Hindi and English in Latin script, do the same.” Each time a reply surprises
        the team, the question to ask is whether the prompt actually specified the behaviour they
        expected, or only implied it.
      </p>
      <p>
        The tool descriptions are part of the prompt too, though they are easy to forget because they
        live in a different field of the API call. The first description of raise_ticket was “Raise a
        support ticket”. The model, keen to be helpful, raised tickets for questions the articles
        already answered. Rewritten to say when to use it (“when the articles do not answer the
        question, when the customer asks for a person, or when an action is needed that only the
        operations team can take”) and when not to (“not for questions the supplied articles answer”),
        unnecessary tickets fell by more than half. The model reads these descriptions as carefully as
        the system prompt, and they deserve the same review.
      </p>
      <p>
        Instructions can also conflict without anyone noticing. “Two to five sentences” and “explain
        every line of the contract note when asked” cannot both hold for a customer who asks about a
        contract note with nine charges on it. The model resolves such conflicts silently, and not
        always the same way twice. When the team finds a conflict, the fix is to state which wins in
        which situation, as the urgent-ticket rule does with “before doing anything else”.
      </p>
      <p>
        Where things sit in the prompt matters too. The system prompt goes first, which also suits
        caching, as the previous chapter showed. Long reference material, the retrieved articles,
        goes after the history and before the customer’s question, so that the question and the most
        relevant material are the last things the model reads before it starts writing. Articles and
        customer text are wrapped in clearly named tags so the model can tell instructions from
        material. That helps with ordinary confusion, but it is not a security boundary: text inside
        an article or a customer message can still attempt to issue instructions, and the security
        chapter treats that separately.
      </p>

      <h3>Examples teach the boundary that rules describe badly</h3>
      <p>
        Even with reasons attached, the line between explaining a feature and giving advice was
        drawn inconsistently. “How does a stop-loss order work?” is a product question. “Where should
        I put my stop-loss on this stock?” is advice. “Why did my stop-loss sell below the price I
        set?” is a product question about the difference between stop-loss orders that become market
        orders and those that become limit orders. All three mention stop-losses, and a written rule
        that separates them cleanly is hard to compose.
      </p>
      <p>
        Showing the model a few worked examples, called few-shot prompting, often does better than
        more description, because the model is good at continuing patterns. The team added three
        short examples to the prompt, one for each of those questions, each showing the ideal reply.
        The advice example declines in one sentence and then explains how stop-loss orders work with
        a citation, so it demonstrates the alternative move as well as the refusal. After the change,
        the share of advice-seeking questions answered with an opinion, measured on 80 such questions
        from the transcripts, fell from about one in four to one in forty.
      </p>

      <Predict
        q={
          <>
            All three examples happen to end with the sentence “Would you like me to raise a ticket
            for this?” A customer asks what the depository charge on their contract note is, and the
            retrieved article answers it fully. What does the assistant’s reply probably look like?
          </>
        }
      >
        <p>
          A correct explanation of the charge, followed by “Would you like me to raise a ticket for
          this?”, though there is nothing to raise a ticket about.
        </p>
        <p>
          Models copy the surface of examples as eagerly as the substance: length, structure,
          opening phrases, closing phrases. Here the team saw the ticket offer on most replies within a
          day, and enough customers accepted it to add several hundred pointless tickets to the queue.
          The fix was to vary the examples: one ends with the ticket offer because the case needs it,
          one ends with a citation, one ends after answering. When examples are chosen, check what
          they have in common that you did not intend to teach.
        </p>
      </Predict>

      <p>
        A few examples go a long way, and they are expensive to keep in the prompt (each one costs
        tokens on every call) and easy to overfit to. The team keeps three to five, chosen for the
        cases that rules handled worst, and treats them like test fixtures: when one is changed, the
        recorded conversations are rerun.
      </p>

      <h3>Structured output, where code reads the answer</h3>
      <p>
        The phrase-matching code had to go. Before writing a reply, the assistant now makes a separate
        decision call, whose output is not shown to the customer but read by the orchestration code:
        which intent this is, which action to take, which order id is involved, whether it is urgent.
        Code cannot act reliably on prose, so that output must be structured data with a fixed shape.
      </p>
      <p>
        There are three ways to get it, with different guarantees.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Method</th><th>What is guaranteed</th><th>What still goes wrong</th></tr>
          </thead>
          <tbody>
            <tr><td>Ask for JSON in the prompt, with an example</td><td>nothing; usually valid</td><td>stray text around the JSON, missing fields, a few percent of the time</td></tr>
            <tr><td>Provider structured output against a schema</td><td>the output parses and matches the schema</td><td>values can be wrong; schema features supported vary by provider</td></tr>
            <tr><td>Tool calling</td><td>tool arguments match the declared schema</td><td>the model may not call the tool, or call the wrong one</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Schema-enforced output works through the sampling step from the model chapter. At each token,
        the server works out which tokens could legally come next given the schema and the text so
        far, sets the probability of every other token to zero, and samples from what remains. If the
        schema says the next thing must be one of “answer”, “lookup_order” or “raise_ticket”, the model
        cannot write “escalate”. This guarantees shape and nothing more. A field typed as a string
        will accept “my last order” as an order id, because that is a valid string.
      </p>
      <p>
        So the orchestration code validates meaning as well as shape, and gives the model one chance
        to correct itself.
      </p>
      <pre><code>{`const Decision = z.object({
  reason: z.string().max(300),
  intent: z.enum(['order_status', 'funds', 'account', 'charges',
                  'app_issue', 'unauthorised', 'other']),
  action: z.enum(['answer', 'lookup_order', 'raise_ticket']),
  order_id: z.string().regex(/^ORD-\\d{5,}$/).nullable(),
  urgent: z.boolean(),
})

let result = Decision.safeParse(await decide(conversation))
if (!result.success) {
  // one retry, with the validator's complaint appended
  result = Decision.safeParse(
    await decide(conversation, { error: result.error.message }))
}
if (!result.success) return handOverToHuman(conversation)
if (result.data.action === 'lookup_order' && !result.data.order_id) {
  return askCustomerForOrderId()
}`}</code></pre>
      <p>
        Three design choices in that schema matter. The intent list includes “other”, so a question
        that fits nowhere has a legal answer and the model is not forced to pick the nearest wrong
        category. The order id must match the format of real ids, so “my last order” fails validation
        and triggers the retry with a message the model can act on. And the reason field comes first.
        The model writes fields in order, one token at a time, and each token is conditioned on
        everything before it. Putting a short reason before the decision gives the model a few
        sentences to work through the case before it commits to an action; putting it after would
        only produce a justification of a choice already made.
      </p>
      <p>
        When both attempts fail, the conversation goes to a person. That path is rare, and having it
        means a malformed output degrades into a slower answer rather than an unhandled exception.
      </p>

      <h3>The two-sentence edit that broke fraud handling</h3>
      <p>
        By the third week, replies were accurate but long, averaging about 180 words. On a Friday
        afternoon an engineer added one line to the Style section: “Keep every answer to at most two
        sentences.” It was reviewed as a style change and shipped the same day. Here is what happened
        over the weekend.
      </p>
      <p>
        Most replies got shorter and better. But for customers reporting trades they had not made,
        the assistant now often wrote two sentences that told them to “contact support” and stopped.
        In about a third of those conversations it did not call raise_ticket at all. The urgent-ticket
        rule was still in the Actions section, but the new line was absolute (“every answer”) and
        sat later in the prompt, and the model resolved the conflict between them by sometimes
        keeping its reply short and skipping the action that would have led to a longer explanation.
        Replies also began dropping citations, which made answers harder to check. On Monday the fraud
        desk noticed that urgent tickets from the assistant had fallen by about a third, while fraud
        reports reaching the classifier from the first chapter had not.
      </p>
      <p>
        The immediate fix was to revert the line. The lasting fixes were two. The instruction was
        rewritten to state its scope: “Two to five sentences for most answers. For reports of
        unauthorised activity, raise the urgent ticket first, then explain what happens next in as
        much detail as needed.” And the process changed. The team built a set of 150 recorded
        conversations, including 20 fraud reports, 20 advice-seeking questions and 20 questions the
        help centre cannot answer. Every prompt change now reruns those conversations and checks,
        mostly with simple code, that urgent tickets were raised, that no reply offered an opinion
        on a security, that every reply cited a supplied article or said it could not answer, and that
        the decision output parsed.
      </p>
      <p>
        That costs something. Each prompt change takes about twenty minutes and a few dollars of
        tokens to test, and small style tweaks no longer ship in five minutes. The team accepted the
        cost because the alternative was learning about regressions from the fraud desk. The
        evaluation chapter later in the pathway builds this practice out properly.
      </p>

      <h3>Letting the model work before it answers</h3>
      <p>
        Some questions require several steps. “I sold 100 shares at 3:25, 60 got executed, I cancelled
        the rest at 3:29. Why do my funds show less than 60 times the price?” The answer depends on
        the charges deducted, on whether the 40 unexecuted shares were released back to holdings, and
        on when the sale proceeds become available. A model that starts writing the answer
        immediately must get every step right in the order it writes them. A model that first works
        through the steps has the intermediate results in its context when it writes the reply,
        because each token can attend to the earlier ones.
      </p>
      <p>
        This is the reason step-by-step reasoning helps on multi-step problems, and it is also why it
        does little for simple lookups: there are no intermediate results to compute. Current models
        often offer a reasoning mode that does this internally before the visible answer, and the
        decision becomes one of cost. From the previous chapter, 500 reasoning tokens per turn cost
        about $0.0025 at $5 per million output tokens and add roughly eight seconds at 60 tokens per
        second. The team enables reasoning only when the decision call’s intent is order status or
        charges and the conversation involves a partial execution, a cancellation or several charges,
        and answers simple policy questions directly.
      </p>

      <h3>When the prompt is not the fix</h3>
      <p>
        The prompt changes what the model does with what it reads. It cannot supply facts that are
        not there. When the assistant gave the wrong cut-off time for same-day withdrawals, the cause
        was that the relevant article had not been retrieved. No instruction could fix that, and
        attempts to (“be especially careful about withdrawal times”) only made replies more hedged.
        Missing knowledge is the next chapter’s problem.
      </p>
      <p>
        Two other limits are worth knowing. When the prompt grows past several thousand tokens of
        rules and examples, each new rule interacts with all the others, every call pays for all of
        them, and behaviour becomes hard to predict. That is the point to consider moving stable
        behaviour into the model’s weights, which the fine-tuning chapter covers. And instructions
        are not enforcement. For rules with regulatory weight, such as the ban on advice, the prompt
        makes violations rare, and code makes them rarer still: the team runs a separate check on
        every outgoing reply and holds back any reply it flags for human review. A prompt lowers the
        rate of a failure; it does not take it to zero.
      </p>
      <p>
        The next chapter, <em>Context and retrieval</em>, deals with the articles inside the
        &lt;articles&gt; tag: how the assistant finds the right three to five passages among the help
        centre’s 1,200 articles, how many tokens to spend on them, and what happens when it finds the
        wrong ones.
      </p>

      <Notes
        items={[
          'Give every prohibition its reason and an alternative action, so the model can extend it to cases the prompt does not list.',
          'Prefer instructions someone could check against a reply; vague instructions give the model nothing new to act on.',
          'Few-shot examples teach their unintended surface features too, so vary length, structure and endings.',
          'Schema-enforced output guarantees shape, not meaning; validate values in code and retry once with the error.',
          'Test every prompt change against recorded conversations that include the cases where a regression would hurt most.',
          'For rules with real consequences, back the prompt with a check in code; a prompt lowers a failure rate but does not remove it.',
        ]}
      />
    </>
  ),

  /* ── 07 · Context and retrieval ──────────────────────────────── */
  context: (
    <>
      <p>
        The model chapter ended with a fix: when the assistant answered a withdrawal question from
        its training data, the team put the right help-centre article into the prompt and told the
        model to answer from it. That raises the question this chapter is about. The help centre has
        about 1,200 articles, and the product documentation (order types, margin rules, the charges
        schedule) adds a few hundred pages more. For each customer question, which few passages
        should the model read?
      </p>
      <p>
        Choosing them at request time is called retrieval, and the pattern of retrieving passages,
        placing them in the prompt and asking the model to answer from them is called
        retrieval-augmented generation, or RAG. The idea fits in a sentence. Getting it to work
        means making decisions at every stage: how to cut documents into pieces, how to search them,
        how many to keep, where to put them, and how to tell, when an answer is wrong, which stage
        lost the right passage. We will make each decision for the assistant and then follow one
        wrong answer back to its cause.
      </p>

      <h3>Why not send the whole help centre</h3>
      <p>
        The first option to rule out is the simplest: include everything. The 1,200 articles average
        about 900 words, roughly 1,200 tokens each, which is about 1.44 million tokens; the product
        documentation brings the total to around 1.75 million. Some current models accept contexts of
        a million tokens or more, so in a few cases this might even fit.
      </p>
      <p>
        At the illustrative prices from the inference chapter, 1.75 million input tokens cost $1.75 per
        turn, or about $0.18 if all of it were read from cache. The pilot’s turns with 3,000 tokens of
        retrieved passages cost about $0.003 for those passages. That is a difference of 60 to 600
        times, on every turn of every conversation. Prefill for 1.75 million tokens would also take
        many seconds before the first word appeared. And more text is not simply more help: the model
        must find the two relevant paragraphs among thousands, and the next sections show that
        models use passages less reliably when they are buried in the middle of a long context.
      </p>
      <p>
        So the assistant retrieves. The target is three to five passages, a few thousand tokens,
        chosen per question.
      </p>

      <h3>Chunking decides what can ever be found</h3>
      <p>
        Retrieval works on pieces of documents, called chunks, small enough that several fit in the
        prompt and focused enough that each is about one thing. The team’s first version cut every
        article into fixed windows of 500 tokens. That produced about 3,500 chunks and one serious
        problem.
      </p>
      <p>
        The article “Withdrawing funds” has three sections: how to place a withdrawal request, a
        table of cut-off times and when requests placed before or after them are processed, and
        reasons a withdrawal can fail. The 500-token window happened to end just after the heading
        “Cut-off times”, so the table landed at the start of the next chunk. That chunk contained times
        and phrases like “processed the same working day”, and no mention of withdrawals at all. A
        question like “I requested a withdrawal at 4pm, when will I get it?” had nothing in that
        chunk to match against. The answer existed in the help centre and could not be retrieved.
      </p>
      <p>
        The second version splits along the documents’ own structure: one chunk per section, tables
        kept whole, long sections divided at paragraph boundaries with a small overlap so a sentence
        that depends on the previous one is not orphaned. Each chunk is prefixed with its location,
        “Withdrawing funds › Cut-off times”, so even a chunk that is mostly a table carries the words
        that say what it is about. Each chunk also carries metadata outside its text: the article id,
        the date it was last updated, and whether the article is current or archived. This produced
        about 4,400 chunks averaging around 400 tokens. Chunking costs nothing at query time, and it
        sets the ceiling on everything after it: a passage that was cut badly cannot be rescued by a
        better search.
      </p>

      <h3>Embedding search, and the questions it gets wrong</h3>
      <p>
        The deep learning chapter introduced embeddings: vectors placed so that similar meanings sit
        close together. An embedding model turns each chunk into a vector of, say, 1,024 numbers once,
        when the help centre is indexed. At query time it turns the customer’s question into a vector
        the same way, and the search returns the chunks whose vectors have the highest cosine
        similarity to it. This is what finds “withdrawal still pending” when the article says “funds
        transfer to your bank is in progress”.
      </p>
      <p>
        At 4,400 chunks, the search itself is trivial: comparing the query with every chunk is about
        4.5 million multiply-adds, which takes around a millisecond on an ordinary CPU. Approximate
        nearest-neighbour indexes such as HNSW exist for collections of millions or billions of
        vectors, where comparing against everything is too slow. They trade a little recall for speed.
        For the assistant, an exact search over every vector is faster to build, easier to reason
        about, and misses nothing, so the team uses that and will revisit if the corpus grows a
        hundredfold.
      </p>
      <p>
        Embedding search fails in a predictable way. It captures the gist of text, which is what we
        want for paraphrases, and it blurs exact terms, which is what we do not want for names, codes
        and acronyms. A customer who asks “what is the GTT charge?” wants the article on good-till-
        triggered orders, but the question’s vector sits near every article about orders and charges,
        and the right one may not rank first. Keyword search, using a scoring method such as BM25
        that rewards documents containing the query’s rarer words, finds “GTT” immediately, and it
        is poor at paraphrases. The two fail on different questions, which is the argument for
        running both.
      </p>
      <p>
        Running both gives two ranked lists that must be merged. Their scores are on different
        scales, so a common method ignores the scores and uses only the ranks. Reciprocal rank fusion
        gives each chunk 1 / (60 + rank) from each list and adds them up; 60 is a conventional
        constant that stops the top ranks from dominating. Suppose chunk A is first in keyword search
        and eighth in embedding search: it gets 1/61 + 1/68 = 0.0311. Chunk B is third and second: 1/63
        + 1/62 = 0.0320. B ranks higher. A chunk that both methods consider reasonably good beats one
        that only one method loves, which is usually the right bias.
      </p>

      <Fig caption="The question is rewritten to stand alone, searched two ways, fused and reranked. Logging the chunk ids at every stage is what makes a wrong answer traceable.">
        <RetrievalPipeline />
      </Fig>

      <h3>Two steps the first version skipped</h3>
      <p>
        The first is rewriting the query. In a conversation, the latest message is often not a good
        search query on its own. A customer who earlier mentioned selling shares and asking for a
        withdrawal then writes “and how long does that usually take?” Embedded as is, that message
        matches anything about durations. A small, fast model call rewrites it as a standalone
        question, “how long does a withdrawal of sale proceeds take to reach the bank”, using the
        conversation so far, and that is what gets searched. It costs one extra short call, around a
        couple of hundred milliseconds with a small model, and it fixed most of the failures on
        follow-up questions.
      </p>
      <p>
        The second is reranking. The embedding model compresses each chunk into one vector before it
        has seen any question, so it cannot know which details of the chunk the question will care
        about. A reranker, usually a model called a cross-encoder, reads the question and a chunk
        together and scores how well the chunk answers it. That is far more accurate and far too slow
        to run on all 4,400 chunks, so it runs on the 50 or so candidates the two searches produce,
        and keeps the best five. Scoring 50 pairs typically takes tens to a few hundred milliseconds,
        depending on the reranker’s size and hardware. The pipeline uses cheap, broad methods to
        avoid missing the right chunk and an expensive, precise one to pick from what they found.
      </p>

      <h3>Measuring the retrieval separately from the answer</h3>
      <p>
        When an answer is wrong, there are two very different possibilities. Either the right passage
        never reached the model, or it did and the model misused it. Prompt changes can only help with
        the second. To tell them apart, the team built a small labelled set: 120 real customer
        questions from the transcripts, each tagged by a support agent with the article and section
        that answers it. It took two agents two afternoons.
      </p>
      <p>
        Two numbers summarise retrieval on that set. Recall at k is the fraction of questions whose
        correct chunk appears anywhere in the top k results. Mean reciprocal rank averages 1/rank of
        the correct chunk across questions, counting zero when it is missing, so it rewards putting
        the right chunk near the top. For three questions whose correct chunks rank first, third and
        not at all, it is (1 + 1/3 + 0) / 3 = 0.44.
      </p>
      <p>
        With the first version (fixed windows, embedding search only, no rewriting or reranking),
        recall at 5 was 64%, while recall at 50 was 90%. That gap is informative. For about a quarter
        of the questions, the right chunk was found but ranked too low to reach the prompt, which is
        a ranking problem that hybrid search and reranking address. For the remaining 10%, it was
        not in the top 50 at all, which points at chunking, vocabulary, or a gap in the help centre
        itself. After the changes above, recall at 5 rose to 86%. Several of the remaining misses
        turned out to be questions the help centre did not answer, which became a list of articles
        for the content team to write. No change to the model or the prompt would have found any of
        this.
      </p>

      <Predict
        q={
          <>
            Recall at 5 is 86% and recall at 20 is 95%. A colleague proposes passing 20 chunks to the
            model instead of 5, since the right one is then present more often. What happens to cost
            per conversation, and do answers get better?
          </>
        }
      >
        <p>
          Cost rises sharply. Fifteen extra chunks of about 400 tokens is 6,000 more input tokens per
          turn, uncached because they change every turn. Over a four-turn conversation that is 24,000
          tokens, about $0.024 at $1 per million, which roughly doubles the conversation’s cost from
          the inference chapter. Time to first token rises with the longer prefill.
        </p>
        <p>
          Answers do not reliably improve. The right chunk is present 9 points more often, but every
          answer now comes with 15 or more passages that do not answer the question, several of which
          look as if they might, such as the article on adding funds next to the article on
          withdrawing them. Studies of long contexts have found that models use information placed in
          the middle of a long prompt less reliably than information at its start or end. When the
          team tested 20 chunks on the labelled questions, some answers improved and others got worse
          by drawing on a near-miss passage. The cheaper route to those 9 points is a better reranker,
          which keeps k at 5.
        </p>
      </Predict>

      <h3>Budgeting the context window</h3>
      <p>
        Every turn’s prompt is assembled under a token budget, decided in advance rather than
        discovered on the bill. The team’s budget for a typical turn:
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Part</th><th>Tokens</th><th>How it is kept within budget</th></tr>
          </thead>
          <tbody>
            <tr><td>System prompt and examples</td><td>≈1,500</td><td>reviewed like code; cached, since it never changes between calls</td></tr>
            <tr><td>Tool definitions</td><td>≈400</td><td>short descriptions, only the tools this deployment uses</td></tr>
            <tr><td>Conversation history</td><td>≤1,200</td><td>last three turns verbatim, older turns replaced by a short summary</td></tr>
            <tr><td>Retrieved passages</td><td>≈2,000 to 3,000</td><td>five reranked chunks, each with its article id and section path</td></tr>
            <tr><td>Customer’s question</td><td>≈300</td><td>long pasted text is truncated with a note to the model</td></tr>
            <tr><td>Reserved for the reply</td><td>≈500</td><td>a maximum output length on the call</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The order follows the inference and prompting chapters: stable parts first for caching,
        passages after the history, the question last, so the question and its evidence are the
        last things the model reads. Each passage is wrapped with its id so the reply can cite it,
        and the orchestration code checks that every id the reply cites was actually supplied in
        this turn. A reply that cites nothing, or cites an id that was not supplied, is not sent; the
        assistant says it could not find the answer and offers a ticket.
      </p>

      <h3>The answer built on the wrong passage</h3>
      <p>
        Before the reranker and metadata existed, a customer asked: “I sold shares this morning. How
        long until I can withdraw the money to my bank?” The assistant replied that funds are usually
        available instantly, cited an article, and was wrong. Here is how the team traced it, stage by
        stage, using the chunk ids logged for that request.
      </p>
      <p>
        The rewritten query was fine. Embedding search returned, in first place, a chunk from “Adding
        funds via UPI”, which explains that money added through UPI is credited instantly. The
        question and that chunk share almost every important idea (money, bank, how long, available)
        and differ in direction, which embeddings capture weakly. In second place came a chunk from
        an archived article describing an older settlement cycle. The correct chunk, from
        “Withdrawing sale proceeds”, was ninth in embedding search and fourth in keyword search,
        thanks to the words “sold” and “withdraw”. After fusion it was sixth, one place outside the
        five that reached the prompt.
      </p>
      <p>
        So the model received two misleading passages and not the right one, and it did what it was
        told: it answered from the passages it had and cited one. From the model’s side, the answer was
        grounded. The fault lay entirely in retrieval, and the citation is what made it fast to find,
        since it pointed straight at the UPI article.
      </p>
      <p>
        Three changes fixed this class of error. Archived articles were excluded at search time
        using the metadata, which cost nothing at query time but required the content team to mark
        articles as archived when policies change, a process step that had not existed. The reranker
        was added; reading the question and the UPI chunk together, it scored the chunk low, because
        nothing in it is about taking money out. And the labelled set gained twelve questions about
        direction-sensitive pairs (adding versus withdrawing funds, buying versus selling, pledging
        versus unpledging) so that a regression would show up in recall. The costs were a reranker to
        host and about 150 milliseconds of added latency per turn, and a new obligation on the content
        team.
      </p>
      <Callout>
        When a grounded answer is wrong, find the stage where the right passage fell out before
        touching the prompt. Log the chunk ids after each search, after fusion and after reranking,
        and the trace usually names the fix.
      </Callout>

      <h3>When retrieval is the wrong tool</h3>
      <p>
        Retrieval over text is for knowledge that lives in documents. The status of a customer’s
        order lives in the order system, changes by the second, and must be exact; retrieving a
        passage about order statuses will not tell the assistant whether ORD-88213 executed. That is
        a lookup, done by calling a tool with the order id, and the agents chapter covers how the
        assistant decides to make that call and what can go wrong when it does.
      </p>
      <p>
        Sometimes the corpus is small enough that retrieval is not worth its failure modes. The
        charges schedule is about 40 short articles, around 25,000 tokens. Placed whole in the cached
        prefix of every call, it costs about $0.0025 per turn at the cached rate used earlier, and
        there is no retrieval step to get wrong. For a narrow assistant over a small, stable set of
        documents, that can be the better design. As context windows grow and cached input gets
        cheaper, the size at which retrieval starts to pay moves upward, and it is worth redoing this
        arithmetic every year or so rather than assuming the answer.
      </p>
      <p>
        Retrieval also cannot fix behaviour. After the changes in this chapter, the assistant usually
        had the right passages, and some failures remained: replies in a tone the support leads
        disliked, an output format that drifted on long conversations, a long system prompt that
        every call paid for. Those are about how the model behaves, not what it knows. The next
        chapter, <em>Fine-tuning, and when a better prompt wins</em>, takes up when changing the
        model’s weights is the right answer to that kind of problem, and why it is so often the wrong
        answer to the problems in this one.
      </p>

      <Notes
        items={[
          'Sending everything costs tens to hundreds of times more per turn than sending the few passages a question needs.',
          'Chunk along the documents’ own structure and prefix each chunk with its title and section, or some answers can never be found.',
          'Embedding search handles paraphrase and blurs exact terms; keyword search does the reverse, so run both and fuse the ranks.',
          'Measure recall at k on labelled questions; the gap between recall at 5 and at 50 tells you whether ranking or finding is the problem.',
          'Passing more chunks raises cost and adds distractors; a better reranker is usually the cheaper way to raise recall at a small k.',
          'Facts that live in a database, such as an order’s status, belong in a tool call, not in retrieval.',
        ]}
      />
    </>
  ),
}
