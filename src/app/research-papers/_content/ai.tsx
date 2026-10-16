/**
 * AI & Machine Learning — five explainers, problem first. Keyed by paper id.
 * Each one carries a worked example with real numbers, at least one Predict,
 * one table and the paper's interactive simulation, and ends with Notes.
 */
import type { ReactNode } from 'react'
import { Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
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
      <p>
        In 2011, a program that had to tell a photograph of a dalmatian from one of a fire hydrant
        did not get to decide what to look at. It ran a feature extractor that a researcher had
        designed by hand, usually SIFT or HOG, which summarised small patches of the image as
        histograms of edge directions. Those descriptors were pooled into one long vector per image
        and a linear classifier was trained on the vectors. Years of doctoral work went into the
        extractors. The classifier was the only part that learned anything from the data.
      </p>
      <p>
        On the ImageNet challenge (1.2 million training photographs, 1,000 categories) the 2011
        winner still missed the correct label in its top five guesses on about a quarter of the
        test images. In 2012 a team of three from Toronto entered a network that learned everything
        from raw pixels. Its top-5 error was 15.3 per cent; the second-best entry was at 26.2. A gap
        that size had not been seen on the benchmark before.
      </p>
      <p>
        This explainer walks through what that network computed, works one filter by hand, counts
        where its sixty million parameters sit, and shows why four specific decisions (ReLU,
        GPUs, data augmentation and dropout) separated a known idea from a working one. By the end
        you should be able to read the paper’s architecture section and say what problem each
        choice was solving, and what it cost.
      </p>

      <h3>Why the hand-built pipeline stopped improving</h3>
      <p>
        A hand-designed descriptor answers a fixed question: which edge orientations are present
        in this patch? That is a good first question. The trouble is the second and third
        questions. Is this arrangement of edges a dog’s ear, or a leaf? Are these two ears and a
        snout a face? The old pipelines never learned those intermediate concepts. They jumped from
        edge statistics straight to “dalmatian”, and a linear classifier on top can only weigh the
        evidence it is given.
      </p>
      <Fig caption="The old pipeline fixed its features and trained only the last step. AlexNet trained every step from pixels, so the intermediate concepts were learned too.">
        <HandVsLearned />
      </Fig>
      <p>
        Convolutional networks that learned all the stages already existed. LeCun’s networks read
        handwritten digits on cheques in the 1990s. The common view in 2011 was that they did not
        scale: they were slow to train, and with millions of free weights they memorised small
        datasets rather than generalising. Two things had changed by 2012. ImageNet supplied a
        labelled dataset a thousand times larger than the digit sets, and NVIDIA’s CUDA made
        graphics cards programmable for general arithmetic. The paper’s contribution is the set of
        choices that turned those two facts into a network that trained in a week and did not
        overfit.
      </p>

      <h3>One filter, worked by hand</h3>
      <p>
        A convolutional layer slides a small grid of weights across the image and, at each
        position, multiplies the weights by the pixels underneath and adds the products. Take a
        3×3 filter that responds to a vertical edge where the image gets brighter towards the
        right:
      </p>
      <pre><code>{`filter          patch A         patch B         patch C
-1  0  1        0  0  1         1  1  1         1  1  0
-2  0  2        0  0  1         1  1  1         1  1  0
-1  0  1        0  0  1         1  1  1         1  1  0`}</code></pre>
      <p>
        On patch A, only the right-hand column is lit, so the sum is 1 + 2 + 1 = 4. Patch B is
        uniformly bright: the left column contributes −4, the right column +4, and the response is
        0. Patch C has the edge the other way round, and the response is −4. A bias is added, and
        then the ReLU keeps the positive part: max(0, x). With a bias of zero, the outputs are 4, 0
        and 0. The layer has said, at each location, “a dark-to-light vertical edge is here” or
        “it is not”.
      </p>
      <p>
        Now change one thing. Shift the edge in patch A one pixel to the right in the original
        image. The same nine weights are applied at every position, so the strong response moves
        one position to the right in the output map. Nothing has to be relearned. That is weight
        sharing, and it is the assumption that makes convolution cheap: a feature that is useful in
        one part of the image is useful everywhere. A pooling layer that follows takes the maximum
        over small neighbourhoods, so a one-pixel shift often leaves the pooled output unchanged.
      </p>
      <ConvolutionDemo />
      <p>
        AlexNet did not use hand-written filters like this one. Its first layer had 96 filters of
        11×11 pixels over three colour channels, applied every fourth pixel, and all their weights
        were learned. When the authors plotted them (Figure 3 of the paper), most looked like
        oriented edge detectors and colour blobs. The network had rediscovered roughly what SIFT
        encoded, and then it went on to learn the layers that SIFT did not have.
      </p>

      <Predict q="AlexNet has about 60 million parameters across five convolutional layers and three fully connected layers. Before reading on, guess what share of the parameters are in the three fully connected layers.">
        <p>
          About 96 per cent. The first fully connected layer takes the last convolutional output,
          6×6×256 = 9,216 numbers, and connects every one to each of 4,096 units: 37.7 million
          weights in one layer. The second is 4,096 × 4,096 = 16.8 million, and the output layer is
          4,096 × 1,000 = 4.1 million. That is 58.6 million. All five convolutional layers together
          hold about 2.3 million.
        </p>
        <p>
          The arithmetic runs the other way. The convolutional layers apply their small filters at
          thousands of positions, so they perform roughly 90 per cent of the multiply-adds. The
          parameters, and so the risk of memorising, live in the fully connected layers; the time
          lives in the convolutions.
        </p>
      </Predict>

      <h3>Where the sixty million parameters live</h3>
      <p>
        The split in that answer explains where the paper aimed its fixes. Here is the count, layer
        by layer, using the shapes in the paper. The second, fourth and fifth convolutional layers
        see only 48 or 192 input channels rather than 96 or 384 because the network was cut in half
        across two GPUs, and those layers only read the maps on their own card.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>layer</th><th>filters or units</th><th>weights (approx.)</th><th>multiply-adds per image (approx.)</th></tr></thead>
          <tbody>
            <tr><td>conv1</td><td>96 × 11×11×3, stride 4</td><td>35 thousand</td><td>105 million</td></tr>
            <tr><td>conv2</td><td>256 × 5×5×48</td><td>307 thousand</td><td>224 million</td></tr>
            <tr><td>conv3</td><td>384 × 3×3×256</td><td>885 thousand</td><td>150 million</td></tr>
            <tr><td>conv4</td><td>384 × 3×3×192</td><td>664 thousand</td><td>112 million</td></tr>
            <tr><td>conv5</td><td>256 × 3×3×192</td><td>442 thousand</td><td>75 million</td></tr>
            <tr><td>fc6</td><td>9,216 → 4,096</td><td>37.7 million</td><td>37.7 million</td></tr>
            <tr><td>fc7</td><td>4,096 → 4,096</td><td>16.8 million</td><td>16.8 million</td></tr>
            <tr><td>fc8</td><td>4,096 → 1,000</td><td>4.1 million</td><td>4.1 million</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Compare the first row with a fully connected alternative. A 224×224 colour image is 150,528
        numbers. Connecting it to a modest 1,000 hidden units would take about 150 million weights,
        more than the whole of AlexNet, and those units would have to learn the same edge detector
        separately for every location. The convolution gets 96 learned detectors, usable anywhere,
        for 35 thousand weights.
      </p>
      <Fig caption="The architecture as the paper drew it: five convolutional layers that shrink the image while adding channels, three fully connected layers, a 1,000-way softmax. Each layer is split between two 3 GB GPUs, which exchange data only at certain layers.">
        <ConvNetStack />
      </Fig>

      <h3>Four decisions that made it trainable</h3>
      <p>
        <strong>ReLU.</strong> Networks of the time mostly used tanh or the logistic sigmoid as the
        non-linearity. Both flatten out for large inputs. The slope of tanh at an input of 3 is
        about 0.01, so a unit in that range passes back a hundredth of the error signal, and the
        weights feeding it barely move. ReLU’s slope is exactly 1 for any positive input. The paper’s
        Figure 1 shows a small four-layer network on CIFAR-10 reaching 25 per cent training error
        about six times faster with ReLUs than with tanh. At the scale of a week-long run, a
        six-fold difference decides whether the experiment can be done at all.
      </p>
      <p>
        <strong>Two GPUs.</strong> The authors trained on two NVIDIA GTX 580 cards with 3 GB of
        memory each, using CUDA code Krizhevsky wrote himself. Ninety passes over the 1.2 million
        images took five to six days. The network did not fit on one card, so half the filters of
        each layer live on each GPU and the halves exchange activations only at the third
        convolutional layer and in the fully connected layers. The paper reports that this
        two-card network beat a one-card network with half as many filters per layer by 1.7 points
        of top-1 error. The split was a memory workaround that happened to cost little accuracy.
      </p>
      <p>
        <strong>Data augmentation.</strong> Every training image was resized to 256×256, and on each
        pass the network saw a random 224×224 crop of it, possibly mirrored left to right. There are
        32 × 32 crop positions and two orientations, so one photograph becomes 2,048 slightly
        different training examples. The variants are highly correlated, so this is not 2,048 times
        more information, but it stops the network from memorising exact pixel positions. A second
        trick perturbed the colours along the principal components of the dataset’s RGB values,
        which the paper says cut top-1 error by over a point. At test time the network averaged
        its predictions over ten crops (four corners and the centre, plus their mirrors), which
        multiplies inference cost by ten.
      </p>
      <p>
        <strong>Dropout.</strong> During training, each unit in the first two fully connected
        layers is set to zero with probability 0.5 on every example. A unit cannot rely on any
        particular partner being present, so it has to learn features that are useful on their
        own. At test time all units are kept and their outputs are halved to keep the expected
        input the same. Dropout had been proposed by Hinton’s group earlier that year; this was its
        first big public result.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>decision</th><th>problem it addressed</th><th>what the paper reports</th><th>what it cost</th></tr></thead>
          <tbody>
            <tr><td>ReLU instead of tanh</td><td>slow learning when units saturate</td><td>about 6× faster to a fixed training error on a small benchmark</td><td>unbounded outputs; the paper added a normalisation step to compensate</td></tr>
            <tr><td>two GPUs, hand-written CUDA</td><td>a week of training instead of months; 3 GB memory ceiling</td><td>split network beat a half-width single-GPU network by 1.7 top-1 points</td><td>an architecture shaped by memory, with custom communication code</td></tr>
            <tr><td>random crops, flips, colour shifts</td><td>memorising exact images</td><td>colour shifts alone: over 1 point of top-1</td><td>ten forward passes per test image</td></tr>
            <tr><td>dropout in fc6 and fc7</td><td>overfitting in the 58 million fully connected weights</td><td>without it, “substantial overfitting”</td><td>roughly twice as many iterations to converge</td></tr>
            <tr><td>local response normalisation</td><td>large ReLU outputs drowning neighbours</td><td>1.4 points of top-1</td><td>later found unnecessary and dropped</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>Take dropout out and watch it fail</h3>
      <p>
        The paper gives a rough way to see why overfitting was the central risk. With 1,000 classes,
        each training label carries about 10 bits of information (2<sup>10</sup> ≈ 1,000). The 1.2
        million labels supply around 12 million bits of constraint. The network has 60 million
        parameters, each a 32-bit float. Nothing in the labels forces those parameters to encode
        anything general; there is ample room to store a lookup table of the training set.
      </p>
      <p>
        Run the experiment without dropout. Training error keeps falling, because the fully
        connected layers are large enough to fit the training images individually. Validation
        error falls for a while, then flattens and begins to rise as the network starts fitting the
        noise particular to each training photograph. The paper does not give the curve, only that
        overfitting without dropout was substantial. The usual response at the time would have been
        to make the network smaller, which also throws away the capacity that made it accurate.
      </p>
      <p>
        Dropout was the alternative. Halving the active units on each example acts like training a
        large family of thinner networks that share weights and averaging them at test time. The
        price was time: the authors note that dropout roughly doubled the number of iterations
        needed to converge. Data augmentation worked alongside it from the input side. The
        combination let them keep a network big enough to win.
      </p>
      <p>
        The authors also report one ablation that settled an argument about depth. Removing any
        one of the middle convolutional layers raised top-1 error by about two points, even though
        each of those layers held only about one per cent of the parameters. The depth of the
        network, not its width alone, was doing work.
      </p>

      <h3>What later work changed</h3>
      <p>
        Almost every specific choice in AlexNet was revised within three years, which is a fair
        measure of how much of the paper was engineering under constraint rather than principle.
        Zeiler and Fergus (2013) visualised what each layer responded to and found the 11×11,
        stride-4 first layer was too coarse; a 7×7 filter with stride 2 did better. The VGG networks
        (2014) used only 3×3 filters, stacked: two 3×3 layers cover the same 5×5 area as one 5×5
        filter with 18 weights per channel pair instead of 25, plus an extra non-linearity. VGG also
        reported that local response normalisation did not help, and it disappeared.
      </p>
      <p>
        Batch normalisation (2015) made deep networks far easier to train and reduced the need for
        dropout. GoogLeNet and later designs replaced the giant fully connected layers with global
        average pooling, which removed most of the parameters the table above counts. ResNet (2015)
        added skip connections that let networks reach 152 layers, and its ImageNet top-5 error was
        3.6 per cent. The two-GPU split survived in an unexpected form: grouped convolutions, where
        each filter sees only a subset of input channels, became a deliberate design tool in
        ResNeXt and the mobile networks.
      </p>
      <p>
        The idea that lasted longest came from the paper’s Figure 4. The authors took the 4,096
        numbers in the last hidden layer as a description of an image and showed that images with
        nearby vectors looked semantically alike, even when their pixels did not. Within a year,
        other groups showed that those features, lifted out of a network trained on ImageNet, beat
        hand-designed features on unrelated vision tasks. Pretrain on a large labelled set, then
        reuse the representation elsewhere: that pattern carried into language as well.
      </p>

      <h3>When this design is the wrong starting point</h3>
      <p>
        Nobody should build an AlexNet in 2026 except to learn from it. For a new vision task with a
        few thousand labelled images, the sensible start is a pretrained network (a ResNet,
        EfficientNet or Vision Transformer) fine-tuned on your data; training from scratch repeats
        the overfitting problem above with far less data than ImageNet. On a phone or a
        microcontroller, its 60 million parameters and ten-crop testing are the wrong trade, and
        architectures built for efficiency do much better per operation. With very large datasets,
        Transformers applied to image patches now match or beat convolutional networks. What the
        paper still teaches is the reasoning: find where the parameters and the arithmetic sit, and
        aim each fix at the part that is failing.
      </p>

      <h3>How to read the original</h3>
      <p>
        The paper is nine pages and readable in an evening. Start with Section 3, the
        architecture, which is ordered by the authors’ own estimate of importance: ReLU first,
        then the multi-GPU split, then normalisation and pooling. Section 3.5 and Figure 2 give the
        overall layout; Figure 2 is famously cropped at the top, and the stated 224-pixel input
        does not quite produce the 55×55 first-layer output (227 does), so do not lose time
        reconciling it. Read Section 4 on overfitting in full; it is where the 10-bits argument and
        the augmentation details live.
      </p>
      <p>
        Skim the local response normalisation formula in Section 3.3; it no longer matters. In
        Section 6, look for the difference between the single-network result and the ensemble: the
        15.3 per cent winning figure averaged seven networks, two of them pretrained on a larger
        ImageNet release, while one network alone was around 18 per cent on validation. That is
        still far ahead of the runner-up, but it is worth knowing what was compared. Then spend
        time on Figures 3 and 4, the learned filters and the nearest-neighbour images, which make
        the case for learned features better than any table.
      </p>
      <p>
        AlexNet showed that a network could learn what to look for in pixels, given enough examples
        and arithmetic. Words have no pixels. The next paper, word2vec, asks what the equivalent of
        a learned edge detector is for vocabulary, and answers it with a model that is
        deliberately much simpler than this one.
      </p>
      <Notes items={[
        'A convolutional layer applies the same small filter everywhere, so it needs far fewer weights than a fully connected layer and responds to a pattern wherever it appears.',
        'In AlexNet about 96 per cent of the parameters sit in the fully connected layers, while the convolutional layers do roughly 90 per cent of the arithmetic.',
        'ReLU let the network train several times faster because its slope does not shrink for large inputs, which made a week-long run on two GPUs feasible.',
        'Dropout and data augmentation attacked overfitting from two sides and cost extra training time and ten-crop testing.',
        'Most of the specific choices (11×11 filters, local normalisation, the GPU split) were replaced within three years; the lasting results were depth, learned features and transfer.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  word2vec: (
    <>
      <p>
        Suppose it is 2012 and you are building a sentiment classifier for product reviews. Your
        training set contains the word “excellent” hundreds of times and “superb” twice. The model
        learns a strong positive weight for “excellent” and almost nothing for “superb”, because to
        the model they are unrelated symbols: entry 14,302 and entry 41,977 in a vocabulary. Any
        knowledge about one word has to be learned again, from scratch, for every other word.
      </p>
      <p>
        Word2vec is the name for two papers Tomas Mikolov and colleagues at Google published in
        2013 and the open-source tool that came with them. They trained a very cheap model on
        billions of words of ordinary text and got, for every word, a vector of a few hundred
        numbers in which “superb” sits next to “excellent”. Those vectors could be downloaded and
        dropped into any model as its first layer.
      </p>
      <p>
        This explainer follows how the model learns from a five-word sentence, works one training
        update by hand with negative sampling, and then looks hard at the famous analogy results:
        what they measure, and how far to trust them. The first paper (Efficient Estimation of Word
        Representations in Vector Space) introduced the models; the second, a few months later,
        supplied the training tricks the tool shipped with. We treat them together, as most people
        do.
      </p>

      <h3>Why one-hot vectors teach a model nothing about neighbours</h3>
      <p>
        The default input representation was a one-hot vector: as long as the vocabulary, all zeros
        except a one at the word’s position. The dot product of any two different one-hot vectors
        is zero. Every word is exactly as far from every other word, so similarity has to come
        from somewhere else, and in a linear classifier it comes from nowhere.
      </p>
      <Fig caption="Two ways to hand a word to a model. One-hot is a position in a list and says nothing about any other word. A dense vector has a few hundred learned numbers, and words used alike end up close together.">
        <OneHotVsDense />
      </Fig>
      <p>
        The idea that would fix it was old. Linguists had argued since the 1950s that words that
        occur in similar contexts tend to have similar meanings. Bengio’s neural language model
        (2003) already learned a dense vector per word as a side effect of predicting the next
        word. Latent semantic analysis got vectors by factorising a word-document count matrix. The
        problem was cost. Neural language models took weeks to train on a few hundred million
        words, and the vectors improve with more text. Nobody could afford to train on the billions
        of words that were sitting on the web.
      </p>

      <h3>Mikolov’s cost argument: remove the hidden layer</h3>
      <p>
        The first paper is, at heart, an accounting exercise. It writes down the number of
        operations per training example for each model and asks which term dominates. For a
        feed-forward neural language model that reads N previous words, each a D-dimensional
        vector, through a hidden layer of H units, and predicts one of V vocabulary words, the cost
        is roughly N·D (look up the inputs) + N·D·H (the hidden layer) + H·V (score every word in
        the vocabulary).
      </p>
      <p>
        Put in numbers of the size the paper discusses: N = 10, D = 500, H = 500 and a vocabulary of
        V = 1,000,000. The lookup is 5,000 operations, the hidden layer 2.5 million and the output
        layer 500 million. A known trick, the hierarchical softmax, replaces the output layer with a
        walk down a binary tree of the vocabulary, about log<sub>2</sub>(1,000,000) ≈ 20 steps, so
        H·V becomes 500 × 20 = 10,000. Now the hidden layer is 99 per cent of the work.
      </p>
      <p>
        So remove it. In the paper’s two new models, a word’s vector is used directly to make the
        prediction, with no hidden layer and no non-linearity. Continuous bag-of-words (CBOW)
        averages the vectors of the surrounding words and predicts the middle one. Skip-gram goes
        the other way: it takes the middle word and predicts each surrounding word in turn. With a
        context of up to 10 words, 300-dimensional vectors and the hierarchical softmax, skip-gram
        costs about 10 × (300 + 300 × 20) ≈ 63,000 operations per example, around forty times less
        than the neural language model above. The paper reports learning good vectors from 1.6
        billion words in under a day.
      </p>
      <Fig caption="Skip-gram. The centre word’s row in an embedding table is its vector, and that vector alone is used to predict each word in a window around it. Words that keep the same company end up with similar rows.">
        <SkipGram />
      </Fig>
      <p>
        The authors were explicit about what they gave up. A model this simple is a worse language
        model; it cannot represent the order of words in its window, and it cannot compose meanings
        non-linearly. Their bet was that for learning word vectors, a simple model trained on far
        more text would beat a rich model trained on less. The paper’s tables bear this out.
      </p>

      <Predict q="Skip-gram with a window of 2 reads the sentence “cats chase small grey mice”. How many (centre, context) training pairs does it produce, and which pairs involve “small”?">
        <p>
          Fourteen. Each word pairs with up to two words on each side, but the words near the ends
          have fewer neighbours: “cats” gets 2 pairs, “chase” 3, “small” 4, “grey” 3, “mice” 2.
        </p>
        <p>
          With “small” as the centre, the pairs are (small, cats), (small, chase), (small, grey)
          and (small, mice). In the real tool, the window size for each centre word is drawn at
          random between 1 and the maximum, so close neighbours appear in more pairs than distant
          ones. That is a cheap way to weight nearby words more heavily.
        </p>
      </Predict>

      <h3>One training update with negative sampling, by hand</h3>
      <p>
        Each word has two vectors: an input vector, used when it is the centre word, and an output
        vector, used when it is being predicted. The score for a pair is the dot product of the
        centre word’s input vector with the context word’s output vector. With a full softmax, the
        model turns the score into a probability by comparing it against the scores of every word
        in the vocabulary. For a million-word vocabulary and 300 dimensions, that is 300 million
        multiply-adds for a single pair.
      </p>
      <p>
        The second paper replaced this with negative sampling. Instead of asking “which of a million
        words is the context?”, the model is asked a yes-or-no question for the real pair and for k
        fake pairs made by drawing random words: is this a real neighbour? Take the pair (small,
        grey) with toy three-dimensional vectors and k = 2 noise words, “piano” and “election”.
      </p>
      <pre><code>{`input  v(small)    = ( 0.2, -0.1,  0.4)
output u(grey)     = ( 0.3,  0.2,  0.5)   real context
output u(piano)    = ( 0.1,  0.4, -0.2)   noise
output u(election) = (-0.3,  0.1,  0.2)   noise

score(grey)     = 0.06 - 0.02 + 0.20 =  0.24   sigmoid = 0.560
score(piano)    = 0.02 - 0.04 - 0.08 = -0.10   sigmoid = 0.475
score(election) =-0.06 - 0.01 + 0.08 =  0.01   sigmoid = 0.503`}</code></pre>
      <p>
        The model wants the sigmoid of the real pair’s score near 1 and the sigmoids of the noise
        pairs near 0. Right now it is close to a coin toss on all three, and the loss is
        −log(0.560) − log(1 − 0.475) − log(1 − 0.503) ≈ 0.58 + 0.64 + 0.70 = 1.92.
      </p>
      <p>
        The gradient for v(small) is a weighted sum of the three output vectors. The real pair
        contributes (0.560 − 1) × u(grey), pulling v(small) towards “grey”; each noise word
        contributes its sigmoid times its vector, pushing v(small) away from it. The total is about
        (−0.236, 0.152, −0.215). With a learning rate of 0.1 (larger than the tool’s default of
        0.025, so the change is visible), the new v(small) is (0.224, −0.115, 0.422). Recompute the
        scores: “grey” rises from 0.240 to 0.255, “piano” falls from −0.100 to −0.108, and
        “election” falls from 0.010 to 0.006. The output vectors are updated the same way. Repeat
        this a few billion times and words that share neighbours are pulled towards the same
        regions.
      </p>
      <p>
        The cost per pair is now k + 1 dot products. With k = 5 and 300 dimensions that is 1,800
        multiply-adds, against 300 million for the full softmax and about 6,000 for the
        hierarchical softmax. The second paper recommends k between 5 and 20 for small corpora and
        2 to 5 for large ones.
      </p>
      <p>
        Two more details decide the quality of the result, and both were found by trying things.
        Noise words are not drawn by their raw frequency, which would make almost every negative
        “the” or “of”. They are drawn in proportion to frequency raised to the power 3/4. If “the”
        has frequency 0.05 and a rarer word 0.0001, the raw odds are 500 to 1; after the 3/4 power
        they are about 106 to 1, so rare words get chosen as negatives more often. And frequent
        words are thrown away at random before training, with probability 1 − √(t/f) for a word of
        frequency f and a threshold t around 10<sup>−5</sup>. For “the” at 0.05, that discards
        about 98.6 per cent of occurrences. A word with frequency 10<sup>−4</sup> loses about 68 per
        cent; anything rarer than the threshold is kept. The paper reports that this both speeds up
        training and improves the vectors of rare words, because the window now reaches past the
        filler words to something informative.
      </p>

      <h3>Where the analogies come from, and how far to trust them</h3>
      <p>
        The result the papers are remembered for was a test, not a training objective. The first
        paper built a set of 8,869 semantic questions (Athens is to Greece as Oslo is to what?) and
        10,675 syntactic ones (good is to better as rough is to what?). To answer “a is to b as c is
        to ?”, take the vector b − a + c and find the nearest word by cosine similarity. A question
        counts as correct only if the nearest word is exactly the expected one, so a synonym scores
        zero.
      </p>
      <p>
        Why should subtraction mean anything? Consider what the training pushes towards. “King” and
        “queen” appear in many of the same contexts (crown, throne, reign), and differ mostly in
        the contexts where “man” and “woman” also differ (he, she, his, her). If the model is close
        to linear, those shared and differing contexts become shared and differing directions, and
        the difference king − queen ends up similar to man − woman. The simulation below places
        sixteen words in two dimensions so that these relations hold exactly. Real vectors have
        hundreds of dimensions and the relations hold only roughly.
      </p>
      <Word2VecPlayground />
      <p>
        Three cautions. First, in the standard evaluation the three input words are excluded from
        the answer. Later analyses found that without that exclusion, the nearest vector to king −
        man + woman is often “king” itself. The analogy usually works because “queen” is the best
        answer among the remaining words, which is a weaker claim than “the arithmetic lands on
        queen”. Second, analogy accuracy correlated imperfectly with how useful the vectors were in
        real tasks. Third, the same arithmetic reproduced stereotypes in the training text; a 2016
        paper by Bolukbasi and colleagues showed analogies associating “man” with “computer
        programmer” and “woman” with “homemaker”. The vectors encode the corpus, including its
        biases.
      </p>
      <p>
        One table in the first paper deserves more attention than the analogies get. It varies
        vector size and training data together and shows that increasing only one of them stops
        helping quickly; the gains come from growing both. That is a small, early version of the
        argument the scaling-laws paper made seven years later.
      </p>

      <Predict q="Train two skip-gram models on the same text, one with a window of 2 words and one with a window of 10. Which model will put “Hogwarts” near “Dumbledore”, and which will put it near other school names like “Sunnydale”?">
        <p>
          The wide window puts it near “Dumbledore”. Ten words on either side capture what a
          passage is about, so words from the same topic share contexts and cluster together.
        </p>
        <p>
          The narrow window puts it near other names that fill the same grammatical slot,
          including other fictional schools. Two words of context mostly capture syntax and type:
          what kind of word goes here. Later analyses, notably by Levy and Goldberg in 2014, made
          this contrast explicit. Window size is not a tuning detail; it decides which notion of
          similarity the vectors encode.
        </p>
      </Predict>

      <h3>The choices, and what each one gave up</h3>
      <Tbl>
        <table>
          <thead><tr><th>choice</th><th>what it bought</th><th>what it gave up</th><th>what later work did</th></tr></thead>
          <tbody>
            <tr><td>no hidden layer</td><td>about 40× cheaper per example; billions of words become feasible</td><td>word order within the window; non-linear composition</td><td>contextual models (ELMo, BERT) brought depth back once compute allowed</td></tr>
            <tr><td>one vector per word</td><td>a lookup table anyone can download and reuse</td><td>“bank” has one vector for rivers and money</td><td>contextual embeddings give a different vector per sentence</td></tr>
            <tr><td>whole words as units</td><td>simple vocabulary</td><td>no vector for unseen or misspelled words</td><td>fastText (2016) built vectors from character n-grams</td></tr>
            <tr><td>negative sampling</td><td>k + 1 dot products per pair instead of V</td><td>no longer a proper probability model of context</td><td>shown to factorise a shifted PMI matrix (Levy and Goldberg, 2014)</td></tr>
            <tr><td>subsampling frequent words</td><td>faster training, better rare-word vectors</td><td>a heuristic threshold to tune</td><td>kept as standard practice</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The negative-sampling row hides a nice result. Levy and Goldberg showed in 2014 that skip-gram
        with negative sampling is implicitly factorising a matrix of word–context co-occurrence
        statistics (pointwise mutual information, shifted by log k). So word2vec was not as far from
        the count-based methods it replaced as it looked. Stanford’s GloVe, published the same
        year, fit vectors to the co-occurrence counts directly and got comparable results. The
        practical difference was that word2vec streamed through text and never built the matrix.
      </p>

      <h3>When static word vectors are the wrong tool</h3>
      <p>
        If the meaning you need depends on the sentence, a single vector per word is the wrong
        representation. “The bank raised rates” and “we walked along the bank” get the same vector
        for “bank”, and no downstream model can fully untangle that. Since 2018, models such as
        BERT compute a vector per token in context, and for most language tasks they replaced
        word2vec. Sentence and document search today uses embeddings from Transformer encoders,
        not averaged word vectors.
      </p>
      <p>
        Static vectors still earn their place where cost dominates and context matters less: as
        features in small classifiers, in recommendation, where “words” are product IDs and
        “sentences” are shopping sessions (item2vec and its relatives), and wherever a few hundred
        megabytes of lookup table beats a GPU in production. The skip-gram objective itself, predict
        what co-occurs, is still the right first idea for any domain where you have sequences and
        no labels.
      </p>

      <h3>How to read the original</h3>
      <p>
        Read both papers. In the first (Mikolov, Chen, Corrado and Dean), Section 2 sets out the cost
        formulas for older models; skim the details but keep the Q expressions, because Section 3’s
        new models are justified entirely by them. Figure 1 shows CBOW and skip-gram side by side.
        Section 4.1 and Table 1 describe the analogy test set; look at the examples to see what kind
        of relation is being tested. Table 2, accuracy against vector size and training words, is
        the most instructive table in the paper. The large-scale results on a distributed system are
        worth a skim for the training times.
      </p>
      <p>
        In the second paper (Distributed Representations of Words and Phrases and their
        Compositionality), Section 2 holds negative sampling, the 3/4-power noise distribution and
        subsampling, which is what the released tool implements. Section 4 learns phrases such as
        “New York Times” as single tokens, a step most summaries leave out. Read the analogy
        numbers with the cautions above in mind: exact-match nearest neighbour, input words
        excluded.
      </p>
      <p>
        Word2vec gives each word one vector, fixed before the sentence is read. The next paper,
        Attention Is All You Need, starts from those per-token vectors and lets each one be
        rewritten by looking at the other words in the sentence, which is how “bank” finally gets
        to mean two things.
      </p>
      <Notes items={[
        'Word2vec’s speed came from deleting the hidden layer, after counting that it dominated the cost of earlier neural language models.',
        'Skip-gram turns raw text into (centre, context) pairs and learns vectors that make real pairs score high.',
        'Negative sampling replaces a softmax over the whole vocabulary with k + 1 yes-or-no questions per pair, with noise words drawn by frequency to the 3/4 power.',
        'The analogy results hold approximately, exclude the input words, and also reproduce the biases of the corpus.',
        'Window size decides the kind of similarity learned: narrow windows give words of the same type, wide windows give words of the same topic.',
        'One vector per word cannot represent words whose meaning depends on the sentence; contextual models fixed that.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  attention: (
    <>
      <p>
        In 2016 the strongest translation systems were stacks of recurrent networks. An LSTM
        encoder read the source sentence one word at a time, updating a hidden state after each
        word, and an LSTM decoder produced the translation one word at a time. Google’s production
        system stacked these layers eight deep and trained for days on about a hundred GPUs. The hardware
        was mostly idle in an important sense: step 10 of a sentence cannot start until step 9 has
        finished, so a GPU that could do thousands of things at once was doing one sentence
        position at a time.
      </p>
      <p>
        In 2017 eight researchers at Google published a model with no recurrence at all. Their
        Transformer processed every position of a sentence at once, trained in twelve hours on
        eight GPUs for its base version, and beat the best published translation results. Every
        large language model since is built from its parts.
      </p>
      <p>
        This explainer computes attention for a four-token sentence by hand, shows what changes when
        we drop the scaling factor or mask the future, and then follows the cost the design
        accepted, quadratic in sentence length, into the engineering of today’s long-context
        models.
      </p>

      <h3>Why recurrence was the bottleneck</h3>
      <p>
        A recurrent network has two problems that come from the same source. The first is speed.
        Training cannot be parallelised along the sentence, because each hidden state depends on
        the previous one. The second is distance. If the verb at position 30 needs information
        from the subject at position 2, that information has to survive 28 updates of the hidden
        state. Each update mixes in new words, and long-range information tends to fade.
      </p>
      <p>
        Bahdanau, Cho and Bengio added attention to translation in 2014 as a patch for the second
        problem. When producing each output word, the decoder computed a weighted average over all
        the encoder’s hidden states, so it could look directly at the relevant source word instead
        of relying on a single compressed summary. It helped a great deal. But the encoder and
        decoder were still recurrent, so the first problem remained. The Transformer paper asked
        whether attention alone, used everywhere, could replace the recurrence.
      </p>
      <p>
        The paper’s Section 4 makes the comparison with three quantities per layer, for a sentence
        of n tokens with vectors of size d. The table restates it.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>layer type</th><th>work per layer</th><th>sequential steps</th><th>longest path between two tokens</th></tr></thead>
          <tbody>
            <tr><td>recurrent</td><td>n · d²</td><td>n</td><td>n</td></tr>
            <tr><td>convolutional, kernel k</td><td>k · n · d²</td><td>1</td><td>log<sub>k</sub> n (dilated) or n/k</td></tr>
            <tr><td>self-attention</td><td>n² · d</td><td>1</td><td>1</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Self-attention wins on the last two columns outright. On the first it wins only when n is
        smaller than d. For the base model d = 512, and translation sentences are usually a few
        dozen tokens, so in 2017 the n² term looked harmless. The authors noted that very long
        sequences would need restricted attention. That remark became an industry, as we will see.
      </p>

      <h3>Attention over four tokens, by hand</h3>
      <p>
        Each token starts as a vector (its embedding plus a position signal). Self-attention
        multiplies that vector by three learned matrices to get three smaller vectors: a query, a
        key and a value. The query describes what this token is looking for, the key describes
        what it offers to others, and the value is what it hands over if chosen. The output for a
        token is a weighted average of all the values, with weights from how well its query
        matches each key.
      </p>
      <p>
        Take the sentence “the cat chased mice” and compute the new vector for “chased”. To keep
        the arithmetic small we use d<sub>k</sub> = 2 and write down the projected vectors
        directly; in the model they come from multiplying each token’s embedding by W<sub>Q</sub>,
        W<sub>K</sub> and W<sub>V</sub>.
      </p>
      <pre><code>{`query of "chased"  q = (2, 1)

token     key k     q·k     ÷ √2     softmax    value v
the       (0, 1)     1      0.707     0.046     (0.1, 0.0)
cat       (2, 0)     4      2.828     0.383     (1.0, 0.0)
chased    (1, 1)     3      2.121     0.189     (0.0, 0.2)
mice      (1, 2)     4      2.828     0.383     (0.0, 1.0)

output = 0.046·(0.1,0) + 0.383·(1,0) + 0.189·(0,0.2) + 0.383·(0,1)
       = (0.388, 0.421)`}</code></pre>
      <p>
        The softmax step is exp of each scaled score divided by their sum: e<sup>0.707</sup> = 2.03,
        e<sup>2.828</sup> = 16.91, e<sup>2.121</sup> = 8.34, and the total is 44.19. The verb’s
        query matched the two nouns equally and the article hardly at all. Its new vector is
        roughly an even mix of the value for “cat” (first coordinate) and the value for “mice”
        (second coordinate). After one layer, the representation of “chased” carries information
        about who chased and what was chased. A recurrent network would have had to carry “cat”
        forward through the hidden state to get the same effect.
      </p>
      <p>
        Every token does this at the same time with its own query. Stack the queries into a matrix
        Q, the keys into K and the values into V, and the whole layer is softmax(QK<sup>T</sup> /
        √d<sub>k</sub>) V: two matrix multiplications and a softmax. That form is why the model
        trains fast. GPUs are built to multiply large matrices.
      </p>
      <Fig caption="Scaled dot-product attention as a data flow. Queries are compared with keys, the scores are scaled and turned into weights, and the weights mix the values. The paper runs eight of these heads side by side, each with its own projection matrices.">
        <QKVFlow />
      </Fig>

      <Predict q="Suppose d_k is 64, as in the paper, and the query and key components are roughly independent with mean 0 and variance 1. Without dividing by √d_k, what do typical attention scores look like, and what happens to the softmax?">
        <p>
          A dot product of two such 64-dimensional vectors is a sum of 64 terms, each with variance
          1, so it has variance 64 and a standard deviation of 8. Scores of 8, 0 and −8 within one
          row are ordinary.
        </p>
        <p>
          Softmax over (8, 0, −8) gives about (0.9997, 0.0003, 0.0000). The weights are almost
          one-hot, and the gradient through a softmax output near 0 or 1 is tiny (it is roughly
          p(1 − p)), so the query and key matrices barely learn. Divide by √64 = 8 and the scores
          become (1, 0, −1); softmax gives (0.665, 0.245, 0.090), which is soft enough to learn
          from. The scaling keeps the score variance near 1 whatever the head size.
        </p>
      </Predict>

      <h3>Two variables to change: the scale and the mask</h3>
      <p>
        In our four-token example the effect of the scaling is mild, because d<sub>k</sub> = 2.
        Without it the scores are 1, 4, 3, 4 and the weights become 0.021, 0.414, 0.152, 0.414:
        slightly sharper, nothing dramatic. The Predict above shows why it matters at the paper’s
        size. The authors give the variance argument in a footnote, and note that additive
        attention (the 2014 kind) did not have the problem but was slower than a matrix multiply.
      </p>
      <p>
        The second variable is what each token is allowed to see. The encoder lets every token
        attend to every other. The decoder generates text left to right, so during training it must
        not see the words it is about to predict. The fix is a mask: before the softmax, set the
        score for every future position to minus infinity, so its weight becomes exactly zero.
        Apply that to “chased” and the score for “mice” disappears. The remaining weights are
        2.03, 16.91 and 8.34 out of 27.28: 0.074 for “the”, 0.620 for “cat”, 0.306 for “chased”
        itself. The output becomes (0.627, 0.061). Now “chased” is mostly about the cat, because
        it cannot know yet what was chased.
      </p>
      <p>
        The mask is what separates the decoder’s self-attention from the encoder’s (the decoder
        also attends to the encoder’s output), and it decided what later models became. GPT kept only the masked decoder stack and trained it to predict
        the next token. BERT kept only the unmasked encoder and trained it to fill in blanks. The
        AttentionHeatmap below lets you pick any token as the query and watch its weights change
        when the last word of the sentence changes. Its example sentence comes from Google’s blog
        post announcing the paper rather than the paper itself; the paper’s appendix shows
        similar pronoun-resolution patterns on its own sentences.
      </p>
      <AttentionHeatmap />

      <h3>Many heads, positions, and the rest of the block</h3>
      <p>
        One attention head computes one set of weights per token, and one set of weights can
        express one kind of relation. The paper splits the 512-dimensional model into eight heads of
        64 dimensions each, runs them in parallel with separate projection matrices, and
        concatenates their outputs. Because each head works in 64 dimensions, eight heads cost
        about the same as one 512-dimensional head. In the ablations (Table 3), a single head was
        0.9 BLEU worse than the best setting, and going to 32 tiny heads also hurt. Different heads
        do learn different patterns: some track the previous word, some link pronouns to nouns,
        some follow syntax.
      </p>
      <p>
        Attention on its own has no idea of order. Shuffle the input tokens and each token gets the
        same output, shuffled. The authors fixed this by adding a positional encoding to each
        embedding: sines and cosines of the position at different frequencies, so every position
        gets a distinct pattern and relative offsets correspond to simple linear transformations.
        They also tried learned position embeddings and got nearly identical results; they chose
        the sinusoids hoping they would extend to sequences longer than any seen in training.
      </p>
      <p>
        Each block wraps attention with a small feed-forward network applied to each token
        separately (512 → 2,048 → 512, with a ReLU), and each of those two sub-layers has a residual
        connection and layer normalisation. Attention moves information between tokens; the
        feed-forward layer processes it within each token. The base model stacks six such blocks in
        the encoder and six in the decoder, about 65 million parameters in all. The big model
        doubles the width and has about 213 million.
      </p>
      <p>
        The training recipe carried two details that later turned out to matter. The learning rate
        rose linearly for the first 4,000 steps and then decayed with the inverse square root of
        the step number, scaled by 1/√d<sub>model</sub>. For the base model that is a peak of about
        0.0442 × 4,000<sup>−0.5</sup> ≈ 7 × 10<sup>−4</sup> at step 4,000, halving by step 16,000.
        Without the warm-up, the original arrangement of normalisation layers tended to diverge
        early in training, a problem later work traced and fixed. The second detail was label
        smoothing: the training targets put 90 per cent of their probability on the correct token
        and spread the rest over the vocabulary. The paper reports that this made the model’s
        perplexity worse, since it learns to be less certain, while improving BLEU. That is a
        reminder that the loss being minimised and the score being reported are not the same
        thing.
      </p>
      <Fig caption="The full model in the paper: six encoder blocks and six decoder blocks, each made of attention and a per-token feed-forward layer with residual connections. GPT-style models keep only the decoder stack; BERT keeps only the encoder.">
        <TransformerBlocks />
      </Fig>
      <p>
        The results that made people pay attention were on WMT 2014 translation. The big model
        scored 28.4 BLEU on English–German, more than 2 points above the previous best including
        ensembles, and 41.8 on English–French, after 3.5 days on eight P100 GPUs. The paper’s Table
        2 compares training cost in floating-point operations, and the Transformer reached those
        scores for a fraction of the compute of the recurrent and convolutional systems it beat.
      </p>

      <h3>The cost they accepted: n²</h3>
      <p>
        Follow the quadratic term forward to a modern use. A token attends to every other token, so
        one head in one layer computes n × n scores. For a 40-token sentence that is 1,600 numbers,
        nothing. For a 100,000-token document it is 10<sup>10</sup> scores. Stored as 16-bit
        numbers, that is 20 GB for one head in one layer, before the softmax and its gradient. A
        model with 32 heads and 32 layers cannot hold that, and the arithmetic grows by a hundred
        times each time the context grows by ten.
      </p>
      <p>
        Three lines of later work responded. FlashAttention (2022) computes exact attention in
        tiles that fit in the GPU’s fast on-chip memory and never stores the full n × n matrix, so
        memory grows linearly with n even though the arithmetic is still quadratic. Sparse and
        sliding-window attention restrict which pairs are scored, giving up some direct paths for
        much less work. And at generation time, models keep the keys and values of earlier tokens
        in a KV cache so each new token only computes its own query against the stored keys. That
        cache, at roughly 2 × layers × heads × head size numbers per token, is now often the limit
        on how many users one GPU can serve, which is why later models share keys and values across
        heads (multi-query and grouped-query attention).
      </p>

      <h3>What later work changed</h3>
      <p>
        The block in today’s models is recognisably the 2017 block with a handful of revisions. Layer
        normalisation moved from after each sub-layer to before it (“pre-norm”), because the
        original placement made very deep stacks unstable without careful learning-rate warm-up;
        the paper’s warm-up schedule was partly compensating for this. Sinusoidal positions were
        largely replaced, first by learned embeddings in GPT and BERT and then by rotary position
        embeddings (2021), which encode relative position directly in the query–key dot product and
        extend better to long contexts. Most large models dropped the encoder entirely and use a
        decoder-only stack. The feed-forward layer acquired gated variants, and in some models was
        split into many experts with only a few active per token.
      </p>
      <p>
        The architecture also left language. Vision Transformers (2020) cut an image into 16×16
        patches and treat each as a token. Speech, protein structure and robotics models followed.
        The title’s claim was provocative in 2017. In practice, attention needed the feed-forward
        layers, residual connections, normalisation and positions as well, but it did replace
        recurrence almost everywhere.
      </p>

      <h3>When attention is the wrong tool</h3>
      <p>
        If the sequence is very long and the relevant information is mostly local, as in raw audio
        or some genomics and time-series data, paying n² to compare every pair is wasteful.
        Convolutions or the newer state-space models (such as Mamba) process sequences in linear
        time and are competitive there. For small datasets, attention’s lack of built-in
        assumptions about locality is a cost: a convolutional network knows nearby pixels matter
        before it sees any data, while a Vision Transformer has to learn it, and needs more data to
        do so. And when latency per token at generation time is the constraint, the KV cache and
        quadratic prefill are the first things to measure.
      </p>

      <h3>How to read the original</h3>
      <p>
        Read Section 3.2 first, with Figure 2: scaled dot-product attention and multi-head
        attention, including the footnote on why the scores are divided by √d<sub>k</sub>. Then
        Section 3.5 on positional encoding, and Section 4, “Why Self-Attention”, with Table 1;
        this is the paper’s own argument and the clearest statement of the trade it made. Figure 1,
        the full architecture diagram, is easier to follow after those.
      </p>
      <p>
        Section 5 (training) is worth a skim for the details that turned out to matter: the
        learning-rate warm-up over the first 4,000 steps, label smoothing, dropout on the residual
        connections. Table 2 holds the translation results and training costs. Table 3, the
        ablations, is the most informative table: rows A to E vary the number of heads, key size,
        model size, dropout and position encoding one at a time. The attention visualisations at
        the end of the arXiv version show heads tracking long-distance dependencies and resolving
        “its” to its noun. If you want to read the paper with code beside it, the Harvard “Annotated
        Transformer” in the reading list reproduces it line by line.
      </p>
      <p>
        The Transformer made it practical to train much larger language models, because every
        token in a batch could be processed in parallel. The next paper, GPT-3, takes the decoder
        half, scales it to 175 billion parameters, and finds that a model that large can pick up a
        new task from a few examples written into its input.
      </p>
      <Notes items={[
        'Self-attention replaces a recurrent step-by-step state with one weighted average over all tokens, computed for every token in parallel.',
        'A token’s output is a mix of value vectors, weighted by the softmax of its query’s dot products with every key.',
        'Dividing scores by √d_k keeps their variance near 1 so the softmax does not saturate and stop learning.',
        'A decoder masks future positions by setting their scores to minus infinity; that mask is what makes GPT-style next-token training possible.',
        'Attention has no sense of order on its own, so position has to be added to the inputs.',
        'The n² score matrix is the design’s main cost, and FlashAttention, sparse attention and the KV cache all exist to manage it.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  'gpt-3': (
    <>
      <p>
        In 2019, if a support team wanted to route incoming tickets by topic, the standard recipe
        was to fine-tune. Take a pretrained model such as BERT, label a few thousand tickets by
        hand, train a copy of the model on them, evaluate it, and deploy that copy. A second task,
        say detecting angry customers, meant a second labelled dataset, a second training run and
        a second copy of the weights to serve. Pretraining had made each task cheaper. It had not
        removed the per-task cycle of labelling and training.
      </p>
      <p>
        GPT-3, published by OpenAI in 2020 under the title Language Models are Few-Shot Learners,
        tested a different workflow. Train one very large language model on general text. Never
        update its weights again. For each new task, write a short description and a few solved
        examples into the input, and let the model continue the text. The paper measured how well
        that works across dozens of benchmarks and eight model sizes, and found that it improves
        steadily with scale.
      </p>
      <p>
        This explainer covers what the authors built, how a few-shot prompt is constructed and
        scored, what in-context learning does and does not mean, and where the paper’s results
        were strong, weak or compromised. It ends with how to read a 75-page paper without reading
        all 75 pages.
      </p>

      <h3>What the authors built</h3>
      <p>
        Architecturally, GPT-3 is GPT-2 made much larger: a decoder-only Transformer, trained to
        predict the next token. The largest model has 96 layers, a model width of 12,288, 96
        attention heads and a context window of 2,048 tokens, for 175 billion parameters. The
        authors trained eight sizes, from 125 million to 175 billion parameters, on the same data
        with the same recipe, so that any change in behaviour could be attributed to size.
      </p>
      <p>
        The training set was about 300 billion tokens, drawn from a mixture of sources that were
        deliberately not sampled in proportion to their size.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>source</th><th>tokens available</th><th>share of training mix</th><th>times seen in training</th></tr></thead>
          <tbody>
            <tr><td>Common Crawl (filtered)</td><td>410 billion</td><td>60%</td><td>about 0.4</td></tr>
            <tr><td>WebText2</td><td>19 billion</td><td>22%</td><td>about 3</td></tr>
            <tr><td>Books1</td><td>12 billion</td><td>8%</td><td>about 2</td></tr>
            <tr><td>Books2</td><td>55 billion</td><td>8%</td><td>about 0.4</td></tr>
            <tr><td>Wikipedia</td><td>3 billion</td><td>3%</td><td>about 3.4</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The last column is the interesting one. Higher-quality sources were repeated several times
        while most of Common Crawl was never seen even once. The authors were trading quantity for
        quality, and accepting a little overfitting on the small sources in return.
      </p>
      <p>
        The compute is easy to check with the rule that training a Transformer costs about 6
        floating-point operations per parameter per token: 6 × 175 × 10<sup>9</sup> × 300 ×
        10<sup>9</sup> ≈ 3.15 × 10<sup>23</sup>. The paper’s appendix gives 3.14 ×
        10<sup>23</sup>. Note the ratio, too: 300 billion tokens for 175 billion parameters is
        under two tokens per parameter. The scaling-laws paper, published four months earlier with
        an overlapping author list, had recommended exactly this kind of allocation: a very large
        model, trained on comparatively little data. The final paper in this category explains
        why that advice was later revised.
      </p>

      <h3>Building a few-shot prompt, token by token</h3>
      <p>
        The paper defines three settings. Zero-shot gives the model a natural-language description
        of the task and the input. One-shot adds one solved example. Few-shot adds as many examples
        as fit in the context window, typically 10 to 100 depending on the task. In all three, the
        weights are frozen; the only thing that changes is the text.
      </p>
      <Fig caption="Two workflows. Fine-tuning makes a specialised copy of the model for each task from labelled data. Prompting keeps one frozen model and describes the task in the input.">
        <PretrainThenPrompt />
      </Fig>
      <p>
        The context window sets the budget, so it is worth doing the arithmetic. Suppose a sentiment
        task has an instruction of about 12 tokens, and each worked example (a review and its label)
        is about 30 tokens. The query takes another 30. That leaves room for (2,048 − 42) / 30 ≈ 66
        examples. If the task is summarising news articles of 500 tokens each, the same window holds
        three examples and the query. Few-shot, in the paper, means “as many as fit”, and for long
        inputs that is very few.
      </p>
      <p>
        Change the number of examples and watch what each one does. Give the model only the
        instruction “Classify the sentiment of each review as positive or negative” followed by
        “Review: The headphones sound great and arrived early. Sentiment:”. A language model has
        seen many texts where “Sentiment:” is followed by a label, but also many where it is
        followed by a sentence, a score out of five, or nothing useful. Zero-shot, the answer may
        be right in substance and wrong in form. Add one example, ending in “Sentiment:
        negative”, and the format is pinned down: one lowercase word from a known set. Add more
        and the model sees both labels, which guards against it simply repeating the one label it
        has seen. The paper calls zero-shot the most challenging setting for this reason: without
        an example, even a person can be unsure what format is wanted.
      </p>
      <FewShotPrompt />
      <p>
        How is the answer read off? For free-form tasks the model generates text, which is compared
        with the reference. For multiple-choice tasks, which are most of the benchmarks, the paper
        does not let the model generate at all. It appends each candidate answer to the prompt,
        computes the likelihood the model assigns to that completion, normalised per token, and
        picks the most likely. For a few datasets it also divides by the probability of the answer
        given only a neutral prompt such as “Answer:”, so that answers which are common in general
        do not win by default. These scoring choices are set out in Section 2.4 and affect the
        numbers; they are worth knowing before comparing GPT-3’s scores with anyone else’s.
      </p>
      <p>
        Prompting is not free at inference time. A forward pass costs about 2 floating-point
        operations per parameter per token, so reading a full 2,048-token prompt with the 175-billion
        model is about 2 × 175 × 10<sup>9</sup> × 2,048 ≈ 7 × 10<sup>14</sup> operations, every time
        the task is run. The examples are re-read on every request. A fine-tuned model pays for its
        examples once, at training time.
      </p>

      <Predict q="Take a few-shot sentiment prompt with eight labelled examples, and replace the labels with random ones (some positive reviews marked negative and vice versa). Does accuracy on the query collapse to chance?">
        <p>
          For many classification tasks, it barely moves. Min and colleagues tested this in 2022
          across a range of models and tasks and found that random labels in the demonstrations
          cost only a few points in most settings. What mattered more was that the examples showed
          the right kind of input, the set of possible labels, and the format.
        </p>
        <p>
          That suggests that, in those settings, the examples mainly tell the model which task it
          is being asked to do, and the model’s pretrained knowledge does the rest. Later work by
          Wei and colleagues (2023) found the picture changes with scale: the largest models will
          follow flipped labels when the examples are consistent, overriding what they already
          know. So the answer depends on model size, which is the paper’s theme again.
        </p>
      </Predict>

      <h3>What in-context learning does and does not mean</h3>
      <p>
        The paper calls this in-context learning, and the word “learning” causes confusion. Nothing
        is stored. The weights after the request are the same as before it, and the next request
        starts with no memory of the examples. What happens is conditioning: the examples change
        the probabilities the frozen model assigns to its next tokens. The authors frame it as two
        loops. The outer loop is pretraining, which by exposure to countless patterns of text
        produces a model that can recognise a task from its description. The inner loop, within a
        single forward pass, is the model identifying which of those patterns the current prompt
        is an instance of and continuing it.
      </p>
      <p>
        That framing predicts the paper’s main figure. If the inner loop depends on how rich the
        outer loop’s repertoire is, larger models should use examples better. On a simple task of
        removing random symbols from a word, accuracy for the smallest models hardly rises as
        examples are added, while for the largest it rises steeply. Across the full benchmark suite,
        the gap between zero-shot and few-shot widens with model size.
      </p>
      <Fig caption="The paper’s aggregate result, drawn schematically. All three settings improve with model size, and the gap between zero-shot and few-shot grows: bigger models get more out of the examples.">
        <InContextCurve />
      </Fig>
      <p>
        Two practical consequences follow, both found after the paper. First, results depend on
        details that a learner in the usual sense would ignore. Zhao and colleagues (2021) showed
        that the order of the examples, and which label appears most often or last, could swing
        GPT-3’s accuracy on a classification task from near chance to near its best. Second, it is
        hard to tell whether a few-shot success reflects a skill or a memory. If the benchmark was
        on the web before the model was trained, the model may have read the answers.
      </p>

      <h3>Where scale helped, and where it did not</h3>
      <p>
        The results are uneven in instructive ways. On LAMBADA, which asks for the last word of a
        passage where the whole passage is needed to guess it, few-shot GPT-3 reached 86.4 per cent,
        against a previous best of 68.0. On closed-book TriviaQA, answering questions with no
        documents to read, it beat fine-tuned models that were also answering without retrieval.
        On the other hand, on SuperGLUE as a whole it scored 71.8 few-shot, against 89.0 for the
        fine-tuned state of the art. On WiC, which asks whether a word means the same thing in two
        sentences, it was at chance (49.4 per cent). Natural-language inference benchmarks such as
        ANLI were also near chance for every size but the largest.
      </p>
      <p>
        The arithmetic tasks show the same pattern when we change one variable at a time. The
        prompt format stays fixed; only the number of digits changes.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>task, 175B model, few-shot</th><th>accuracy</th></tr></thead>
          <tbody>
            <tr><td>2-digit addition</td><td>100.0%</td></tr>
            <tr><td>3-digit addition</td><td>80.4%</td></tr>
            <tr><td>4-digit addition</td><td>25.5%</td></tr>
            <tr><td>5-digit addition</td><td>9.3%</td></tr>
            <tr><td>2-digit multiplication</td><td>29.2%</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The authors checked whether the model was recalling sums from its training data by
        searching it for the test problems, and found only a small fraction present. The errors
        were also informative: failed answers often looked like a carry had been dropped, which is
        what a partial procedure would produce, not a lookup. But a procedure that works for two
        digits and fails for five is not the procedure a person learns at school. The model had
        found something that worked on short problems, and it did not extend.
      </p>
      <p>
        One more result became a headline. People asked to tell 200-word news articles written by
        the 175-billion model from real ones were right about 52 per cent of the time, barely above
        guessing. The authors put that finding in their broader-impacts section, next to an
        analysis of gender, race and religion associations in the model’s outputs, and an estimate
        of training energy.
      </p>

      <h3>The contamination problem, walked through</h3>
      <p>
        Benchmark contamination is the clearest example in the paper of something going wrong, and
        of a fix that cost something. The training data was 300 billion tokens of web text, and
        many benchmarks’ test sets were on the web. The authors tried to remove overlaps before
        training. After training, they found a bug in that filtering: some overlaps had stayed in.
        Retraining a model that cost over 3 × 10<sup>23</sup> operations was not an option.
      </p>
      <p>
        So they measured the damage instead. For each benchmark they built a “clean” subset by
        dropping every test example that shared a 13-token sequence with the training data, then
        compared the model’s score on the clean subset with its score on the full set. If the model
        was reciting memorised answers, it should do much worse on the clean subset. For most
        benchmarks the difference was small. For a few, the authors flagged the results with an
        asterisk or dropped them, and they discussed specific cases in Section 4.
      </p>
      <p>
        The cost of the fix is that it is an argument rather than a proof. A 13-token overlap
        filter misses paraphrases and translations of test items, and a clean subset may be easier
        or harder than the full set for reasons unrelated to contamination. The authors say as
        much. Every large-model paper since has had to make the same argument, usually with less
        candour.
      </p>

      <h3>What it cost, and what later work added</h3>
      <p>
        Holding 175 billion parameters in 16-bit precision takes 350 GB, more than any single GPU of
        2020 could store, so even inference needed a cluster of cards. The authors were open about
        the limitations in Section 5: the model repeated itself over long passages, contradicted
        itself, struggled with some kinds of common-sense physics, and showed the biases of its
        training text.
      </p>
      <p>
        The step that turned GPT-3 into a product was training it to follow instructions. OpenAI’s
        InstructGPT paper (2022) fine-tuned GPT-3 on human demonstrations and then on human
        preference rankings, and found that people preferred the outputs of a 1.3-billion-parameter
        instruction-tuned model to those of the raw 175-billion model. Chain-of-thought prompting,
        also from 2022, found that including worked reasoning in the few-shot examples improved
        multi-step problems like the arithmetic above. Both build on this paper’s observation that
        the prompt shapes behaviour; both also show the raw few-shot setting was far from the best
        a model of this size could do.
      </p>

      <h3>When prompting is the wrong tool</h3>
      <p>
        Few-shot prompting is the right first move when there are few labelled examples, many
        tasks, or a need to change the task by editing text. It is the wrong final answer when
        volume is high and the task is fixed. Every request re-reads the examples, so a prompt with
        1,500 tokens of examples pays for those tokens millions of times; a smaller fine-tuned
        model can be cheaper and faster per request and often more accurate on a narrow task.
        Prompting is also fragile in ways the user cannot see: reorder the examples, change the
        label words, or move to a new model version, and accuracy can shift. If a decision depends
        on the output, measure it on a held-out set, as the paper did, rather than trusting a few
        good-looking answers.
      </p>

      <h3>How to read the original</h3>
      <p>
        The paper is about 75 pages including appendices. Read Section 1 and its three figures
        first; Figure 1.2 is the clearest picture of in-context learning improving with scale.
        Then read Section 2 in full, especially 2.1 on the three settings and 2.4 on how answers
        are scored. Table 2.1 lists the eight model sizes, and Table 2.2 the data mix.
      </p>
      <p>
        Section 3 is long. Pick a few subsections rather than reading it straight through: 3.1 for
        LAMBADA, 3.2 for closed-book question answering, 3.9 for the arithmetic and word-scrambling
        tasks, and 3.9.4 for the news-article study. Look at the figures that plot accuracy against
        model size for each setting; the shape of the curves says more than any single number.
        Then read Section 4 on contamination and Section 5 on limitations in full. Appendix G
        contains the exact prompt for every task, and is the most practically useful part of the
        paper if you write prompts for a living.
      </p>
      <p>
        GPT-3’s argument rests on the claim that scale keeps paying. The next paper, Scaling Laws for
        Neural Language Models, is where that claim was measured, written by several of the same
        authors a few months earlier, and later corrected in a way that changed how models are
        built.
      </p>
      <Notes items={[
        'GPT-3 is a decoder-only Transformer of 175 billion parameters trained on about 300 billion tokens, roughly 3 × 10²³ operations.',
        'In zero-, one- and few-shot evaluation the weights never change; only the text of the prompt does.',
        'Larger models make better use of examples in the prompt, which is the paper’s central measured result.',
        'Few-shot accuracy depends on example order, label balance and format, and in many tasks the examples mainly identify the task rather than teach it.',
        'Strong results on some benchmarks sat beside chance-level results on others, and arithmetic accuracy fell steeply with the number of digits.',
        'The contamination analysis estimated, rather than removed, the effect of test data leaking into training.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  'scaling-laws': (
    <>
      <p>
        At the end of 2019 a research lab deciding its next language model faced a budget question
        with no quantitative answer. GPT-2 was better than GPT, and bigger. Would a model ten times
        larger be better again, and by how much? Given a fixed amount of compute, should it go into
        more parameters or more training text? Did the shape of the network, deep and narrow or
        shallow and wide, matter as much as its size? Each of those questions was being answered by
        intuition, and each wrong answer cost millions of dollars of hardware time.
      </p>
      <p>
        In January 2020, Jared Kaplan and colleagues at OpenAI published Scaling Laws for Neural
        Language Models. They trained a large number of models across about seven orders of
        magnitude of size and found that test loss followed simple power laws in parameters, data
        and compute, with the architecture’s shape mattering much less. A budget decision could now
        be made by extrapolating a line.
      </p>
      <p>
        This explainer plugs numbers into those laws, shows how they tell you to split a budget, and
        then walks through the 2022 Chinchilla paper that re-ran the experiment and changed the
        split. It closes with why many of today’s models deliberately ignore both answers.
      </p>

      <h3>What they measured, and in what units</h3>
      <p>
        The quantity on every plot is test loss: the average cross-entropy, in nats per token, of
        the model’s next-token predictions on held-out WebText2 text. Lower is better. A loss of 3
        nats means the model assigns the correct next token, on average, a probability of about
        e<sup>−3</sup> ≈ 0.05; a loss of 2 means about 0.14. It is a smooth measure of how well the
        model predicts text, not a score on any task.
      </p>
      <p>
        Three inputs were varied. N is the number of parameters, counted without the embedding
        matrices; the authors found that including embeddings made the trends noisier, and this
        choice turned out to matter later. D is the number of training tokens. C is training
        compute, which for a Transformer is about 6N floating-point operations per token, so C ≈
        6ND. The paper often expresses C in petaflop/s-days: 10<sup>15</sup> operations per second
        for a day, or 8.64 × 10<sup>19</sup> operations.
      </p>
      <p>
        The headline finding is that, when the other two inputs are not the bottleneck, loss depends
        on each as a power law. For size, L(N) = (N<sub>c</sub>/N)<sup>0.076</sup> with
        N<sub>c</sub> ≈ 8.8 × 10<sup>13</sup>. For data, L(D) = (D<sub>c</sub>/D)<sup>0.095</sup> with
        D<sub>c</sub> ≈ 5.4 × 10<sup>13</sup>. For compute, allocated as efficiently as possible, the
        exponent is about 0.050. On log-log axes a power law is a straight line, and the measured
        points sat on straight lines across the whole range tested.
      </p>
      <Fig caption="The three fits. On logarithmic axes, loss against parameters, data and compute each forms a straight line, which is what a power law looks like. The small slopes mean slow progress per unit of input, but the lines held across the whole range measured.">
        <PowerLawLines />
      </Fig>

      <h3>Plugging numbers into L(N)</h3>
      <p>
        Put a one-billion-parameter model into the size law. The ratio N<sub>c</sub>/N is 8.8 ×
        10<sup>13</sup> / 10<sup>9</sup> = 88,000. Its natural log is 11.39; multiply by 0.076 to get
        0.865; exponentiate to get a predicted loss of about 2.38 nats per token. At ten billion
        parameters the ratio is 8,800 and the loss is about 1.99. At 175 billion, GPT-3’s size, it
        is about 1.60. (These are predictions for WebText2 with the paper’s tokeniser, assuming
        unlimited data; they are not comparable with losses on other datasets.)
      </p>
      <p>
        Notice what a factor of ten did. Going from 1 billion to 10 billion parameters multiplied the
        loss by 10<sup>−0.076</sup> ≈ 0.84, a 16 per cent reduction. It will do that again from 10
        billion to 100 billion, and again after that. That is the useful property of a power law: a
        fixed multiplicative improvement for each multiplicative increase in input, with no sign of
        a wall.
      </p>
      <p>
        It also shows the cost. Halving the loss through size alone would need 2<sup>1/0.076</sup> ≈
        9,000 times more parameters. Through compute, with exponent 0.050, it would need
        2<sup>20</sup>, about a million times more operations. The laws did not promise cheap
        progress. They promised predictable progress, which is what a finance department needs.
      </p>

      <Predict q="Your compute budget grows by a factor of 10. Under the 2020 paper’s recommendation, roughly how much bigger should the model get, and how much more data should it see?">
        <p>
          The paper fits the compute-optimal model size as N ∝ C<sup>0.73</sup>, so the model
          should grow by 10<sup>0.73</sup> ≈ 5.4 times. Since C ≈ 6ND, data grows by the remainder:
          10 / 5.4 ≈ 1.9 times. Most of the extra compute goes into parameters.
        </p>
        <p>
          The reasoning in the paper is that larger models are more sample-efficient: they reach a
          given loss after seeing fewer tokens. So the best use of a budget is a large model
          trained for comparatively few steps, stopped well before it converges. As we will see,
          the 2022 answer to the same question is 3.2 times bigger and 3.2 times more data.
        </p>
      </Predict>

      <h3>Spending a budget: the 2020 answer</h3>
      <p>
        Three findings shaped the advice. First, shape barely matters: across a wide range of depths,
        widths and head counts, models with the same non-embedding parameter count reached loss
        within a few per cent of each other. Second, bigger models learn faster per token, so for a
        fixed number of tokens a bigger model always ends lower. Third, training to convergence is
        wasteful: the last stretch of a long run buys little loss for a lot of compute, and that
        compute is better spent on a larger model run for less time.
      </p>
      <p>
        Combine them and the recommendation follows. Grow parameters faster than data, about
        C<sup>0.73</sup> against C<sup>0.27</sup>. GPT-3, published four months later with several
        of the same authors, followed this pattern: 175 billion parameters, 300 billion tokens.
      </p>
      <p>
        The paper also fits a combined law for a model of size N trained on D tokens until it stops
        improving: L(N, D) = [(N<sub>c</sub>/N)<sup>0.8</sup> + D<sub>c</sub>/D]<sup>0.095</sup>,
        where 0.8 is the ratio of the two exponents. Apply it to GPT-3’s shape. The size term is
        (8.8 × 10<sup>13</sup> / 1.75 × 10<sup>11</sup>)<sup>0.8</sup> ≈ 503<sup>0.8</sup> ≈ 145.
        The data term is 5.4 × 10<sup>13</sup> / 3 × 10<sup>11</sup> = 180. The loss is (145 +
        180)<sup>0.095</sup> ≈ 1.73, worse than either the size law alone (1.60) or the data law
        alone (1.64) would suggest, because both limits bind at once.
      </p>
      <p>
        Now change one variable at a time. Ten times the parameters with the same data shrinks
        the size term to about 23, and the loss to about 1.66. Ten times the data with the same
        parameters shrinks the data term to 18, and the loss to about 1.62. Under the paper’s own
        combined formula, then, the data term was the larger of the two for a GPT-3-shaped model.
        The compute-efficient recommendation still favoured size because it assumes training is
        stopped early rather than run to convergence, and that assumption is exactly what the
        next paper challenged.
      </p>
      <p>
        The calculator below lets you spend a budget yourself. Choose total compute and a ratio of
        tokens to parameters; it solves C = 6ND for the two, and reads predicted loss off the
        paper’s size law and data law separately. Set the ratio to its minimum of 5, the closest it
        gets to GPT-3’s, then move it to 20, and watch which of the two limits moves.
      </p>
      <ScalingLawCalc />
      <p>
        The authors also noted where their laws must break. Extrapolated far enough, the
        compute-optimal curve predicts a loss lower than the data law allows for the amount of data
        it uses, which is impossible. The two lines cross somewhere around 10<sup>12</sup>
        parameters and 10<sup>4</sup> petaflop/s-days. They read that as a sign the fits would bend
        before then, possibly near the irreducible entropy of text. It is to their credit that the
        paper carries its own warning.
      </p>

      <h3>Chinchilla: the same budget, split differently</h3>
      <p>
        In 2022, Hoffmann and colleagues at DeepMind re-ran the question with more than 400 models
        and reached a different split. Their diagnosis of the difference was methodological. The
        2020 experiments used a learning-rate schedule of fixed length regardless of how many
        tokens a model was actually trained on. A model stopped early in a long cosine schedule has
        not had its learning rate decayed, so its loss is higher than it would be with a schedule
        matched to its run. That made short runs on large models look better than they were
        relative to long runs on smaller ones. With the schedule matched to each run, the optimum
        moved: parameters and tokens should grow in equal proportion, N and D each roughly
        proportional to C<sup>0.5</sup>.
      </p>
      <p>
        One of their three estimation methods fits a single formula for loss: L(N, D) = E +
        A/N<sup>α</sup> + B/D<sup>β</sup>, with E = 1.69 (the part no model can remove), A = 406.4, B =
        410.7, α = 0.34 and β = 0.28. Use it to compare two ways of spending about 5 to 6 ×
        10<sup>23</sup> operations.
      </p>
      <pre><code>{`Gopher (2021 recipe):   N = 280B, D = 300B tokens
  406.4 / 280e9^0.34  = 406.4 / 7,800 = 0.052
  410.7 / 300e9^0.28  = 410.7 / 1,635 = 0.251
  L = 1.69 + 0.052 + 0.251             = 1.99

Chinchilla:             N = 70B,  D = 1.4T tokens
  406.4 / 70e9^0.34   = 406.4 / 4,867 = 0.084
  410.7 / 1.4e12^0.28 = 410.7 / 2,518 = 0.163
  L = 1.69 + 0.084 + 0.163             = 1.94`}</code></pre>
      <p>
        Gopher’s parameter term is already small; its data term dominates. Moving compute from
        parameters to tokens shrinks the large term and grows the small one, and the total falls.
        (These losses are on DeepMind’s own dataset and are not comparable with the 2020 numbers.)
        The paper then trained Chinchilla for real, and the 70-billion model outperformed the
        280-billion Gopher on nearly every evaluation, including a rise on the MMLU knowledge
        benchmark from 60.0 to 67.5 per cent. The ratio, 1.4 trillion / 70 billion, is 20 tokens
        per parameter, and that number became the rule of thumb.
      </p>
      <Fig caption="Same compute, two recipes. The older allocation trains a very large model on modest data; the corrected one trains a model a quarter the size on nearly five times as many tokens, and it scores higher.">
        <ChinchillaShift />
      </Fig>
      <p>
        Change one variable and redo GPT-3. Its budget of 3.15 × 10<sup>23</sup> at 20 tokens per
        parameter gives N = √(C / 120) ≈ 51 billion parameters and about 1 trillion tokens. The
        Chinchilla formula predicts a loss of about 1.96 for that model, against 2.00 for 175 billion
        parameters on 300 billion tokens. Same cost, lower loss, and a model a third the size to
        serve.
      </p>
      <Tbl>
        <table>
          <thead><tr><th></th><th>Kaplan et al., 2020</th><th>Hoffmann et al., 2022 (Chinchilla)</th></tr></thead>
          <tbody>
            <tr><td>optimal parameters grow as</td><td>C<sup>0.73</sup></td><td>about C<sup>0.5</sup></td></tr>
            <tr><td>optimal tokens grow as</td><td>C<sup>0.27</sup></td><td>about C<sup>0.5</sup></td></tr>
            <tr><td>10× compute means</td><td>5.4× parameters, 1.9× tokens</td><td>3.2× parameters, 3.2× tokens</td></tr>
            <tr><td>typical tokens per parameter at GPT-3 scale</td><td>under 2</td><td>about 20</td></tr>
            <tr><td>learning-rate schedule</td><td>fixed length across runs</td><td>matched to each run’s token count</td></tr>
            <tr><td>parameters counted</td><td>excluding embeddings</td><td>including embeddings</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The last row turned out to matter too. Analyses published in 2024 found that counting only
        non-embedding parameters, and fitting on comparatively small models where embeddings are a
        large share of the total, accounts for much of the remaining gap between the two papers. The
        power-law form survived both papers. The exponents, and the advice derived from them, did
        not.
      </p>

      <h3>Training-optimal is not deployment-optimal</h3>
      <p>
        Both papers answer one question: what is the lowest loss for a fixed training budget? A
        model that will be used heavily has a second bill. Inference costs about 2N operations per
        generated or read token. Suppose a 70-billion model serves 10<sup>12</sup> tokens over its
        life, a plausible figure for a popular product. That is 2 × 70 × 10<sup>9</sup> ×
        10<sup>12</sup> = 1.4 × 10<sup>23</sup> operations, about a quarter of its training compute,
        and for a model in wide use the serving total can exceed training many times over.
      </p>
      <p>
        So teams deliberately train smaller models for far longer than Chinchilla-optimal. Meta’s
        first LLaMA models (2023) trained a 7-billion model on 1 trillion tokens, over 140 tokens per
        parameter. Llama 3’s 8-billion model (2024) saw about 15 trillion, close to 2,000 per
        parameter. Each extra token gives less than it would to a bigger model, but every token of
        inference afterwards is cheaper. The scaling laws still describe the trade; the budget being
        optimised has changed.
      </p>

      <h3>What a loss curve does not tell you</h3>
      <p>
        A smooth fall in loss does not mean smooth improvement on every task. Some benchmark scores
        sit near chance across model sizes and then rise sharply, which a 2022 paper called emergent
        abilities. A 2023 response argued that much of that sharpness comes from all-or-nothing
        metrics such as exact match, and that smoother metrics show steadier gains. Both can be
        true: loss is predictable, and the task you care about may convert loss into usefulness
        through a threshold. Planning a product on a loss extrapolation needs a separate measurement
        of how loss maps to the task.
      </p>
      <p>
        The data law assumes fresh data. High-quality text is finite, and the largest training runs
        are approaching what exists. A 2023 study of data-constrained scaling by Muennighoff and
        colleagues found that repeating data for up to about four epochs was nearly as good as new
        data, with returns falling quickly after that. When the data runs out, the line bends, and
        the paper’s laws say nothing about where. Scaling laws have since been measured for data
        mixtures, for fine-tuning and for compute spent at inference time, and each new one carries
        the same caveat: a fit holds over the range measured.
      </p>

      <h3>How to read the original</h3>
      <p>
        Start with Section 1.1 and 1.2. They summarise every result and every equation in about
        three pages, and the rest of the paper supports them. Figure 1 shows the three laws side by
        side. Then read Section 3 for the evidence, especially the figures showing that shape
        barely matters and that counting embedding parameters makes the trends messier. Section 6
        covers the compute-optimal allocation and, in 6.3, the contradiction the authors found in
        their own extrapolation.
      </p>
      <p>
        Skim the sections on batch size and learning curves unless you train models; they matter
        for practice but not for the argument. Read the Chinchilla paper alongside: its Figure 1
        overlays both recommendations, its Table 3 gives the fitted exponents from three methods,
        and its related-work section, with an appendix figure on cosine schedule length, explains
        the schedule problem. When you look at any scaling plot, ask
        what is on the vertical axis (loss on which data?), how parameters were counted, and how
        far beyond the measured range the line is being extended.
      </p>
      <p>
        That closes this set of five. AlexNet’s authors wrote in their introduction that their
        results could be improved simply by waiting for faster GPUs and bigger datasets. Eight years later this paper turned
        that remark into an equation, and two years after that Chinchilla corrected the equation. The
        Transformer and GPT-3 papers sit between them as the architecture and the interface that
        made the bet worth placing.
      </p>
      <Notes items={[
        'Kaplan et al. found test loss falls as a power law in parameters, data and compute, with architecture shape mattering much less within wide limits.',
        'A power law gives a fixed percentage gain for each tenfold increase; under the size law that is about 16 per cent per tenfold, and halving loss takes about 9,000 times more parameters.',
        'The 2020 recommendation put most of a larger budget into parameters; Chinchilla’s 2022 re-measurement split it evenly, at about 20 tokens per parameter.',
        'The disagreement came from methodology: learning-rate schedules not matched to run length, and counting only non-embedding parameters at small scale.',
        'Models that will serve many requests are often trained far past 20 tokens per parameter because inference cost scales with model size.',
        'A loss law says nothing directly about task accuracy or about what happens when fresh data runs out.',
      ]} />
    </>
  ),
}
