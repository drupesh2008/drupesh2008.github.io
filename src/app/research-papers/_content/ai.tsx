/**
 * AI & Machine Learning — five explainers, problem first. Keyed by paper id.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl } from '@/components/Pathway/Pathway'
import ConvolutionDemo from '@/components/Papers/sims/ConvolutionDemo'
import Word2VecPlayground from '@/components/Papers/sims/Word2VecPlayground'
import AttentionHeatmap from '@/components/Papers/sims/AttentionHeatmap'
import FewShotPrompt from '@/components/Papers/sims/FewShotPrompt'
import ScalingLawCalc from '@/components/Papers/sims/ScalingLawCalc'
import {
  HandVsLearned, ConvNetStack, OneHotVsDense, SkipGram, QKVFlow, TransformerBlocks, PretrainThenPrompt,
  InContextCurve, PowerLawLines, ChinchillaShift,
} from './ai-diagrams'

export const sections: Record<string, ReactNode> = {
  /* ────────────────────────────────────────────────────────────────── */
  alexnet: (
    <>
      <h3>The problem: computers could not see, and progress had stalled</h3>
      <p>
        In 2011 the best way to recognise objects in photographs was a pipeline designed by hand.
        Engineers wrote detectors for edges, corners and colour patches (SIFT, HOG and their
        relatives), pooled them into a fixed-length description of the image, and trained a
        classifier on top. It worked, slowly, and it had hit a ceiling: on ImageNet, a benchmark
        with 1.2 million photographs in a thousand categories, the error rate improved by a point
        or two a year. Neural networks that learned their own features had existed since the
        1980s and were widely considered a dead end for anything but small problems, because they
        were slow to train and overfit badly.
      </p>
      <Fig caption="Two pipelines. The old one chose its features by hand and learned only the last step. AlexNet learned every step from the pixels, including what to look for.">
        <HandVsLearned />
      </Fig>

      <h3>The idea: a deep network, trained on the whole dataset, on graphics cards</h3>
      <p>
        Krizhevsky, Sutskever and Hinton did not invent the convolutional network; LeCun had read
        cheques with one in the 1990s. What they did was make one large enough to be worth it and
        find the handful of engineering decisions that let it train: eight learned layers and
        sixty million weights, fed by a dataset big enough to need them, on two consumer GPUs
        programmed to do the arithmetic quickly. The ingredients were individually known. The
        combination won the 2012 ImageNet competition with a top-5 error of 15.3 per cent against
        26.2 per cent for the runner-up, a gap larger than the previous several years of progress
        combined.
      </p>
      <Fig caption="The architecture. Five convolutional layers find edges, then textures, then parts, then objects; three fully connected layers decide between a thousand classes. The network was split across two 3 GB GPUs because it did not fit on one.">
        <ConvNetStack />
      </Fig>
      <Callout>
        Depth plus data plus compute. The paper’s argument, made explicitly in its conclusion, is
        that the network was still limited by how big they could afford to make it, and that
        results would keep improving with larger networks and more data. They did.
      </Callout>

      <h3>How it works</h3>
      <p>
        A <strong>convolutional</strong> layer slides a small filter across the image and records
        how strongly each patch matches it; a layer has many filters, so it produces a stack of
        feature maps, and the next layer slides its filters across those. Early layers end up
        detecting edges and colour blobs, as the hand-designed features did, except that these were
        learned from the data and the later layers learn combinations of them that no engineer
        would have written. Pooling layers shrink the maps between stages so later filters see a
        wider field.
      </p>
      <ConvolutionDemo />
      <p>
        Four decisions made it trainable. The <strong>ReLU</strong> activation, max(0, x), replaced
        the smooth sigmoids of older networks and trained several times faster because its gradient
        does not vanish. <strong>Dropout</strong> randomly silenced half the neurons in the large
        fully connected layers during training, which forced redundancy and cut overfitting
        dramatically. <strong>Data augmentation</strong>, random crops and flips and colour shifts,
        multiplied the effective dataset by thousands. And the <strong>GPU implementation</strong>,
        written by Krizhevsky himself, made a week of training feasible instead of a year. Each
        of these is now a default setting; in 2012 each was a discovery.
      </p>

      <h3>What it changed</h3>
      <p>
        AlexNet is the start of the deep-learning era by common agreement. Within a year every
        serious entry to ImageNet was a deep convolutional network; within three, networks were
        deeper than a hundred layers and better than people at the benchmark. The techniques spread
        from vision to speech, then to language, and the demand for GPU compute that the paper
        kicked off reshaped an industry. The three authors’ later work (Sutskever at OpenAI,
        Hinton’s lab, Krizhevsky at Google) traces a direct line from this paper to the models of
        the 2020s.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Every image model</strong>, from a phone’s face unlock to medical imaging, is a descendant; convolutions remain in use even where Transformers have taken the top layers.</li>
        <li><strong>ReLU, dropout and augmentation</strong> are default options in every deep-learning framework.</li>
        <li><strong>GPUs as the unit of ML compute.</strong> The paper is the reason NVIDIA is an AI company.</li>
        <li><strong>Transfer learning.</strong> Reusing a network trained on ImageNet as the starting point for another task began with AlexNet’s features.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  word2vec: (
    <>
      <h3>The problem: to a computer, every word was equally unlike every other</h3>
      <p>
        The standard way to hand a word to a learning algorithm in 2012 was a <strong>one-hot</strong>{' '}
        vector: a list of fifty thousand zeros with a single one at the position for that word.
        “King” and “queen” shared nothing in that representation; neither did “walk” and “walked”.
        Whatever a model learned about one word taught it nothing about any other, and the long
        tail of rare words was hopeless. Richer representations existed, learned as a by-product
        of neural language models, but training them took weeks and they did not scale to the
        vocabularies and corpora that mattered.
      </p>
      <Fig caption="Two ways to represent one word. One-hot: a position in a list, no relation to anything. Dense: a few hundred numbers in which similar words sit close and relationships become directions.">
        <OneHotVsDense />
      </Fig>

      <h3>The idea: you shall know a word by the company it keeps, at scale</h3>
      <p>
        Mikolov and colleagues proposed two deliberately simple models. <strong>Skip-gram</strong>{' '}
        takes a word and tries to predict the words around it; <strong>continuous bag of words</strong>{' '}
        does the reverse, predicting a word from its neighbours. Neither has a hidden layer in the
        usual sense: a word is looked up in a table of vectors, and that vector is used directly
        to score the predictions. The vectors start random and are nudged, billions of times,
        towards making the predictions right. The cheapness is the point; it let them train on 1.6
        billion words in under a day, where earlier models had taken weeks on far less.
      </p>
      <Fig caption="Skip-gram. The centre word’s row in a big table is its vector; the training objective is to predict the words in a window around it. Words used in the same contexts end up with similar rows.">
        <SkipGram />
      </Fig>
      <Callout>
        Meaning, for the purposes of a machine, is distributional: words that appear in similar
        contexts mean similar things. Train a model to predict context and the geometry of the
        vectors will encode that similarity without anyone defining it.
      </Callout>

      <h3>How it works</h3>
      <p>
        The result the paper is remembered for was not planned. Because the model is linear, the
        vectors capture relationships as consistent directions, and arithmetic on them works:
        subtract “man” from “king”, add “woman”, and the nearest vector is “queen”. The same holds
        for capitals and countries, tenses, plurals and comparatives. The authors built a test set
        of nearly twenty thousand such analogy questions to measure it. The simulation below shows
        the geometry in two dimensions; the real vectors have three hundred.
      </p>
      <Word2VecPlayground />
      <p>
        The companion paper later that year supplied the engineering that made it practical:{' '}
        <strong>negative sampling</strong>, which replaces the expensive prediction over the whole
        vocabulary with a cheap contrast against a few random words, and subsampling of frequent
        words like “the” that carry little signal. Together they are what the open-source word2vec
        tool shipped, and what most people mean by the name.
      </p>

      <h3>What it changed</h3>
      <p>
        Embeddings became the standard first layer of every language model and then of models for
        everything else: products (item2vec), users, songs, proteins, graph nodes. Stanford’s GloVe
        and Facebook’s fastText refined the idea; contextual embeddings from ELMo and BERT in 2018
        made the vector depend on the sentence, which fixed word2vec’s inability to tell a river
        bank from a savings bank. The approximate-nearest-neighbour search that embeddings demand
        grew into today’s vector databases, and retrieval-augmented generation is, at bottom, an
        embedding lookup.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Semantic search and recommendation.</strong> “Similar items” and “you might also like” are nearest-neighbour queries over embeddings.</li>
        <li><strong>Vector databases and RAG.</strong> Pinecone, pgvector and friends index the descendants of these vectors; a RAG pipeline embeds the query and finds its neighbours.</li>
        <li><strong>The first layer of every LLM</strong> is still a lookup table of token vectors, learned the same way, just larger.</li>
        <li><strong>Bias audits.</strong> The analogy trick also surfaced stereotypes in training text, which began the study of bias in learned representations.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  attention: (
    <>
      <h3>The problem: reading one word at a time</h3>
      <p>
        Until 2017 the best models of language were recurrent: they read a sentence left to right,
        carrying a hidden state that summarised everything so far, one step per word. That has two
        costs. Training cannot be parallelised across the sentence, because step ten needs step
        nine, so the biggest models took weeks on the fastest hardware. And a word at the end of a
        long sentence has to reach a word at the start through every state in between; the signal
        fades, and the model forgets. An add-on called attention, introduced for translation in
        2014, let the decoder peek back at the whole input, and it helped so much that the authors
        of this paper asked whether the recurrence was needed at all.
      </p>

      <h3>The idea: let every word look at every other word, in parallel</h3>
      <p>
        The Transformer has no recurrence and no convolution. Each layer is a{' '}
        <strong>self-attention</strong> step, in which every token builds a new representation of
        itself by looking at all the tokens in the sequence and taking a weighted mix of them, with
        weights it computes on the fly, followed by a small feed-forward network applied to each
        token separately. Because nothing in a layer depends on the token before it, the whole
        sentence is processed at once, and because every token can attend to every other directly,
        distance no longer matters. Position is reinjected by adding a fixed pattern to each token’s
        vector, so the model can still tell first from last.
      </p>
      <Fig caption="The whole model. Six identical encoder blocks, six decoder blocks, each a self-attention step and a feed-forward step with residual connections. GPT keeps only the decoder half; BERT only the encoder.">
        <TransformerBlocks />
      </Fig>
      <Callout>
        Attention is a soft lookup. Each token asks a question (its query), every token advertises
        what it holds (its key), and the answer is a blend of what the best matches contain (their
        values). The weights are learned, so the model decides for itself what “relevant” means in
        each head and each layer.
      </Callout>

      <h3>How it works</h3>
      <p>
        From each token’s vector the model computes three smaller vectors by multiplying with
        learned matrices: a <strong>query</strong>, a <strong>key</strong> and a <strong>value</strong>.
        The score between two tokens is the dot product of one’s query with the other’s key,
        scaled down by the square root of the vector size so the softmax stays well-behaved. Softmax
        across a token’s scores gives its attention weights, and the token’s new vector is the
        weighted sum of the values. That whole computation is a couple of matrix multiplications,
        which is exactly what a GPU is for.
      </p>
      <Fig caption="Scaled dot-product attention as a data flow. The paper runs eight of these heads in parallel with different learned matrices, so one head can track syntax while another tracks reference.">
        <QKVFlow />
      </Fig>
      <AttentionHeatmap />
      <p>
        The rest of the architecture is support. <strong>Multi-head</strong> attention runs eight
        such lookups side by side so that different heads can learn different relations; residual
        connections and layer normalisation keep gradients healthy through many layers; the decoder
        masks future positions so it can only attend to what it has already generated. The paper’s
        base model trained in twelve hours on eight GPUs and beat the best translation systems of
        the day; the large model trained in three and a half days and set new records on both of
        its benchmarks.
      </p>

      <h3>What it changed</h3>
      <p>
        Within eighteen months the Transformer had replaced recurrent networks almost everywhere.
        BERT used the encoder for understanding; GPT used the decoder for generation; T5 used both.
        Then it left language: Vision Transformers cut images into patches and treated them as
        tokens, AlphaFold 2 used attention over amino acids, Whisper used it for speech. Every large
        language model since is a scaled-up decoder stack from this paper, and the title’s claim,
        provocative in 2017, is now a description of the industry.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Every LLM, image generator and speech model</strong> you have used since 2020.</li>
        <li><strong>The context window.</strong> Attention compares every token with every other, so its cost grows with the square of the length; that is why context length is a headline feature and an engineering problem.</li>
        <li><strong>The KV cache.</strong> Keys and values of earlier tokens are stored during generation so they are not recomputed; serving cost and “context engineering” both come down to managing it.</li>
        <li><strong>Attention maps as explanations</strong>, imperfect but useful, when someone asks what a model was looking at.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  'gpt-3': (
    <>
      <h3>The problem: a new training run for every task</h3>
      <p>
        By 2019 the recipe for language tasks was settled: pretrain a Transformer on a large
        corpus, then <strong>fine-tune</strong> a copy of it on thousands of labelled examples for
        each task you cared about. It worked well and it did not scale as a way of working.
        Every task needed a dataset, a training run and its own copy of the weights; the labelled
        data was often the bottleneck; and a model tuned for one task forgot how to do the others.
        People, by contrast, pick up a new task from a sentence of instruction and a couple of
        examples. GPT-2 had hinted that a big enough language model might too.
      </p>
      <Fig caption="Two workflows. Fine-tuning produces a specialised copy of the model per task from labelled data. Prompting keeps one frozen model and describes the task in its input.">
        <PretrainThenPrompt />
      </Fig>

      <h3>The idea: make the model large enough that the prompt is the program</h3>
      <p>
        The authors trained a decoder-only Transformer with 175 billion parameters, ten times
        larger than anything before it, on about 300 billion tokens of filtered web text, books and
        Wikipedia, and then never updated its weights again. Instead they evaluated it by{' '}
        <strong>in-context learning</strong>: writing the task into the prompt, either as an
        instruction alone (zero-shot), one worked example (one-shot), or a handful (few-shot, up to
        what fits in the 2,048-token context). The model continues the text, and continuing it
        correctly is the task.
      </p>
      <Callout>
        Nothing is learned in the usual sense at prompt time; the weights are frozen. What the
        examples do is tell the model which of the countless patterns it absorbed during training
        is the one you want. The bigger the model, the more patterns it has, and the better it
        reads the hint.
      </Callout>

      <h3>How it works</h3>
      <p>
        The paper is mostly measurement. Eight models from 125 million to 175 billion parameters
        were trained the same way and tested on more than two dozen benchmarks in each of the three
        prompting modes, and the headline chart shows two things at once: accuracy rises steadily
        with size, and the benefit of adding examples to the prompt rises with size too. The small
        models barely use the examples; the large one reads them like instructions.
      </p>
      <Fig caption="The paper’s central result, schematically. All three prompting modes improve with scale, and the gap between zero-shot and few-shot widens: larger models are better at reading the examples.">
        <InContextCurve />
      </Fig>
      <FewShotPrompt />
      <p>
        Some of the results surprised the authors. The largest model did two-digit addition nearly
        perfectly from a few examples, unscrambled words, translated between languages it had seen
        mostly incidentally, and wrote news articles that human readers identified as
        machine-written only slightly better than chance. Others were honest failures: common-sense
        reasoning benchmarks and some reading-comprehension tasks stayed well behind fine-tuned
        systems, and the paper devotes a section to the bias the model absorbed from the web and
        the energy its training consumed.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>mode</th><th>what the prompt contains</th><th>what changes in the model</th></tr></thead>
          <tbody>
            <tr><td>fine-tuning</td><td>nothing special; the task is in the weights</td><td>all of them, per task</td></tr>
            <tr><td>zero-shot</td><td>an instruction</td><td>nothing</td></tr>
            <tr><td>one-shot</td><td>an instruction and one example</td><td>nothing</td></tr>
            <tr><td>few-shot</td><td>an instruction and several examples</td><td>nothing</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>What it changed</h3>
      <p>
        GPT-3 turned a model into an interface. OpenAI exposed it through an API weeks after the
        paper, and “prompt engineering” became a job description; the instruction-following
        training that produced ChatGPT two years later was built on exactly this model and
        exactly this observation. The scaling thesis, that capability keeps arriving with size,
        set the research agenda and the capital expenditure of the field for the years that
        followed, and the next paper on this list is the measurement that justified it.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Every chat and copilot product.</strong> A system prompt plus examples is few-shot prompting with a nicer interface.</li>
        <li><strong>Prompt templates in code.</strong> The <code>f-string</code> with three examples in it is this paper, in production.</li>
        <li><strong>Evaluation by prompting.</strong> Benchmarks now report zero- and few-shot numbers by default because this paper did.</li>
        <li><strong>The debate about what in-context learning is</strong>, which is still open and still shapes how models are trained.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  'scaling-laws': (
    <>
      <h3>The problem: should we build a bigger one?</h3>
      <p>
        By the end of 2019 bigger language models had been better at every step from GPT to GPT-2,
        but nobody knew whether that would continue, by how much, or at what cost. Training the
        next model was a bet of millions of dollars on an unmeasured trend. Three questions had no
        quantitative answer. If we double the parameters, how much does the loss fall? If we have a
        fixed compute budget, should it go to a larger model or to more data? And does the shape of
        the network, its depth and width, matter as much as its size?
      </p>

      <h3>The idea: measure the trend, and it turns out to be a power law</h3>
      <p>
        Kaplan and colleagues at OpenAI trained hundreds of models across seven orders of magnitude
        of size and plotted the test loss against parameters, dataset size and compute. On
        logarithmic axes the points fell on straight lines. Loss as a function of model size,{' '}
        <em>N</em>, is (N<sub>c</sub>/N)<sup>0.076</sup>; as a function of data, <em>D</em>, it is
        (D<sub>c</sub>/D)<sup>0.095</sup>; as a function of compute, a similar law with exponent
        0.050. The architectural details that researchers spent their time on, depth versus width,
        the number of heads, mattered far less than the sheer count of parameters, within wide
        limits.
      </p>
      <Fig caption="The three laws. Plotted on logarithmic axes, loss against parameters, data and compute is a straight line, which means a power law. Small exponents mean slow progress per unit, but the lines did not bend over seven orders of magnitude.">
        <PowerLawLines />
      </Fig>
      <Callout>
        Predictability is the result. If the loss of a model ten times larger can be read off a
        line before training it, then the decision to build it stops being a gamble and becomes a
        budget. That is why the paper mattered to the people choosing what to spend.
      </Callout>

      <h3>How it works</h3>
      <p>
        The second finding is about allocation. Large models are more <strong>sample-efficient</strong>:
        they reach a given loss having seen fewer tokens. So for a fixed budget the paper concluded
        that most of the increase should go to model size, with data growing more slowly, and that
        a model should be trained well short of convergence. The calculator below uses the paper’s
        fitted constants, and lets you vary the data-to-parameter ratio, because the ratio is where
        the story continued.
      </p>
      <ScalingLawCalc />
      <p>
        In 2022, DeepMind’s Chinchilla paper re-ran the experiment with the learning-rate schedule
        set correctly for each run and found a different split: parameters and data should grow
        together, about twenty tokens per parameter. Under the original recipe Gopher had 280
        billion parameters trained on 300 billion tokens; under the new one, the same compute
        bought a 70 billion-parameter model trained on 1.4 trillion tokens, and the smaller model
        won on almost every benchmark while costing a quarter as much to run. The power laws
        survived; the exponents and the advice did not.
      </p>
      <Fig caption="Same compute, two recipes. The 2020 allocation favours a huge model on modest data; the 2022 correction trains a model a quarter the size on nearly five times the tokens, and it scores higher.">
        <ChinchillaShift />
      </Fig>

      <h3>What it changed</h3>
      <p>
        This paper, with GPT-3 six months later, is the quantitative case for scaling, and the
        reason training budgets went from millions to billions: the lines said the money would buy
        something. Chinchilla corrected the split; LLaMA and its successors then went past it,
        training small models on far more than twenty tokens per parameter because a model that is
        cheap to serve is worth more than one that is optimal to train. Scaling laws are now
        measured for everything, from data mixtures to inference-time compute, and “does it follow
        a clean scaling law” is the first question asked of any new technique.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Model cards and launch posts</strong> quoting parameters and training tokens: the two axes of this paper.</li>
        <li><strong>Compute-optimal versus inference-optimal</strong> as a design decision, when a team picks a model size.</li>
        <li><strong>Loss curves on log axes</strong> in every training report, and the expectation that they be straight.</li>
        <li><strong>The economics of the field.</strong> A small exponent means each halving of loss costs orders of magnitude more compute; that arithmetic is the reason for the data centres.</li>
      </ul>
    </>
  ),
}
