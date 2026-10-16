/**
 * /research-papers — twenty papers every software engineer should have read,
 * five per category, each explained on its own page from the problem outward.
 *
 * Only metadata lives here: the title, who wrote it, where it appeared, a
 * link to the original, and a short reading list. The explainers are React
 * content modules under src/app/research-papers/_content, keyed by paper id,
 * and each carries its own interactive simulation. Links go to the papers'
 * official homes (publisher, lab or arXiv) — nothing is mirrored here.
 */

export type ResourceType = 'paper' | 'video' | 'article' | 'course' | 'docs' | 'tool'

export const TYPE_LABEL: Record<ResourceType, string> = {
  paper: 'Paper',
  video: 'Video',
  article: 'Article',
  course: 'Course',
  docs: 'Docs',
  tool: 'Interactive',
}

export interface Resource {
  type: ResourceType
  title: string
  source: string
  url: string
  note: string
}

export interface Paper {
  /** url segment */
  id: string
  /** the name people actually use — "Raft", "AlexNet" */
  short: string
  title: string
  authors: string
  year: number
  venue: string
  /** the official copy of the paper */
  pdf: string
  /** one sentence: the problem it solved, in plain words */
  lede: string
  /** reading time of the explainer, minutes */
  minutes: number
  resources: Resource[]
}

export interface Category {
  id: string
  index: number
  title: string
  tagline: string
  blurb: string
  /** bright accent; the light exposure is looked up in accents.ts */
  hex: string
  papers: Paper[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'distributed-systems',
    index: 1,
    title: 'Distributed Systems',
    tagline: 'order · failure · agreement',
    hex: '#5EE9D5',
    blurb:
      'Five papers about getting many unreliable machines to behave like one. They start from the same problem, that no clock can be trusted to order events, and answer it differently: a single master, merging conflicting versions, a majority vote, and clocks that report their own error.',
    papers: [
      {
        id: 'lamport-clocks',
        short: 'Lamport clocks',
        title: 'Time, Clocks, and the Ordering of Events in a Distributed System',
        authors: 'Leslie Lamport',
        year: 1978,
        venue: 'Communications of the ACM',
        pdf: 'https://lamport.azurewebsites.net/pubs/time-clocks.pdf',
        lede: 'Defines “happened before” from messages instead of clocks and builds a counter that respects it. Read it for the state-machine idea in its second half, which every replicated database still uses.',
        minutes: 11,
        resources: [
          { type: 'video', title: 'Distributed Systems 4.1: Logical time', source: 'Martin Kleppmann · University of Cambridge', url: 'https://www.youtube.com/watch?v=x-D8iFU1d-o', note: 'A clear lecture on happens-before, Lamport clocks and vector clocks, with the same examples drawn out step by step.' },
          { type: 'article', title: 'Lamport on the paper, in his own words', source: 'lamport.azurewebsites.net', url: 'https://lamport.azurewebsites.net/pubs/pubs.html#time-clocks', note: 'His publication page has a short note on how the idea came about and why he thinks people cite it for the wrong reason.' },
        ],
      },
      {
        id: 'mapreduce',
        short: 'MapReduce',
        title: 'MapReduce: Simplified Data Processing on Large Clusters',
        authors: 'Jeffrey Dean, Sanjay Ghemawat',
        year: 2004,
        venue: 'OSDI',
        pdf: 'https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/',
        lede: 'Runs a two-function program over terabytes on thousands of failing machines. Read it for the fault-tolerance reasoning: which work is re-run, which is not, and what the programmer must promise.',
        minutes: 12,
        resources: [
          { type: 'video', title: 'MIT 6.824 Lecture 1: Introduction and MapReduce', source: 'MIT · Robert Morris', url: 'https://www.youtube.com/watch?v=cQP8WApzIQQ', note: 'The opening lecture of the best distributed-systems course on the web walks through this exact paper.' },
          { type: 'course', title: '6.824 Distributed Systems', source: 'MIT', url: 'https://pdos.csail.mit.edu/6.824/', note: 'Lab 1 has you implement MapReduce yourself; nothing teaches the paper better.' },
        ],
      },
      {
        id: 'dynamo',
        short: 'Dynamo',
        title: "Dynamo: Amazon's Highly Available Key-value Store",
        authors: 'Giuseppe DeCandia, Deniz Hastorun, Madan Jampani, Gunavardhan Kakulapati, Avinash Lakshman, Alex Pilchin, Swaminathan Sivasubramanian, Peter Vosshall, Werner Vogels',
        year: 2007,
        venue: 'SOSP',
        pdf: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
        lede: 'A key-value store that keeps accepting writes during failures and hands conflicting versions to the application. Read it to see exactly what “eventually consistent” costs, measured in production.',
        minutes: 12,
        resources: [
          { type: 'article', title: 'A Decade of Dynamo', source: 'Werner Vogels · All Things Distributed', url: 'https://www.allthingsdistributed.com/2017/10/a-decade-of-dynamo.html', note: 'The CTO who co-authored the paper on what it got right, what changed, and how it became DynamoDB.' },
          { type: 'paper', title: 'Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service', source: 'USENIX ATC 2022', url: 'https://www.usenix.org/conference/atc22/presentation/elhemali', note: 'The sequel: what fifteen years of running the idea as a service taught the team.' },
        ],
      },
      {
        id: 'raft',
        short: 'Raft',
        title: 'In Search of an Understandable Consensus Algorithm',
        authors: 'Diego Ongaro, John Ousterhout',
        year: 2014,
        venue: 'USENIX ATC',
        pdf: 'https://raft.github.io/raft.pdf',
        lede: 'A consensus algorithm that keeps a replicated log identical across crashes, designed to be understood. Read it before you operate etcd, Consul or any database that replicates with a leader.',
        minutes: 12,
        resources: [
          { type: 'tool', title: 'The Secret Lives of Data: Raft', source: 'thesecretlivesofdata.com', url: 'https://thesecretlivesofdata.com/raft/', note: 'An animated walkthrough of elections and log replication; the best ten minutes you can spend on this paper.' },
          { type: 'video', title: 'Designing for Understandability: The Raft Consensus Algorithm', source: 'Diego Ongaro', url: 'https://www.youtube.com/watch?v=vYp4LYbnnW8', note: 'The author presenting the design and the reasoning behind each choice.' },
          { type: 'docs', title: 'The Raft Consensus Algorithm', source: 'raft.github.io', url: 'https://raft.github.io/', note: 'The paper, the visualisation, and a list of the many implementations in production today.' },
        ],
      },
      {
        id: 'spanner',
        short: 'Spanner',
        title: "Spanner: Google's Globally-Distributed Database",
        authors: 'James C. Corbett, Jeffrey Dean, Michael Epstein, Andrew Fikes, Christopher Frost, J. J. Furman, Sanjay Ghemawat, Andrey Gubarev, Christopher Heiser, Peter Hochschild, Wilson Hsieh, Sebastian Kanthak, Eugene Kogan, Hongyi Li, Alexander Lloyd, Sergey Melnik, David Mwaura, David Nagle, Sean Quinlan, Rajesh Rao, Lindsay Rolig, Yasushi Saito, Michal Szymaniak, Christopher Taylor, Ruth Wang, Dale Woodford',
        year: 2012,
        venue: 'OSDI',
        pdf: 'https://research.google/pubs/spanner-googles-globally-distributed-database-2/',
        lede: 'A globally replicated SQL database whose timestamps match real time, achieved by measuring clock error and waiting it out. Read it to see clock accuracy turned directly into write latency.',
        minutes: 11,
        resources: [
          { type: 'paper', title: 'Spanner, TrueTime and the CAP Theorem', source: 'Eric Brewer · Google', url: 'https://research.google/pubs/spanner-truetime-and-the-cap-theorem/', note: 'The author of the CAP theorem explains how Spanner relates to it, in eight readable pages.' },
          { type: 'docs', title: 'TrueTime and external consistency', source: 'Google Cloud Spanner docs', url: 'https://cloud.google.com/spanner/docs/true-time-external-consistency', note: 'The production documentation for the mechanism this page explains.' },
        ],
      },
    ],
  },
  {
    id: 'databases',
    index: 2,
    title: 'Databases & Storage',
    tagline: 'tables · recovery · LSM-trees · row keys · logs',
    hex: '#FFB454',
    blurb:
      'Five papers that explain how the databases you run behave: why queries stopped depending on storage layout, how a crash keeps committed writes and drops the rest, why write-heavy stores defer their sorting, how a row key decides where load lands, and how one shared log feeds many systems at once.',
    papers: [
      {
        id: 'relational-model',
        short: 'The relational model',
        title: 'A Relational Model of Data for Large Shared Data Banks',
        authors: 'E. F. Codd',
        year: 1970,
        venue: 'Communications of the ACM',
        pdf: 'https://dl.acm.org/doi/10.1145/362384.362685',
        lede: 'Codd defines data as relations related by shared values, so programs stop depending on how records are stored. Read it to see which failures the model was built to remove, and why it made the query optimiser necessary.',
        minutes: 12,
        resources: [
          { type: 'paper', title: 'Relational database: a practical foundation for productivity', source: "Codd's Turing Award lecture, 1981", url: 'https://dl.acm.org/doi/10.1145/358396.358400', note: 'Eleven years on, Codd on what the model had become and what it was always for.' },
          { type: 'course', title: 'CMU 15-445: Database Systems', source: 'Carnegie Mellon · Andy Pavlo', url: 'https://15445.courses.cs.cmu.edu/', note: 'Free lectures, notes and projects; the relational model is lecture one.' },
        ],
      },
      {
        id: 'aries',
        short: 'ARIES',
        title: 'ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging',
        authors: 'C. Mohan, Don Haderle, Bruce Lindsay, Hamid Pirahesh, Peter Schwarz',
        year: 1992,
        venue: 'ACM Transactions on Database Systems',
        pdf: 'https://dl.acm.org/doi/10.1145/128765.128770',
        lede: 'ARIES recovers a database after a crash with a write-ahead log, page LSNs and three passes: analysis, redo and undo. Read it to understand commit latency, why redo replays even failed transactions, and how recovery survives crashing again.',
        minutes: 13,
        resources: [
          { type: 'course', title: 'CMU 15-445 lectures on logging and recovery', source: 'Carnegie Mellon · Andy Pavlo', url: 'https://15445.courses.cs.cmu.edu/', note: 'Two lectures walk through write-ahead logging and the ARIES phases with worked examples.' },
          { type: 'docs', title: 'Write-Ahead Logging', source: 'PostgreSQL documentation', url: 'https://www.postgresql.org/docs/current/wal-intro.html', note: 'How a database you probably run applies the idea.' },
        ],
      },
      {
        id: 'lsm-tree',
        short: 'The LSM-tree',
        title: 'The Log-Structured Merge-Tree (LSM-Tree)',
        authors: "Patrick O'Neil, Edward Cheng, Dieter Gawlick, Elizabeth O'Neil",
        year: 1996,
        venue: 'Acta Informatica',
        pdf: 'https://www.cs.umb.edu/~poneil/lsmtree.pdf',
        lede: 'The LSM-tree batches index inserts in memory and merges them into disk in large sequential passes instead of updating pages in place. Read it to reason about RocksDB, Cassandra and their compaction, tombstones and write stalls.',
        minutes: 12,
        resources: [
          { type: 'article', title: 'Log Structured Merge Trees', source: 'Ben Stopford', url: 'http://www.benstopford.com/2015/02/14/log-structured-merge-trees/', note: 'A patient, diagram-heavy explanation of the structure and its trade-offs.' },
          { type: 'docs', title: 'RocksDB: Compaction', source: 'RocksDB wiki', url: 'https://github.com/facebook/rocksdb/wiki/Compaction', note: 'The production engine behind many databases, documenting the compaction strategies this page sketches.' },
        ],
      },
      {
        id: 'bigtable',
        short: 'Bigtable',
        title: 'Bigtable: A Distributed Storage System for Structured Data',
        authors: 'Fay Chang, Jeffrey Dean, Sanjay Ghemawat, Wilson C. Hsieh, Deborah A. Wallach, Mike Burrows, Tushar Chandra, Andrew Fikes, Robert E. Gruber',
        year: 2006,
        venue: 'OSDI',
        pdf: 'https://research.google/pubs/bigtable-a-distributed-storage-system-for-structured-data/',
        lede: 'Bigtable stores a sorted map of rows, columns and timestamps, split by key range across thousands of servers with single-row atomicity. Read it to learn row-key design, which decides scan cost and hot spots in HBase, Cassandra and DynamoDB alike.',
        minutes: 12,
        resources: [
          { type: 'docs', title: 'Cloud Bigtable overview', source: 'Google Cloud', url: 'https://cloud.google.com/bigtable/docs/overview', note: 'The same system as a product; the data-model section matches the paper almost line for line.' },
          { type: 'docs', title: 'Apache HBase architecture', source: 'Apache HBase reference guide', url: 'https://hbase.apache.org/book.html#architecture', note: 'The open-source implementation of the paper, with the same regions, tablets and compactions under other names.' },
        ],
      },
      {
        id: 'kafka',
        short: 'Kafka',
        title: 'Kafka: a Distributed Messaging System for Log Processing',
        authors: 'Jay Kreps, Neha Narkhede, Jun Rao',
        year: 2011,
        venue: 'NetDB',
        pdf: 'https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf',
        lede: 'Kafka stores events in partitioned append-only logs and lets each consumer group track its own position, so a broker keeps no per-reader state. Read it to understand partitions, consumer lag, per-key ordering and at-least-once delivery.',
        minutes: 13,
        resources: [
          { type: 'article', title: 'The Log: What every software engineer should know about real-time data’s unifying abstraction', source: 'Jay Kreps · LinkedIn Engineering', url: 'https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying', note: 'The essay the paper grew into; one of the most-recommended pieces of systems writing of the last fifteen years.' },
          { type: 'docs', title: 'Kafka design', source: 'Apache Kafka documentation', url: 'https://kafka.apache.org/documentation/#design', note: 'The design section of the official docs is the paper, updated by a decade of production.' },
        ],
      },
    ],
  },
  {
    id: 'cloud',
    index: 3,
    title: 'Cloud & Infrastructure',
    tagline: 'files · traces · tails · schedulers · sandboxes',
    hex: '#4C8BF5',
    blurb:
      'Five papers on running software across thousands of machines: storing files when disks keep failing, following one request through hundreds of services, why waiting for many servers makes the slow case common, sharing one pool of machines between serving and batch work, and isolating strangers’ code on one host without paying for a full VM each.',
    papers: [
      {
        id: 'gfs',
        short: 'GFS',
        title: 'The Google File System',
        authors: 'Sanjay Ghemawat, Howard Gobioff, Shun-Tak Leung',
        year: 2003,
        venue: 'SOSP',
        pdf: 'https://research.google/pubs/the-google-file-system/',
        lede: 'GFS stores huge, append-heavy files on thousands of unreliable machines with one metadata master and three copies of every chunk. Read it to see a system designed from a written list of workload assumptions, and what a weaker consistency model buys.',
        minutes: 12,
        resources: [
          { type: 'video', title: 'MIT 6.824 Lecture 3: GFS', source: 'MIT · Robert Morris', url: 'https://www.youtube.com/watch?v=EpIgvowZr00', note: 'A lecture devoted to this paper, including its consistency model and what it gave up.' },
          { type: 'docs', title: 'HDFS Architecture', source: 'Apache Hadoop documentation', url: 'https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html', note: 'The open-source descendant; the NameNode and DataNodes are the master and chunkservers of the paper.' },
        ],
      },
      {
        id: 'dapper',
        short: 'Dapper',
        title: 'Dapper, a Large-Scale Distributed Systems Tracing Infrastructure',
        authors: 'Benjamin H. Sigelman, Luiz André Barroso, Mike Burrows, Pat Stephenson, Manoj Plakal, Donald Beaver, Saul Jaspan, Chandan Shanbhag',
        year: 2010,
        venue: 'Google Technical Report',
        pdf: 'https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-infrastructure/',
        lede: 'Dapper records one request across every service it touches as a tree of spans, sampled cheaply enough to leave on in production. Read it to understand the model behind OpenTelemetry and the costs its sampling and collection choices still carry.',
        minutes: 11,
        resources: [
          { type: 'docs', title: 'Traces', source: 'OpenTelemetry documentation', url: 'https://opentelemetry.io/docs/concepts/signals/traces/', note: "Today's open standard for the spans and traces Dapper introduced." },
          { type: 'docs', title: 'Jaeger: architecture', source: 'jaegertracing.io', url: 'https://www.jaegertracing.io/docs/latest/architecture/', note: 'An open-source tracing system built directly on the paper’s design.' },
        ],
      },
      {
        id: 'tail-at-scale',
        short: 'The Tail at Scale',
        title: 'The Tail at Scale',
        authors: 'Jeffrey Dean, Luiz André Barroso',
        year: 2013,
        venue: 'Communications of the ACM',
        pdf: 'https://research.google/pubs/the-tail-at-scale/',
        lede: 'This article shows why a request that waits for a hundred servers is usually slow even when each server rarely is, and describes hedged requests, tied requests and other ways to tolerate it. Read it before you design any fan-out or set a percentile target.',
        minutes: 11,
        resources: [
          { type: 'article', title: 'The Tail at Scale', source: 'Communications of the ACM', url: 'https://cacm.acm.org/research/the-tail-at-scale/', note: 'The article itself is short, free and readable in a sitting; this page is a warm-up for it.' },
          { type: 'docs', title: 'Hedged requests in gRPC', source: 'gRPC documentation', url: 'https://github.com/grpc/proposal/blob/master/A6-client-retries.md', note: 'The hedging policy in a widely used RPC framework, lifted straight from the paper.' },
        ],
      },
      {
        id: 'borg',
        short: 'Borg',
        title: 'Large-scale cluster management at Google with Borg',
        authors: 'Abhishek Verma, Luis Pedrosa, Madhukar Korupolu, David Oppenheimer, Eric Tune, John Wilkes',
        year: 2015,
        venue: 'EuroSys',
        pdf: 'https://research.google/pubs/large-scale-cluster-management-at-google-with-borg/',
        lede: 'Borg runs Google’s services and batch jobs on shared cells of about ten thousand machines, using priorities, quota and preemption to decide who gets what. Read it to see where Kubernetes’ model came from and how the savings from sharing were measured.',
        minutes: 12,
        resources: [
          { type: 'article', title: 'Borg, Omega, and Kubernetes', source: 'ACM Queue · Burns, Grant, Oppenheimer, Brewer, Wilkes', url: 'https://queue.acm.org/detail.cfm?id=2898444', note: 'The same authors on the lessons from three generations of cluster managers.' },
          { type: 'docs', title: 'Kubernetes overview', source: 'kubernetes.io', url: 'https://kubernetes.io/docs/concepts/overview/', note: 'Read the paper, then this: the vocabulary maps almost one to one.' },
        ],
      },
      {
        id: 'firecracker',
        short: 'Firecracker',
        title: 'Firecracker: Lightweight Virtualization for Serverless Applications',
        authors: 'Alexandru Agache, Marc Brooker, Andreea Florescu, Alexandra Iordache, Anthony Liguori, Rolf Neugebauer, Phil Piwonka, Diana-Maria Popa',
        year: 2020,
        venue: 'NSDI',
        pdf: 'https://www.usenix.org/conference/nsdi20/presentation/agache',
        lede: 'Firecracker is a minimal virtual machine monitor that lets AWS Lambda run thousands of customers’ functions on one host, each in its own KVM-isolated microVM. Read it for a clear comparison of isolation options and an honest account of what a stripped-down VMM gives up.',
        minutes: 11,
        resources: [
          { type: 'docs', title: 'Firecracker', source: 'firecracker-microvm.github.io', url: 'https://firecracker-microvm.github.io/', note: 'The open-source project, with design docs and the getting-started guide.' },
          { type: 'article', title: 'Firecracker: Lightweight Virtualization for Serverless Computing', source: 'AWS News Blog', url: 'https://aws.amazon.com/blogs/aws/firecracker-lightweight-virtualization-for-serverless-computing/', note: 'The launch post, with the numbers that motivated it.' },
        ],
      },
    ],
  },
  {
    id: 'ai',
    index: 4,
    title: 'AI & Machine Learning',
    tagline: 'learned features · word vectors · attention · prompting · scaling',
    hex: '#A78BFA',
    blurb:
      'Five papers that trace how today’s language models came to be built the way they are. Each explainer works the core idea through with small numbers you can check by hand, and says which choices later work kept and which it replaced.',
    papers: [
      {
        id: 'alexnet',
        short: 'AlexNet',
        title: 'ImageNet Classification with Deep Convolutional Neural Networks',
        authors: 'Alex Krizhevsky, Ilya Sutskever, Geoffrey E. Hinton',
        year: 2012,
        venue: 'NeurIPS',
        pdf: 'https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html',
        lede: 'Trains an eight-layer convolutional network on two GPUs and cuts the best ImageNet top-5 error by about 40 per cent. Read it to see how ReLU, dropout, augmentation and GPU code turned an old idea into one that worked.',
        minutes: 11,
        resources: [
          { type: 'video', title: 'The moment we stopped understanding AI [AlexNet]', source: 'Welch Labs', url: 'https://www.youtube.com/watch?v=UZDiGooFs54', note: 'A visual tour of what AlexNet actually learned, layer by layer.' },
          { type: 'course', title: 'CS231n: Convolutional Networks', source: 'Stanford', url: 'https://cs231n.github.io/convolutional-networks/', note: 'The course notes that taught a generation how convolutions, pooling and depth fit together.' },
        ],
      },
      {
        id: 'word2vec',
        short: 'word2vec',
        title: 'Efficient Estimation of Word Representations in Vector Space',
        authors: 'Tomas Mikolov, Kai Chen, Greg Corrado, Jeffrey Dean',
        year: 2013,
        venue: 'arXiv / ICLR workshop',
        pdf: 'https://arxiv.org/abs/1301.3781',
        lede: 'Learns a vector for every word from raw text by predicting nearby words with a deliberately tiny model. Read it for the cost argument behind that model, and to see what the famous analogies do and do not show.',
        minutes: 11,
        resources: [
          { type: 'article', title: 'The Illustrated Word2vec', source: 'Jay Alammar', url: 'https://jalammar.github.io/illustrated-word2vec/', note: 'The gentlest complete explanation of skip-gram and negative sampling, with pictures.' },
          { type: 'tool', title: 'Embedding Projector', source: 'TensorFlow', url: 'https://projector.tensorflow.org/', note: 'Fly through real word vectors in three dimensions and search for neighbours.' },
        ],
      },
      {
        id: 'attention',
        short: 'The Transformer',
        title: 'Attention Is All You Need',
        authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin',
        year: 2017,
        venue: 'NeurIPS',
        pdf: 'https://arxiv.org/abs/1706.03762',
        lede: 'Replaces recurrent networks with attention, so every token reads every other token in parallel. Read it to understand the block inside every large language model, and the n² cost that context windows still pay.',
        minutes: 11,
        resources: [
          { type: 'video', title: 'Attention in transformers, visually explained', source: '3Blue1Brown', url: 'https://www.youtube.com/watch?v=eMlx5fFNoYc', note: 'The animated explanation of queries, keys and values that this page’s diagrams are a still version of.' },
          { type: 'article', title: 'The Illustrated Transformer', source: 'Jay Alammar', url: 'https://jalammar.github.io/illustrated-transformer/', note: 'The canonical walkthrough of the architecture, block by block.' },
          { type: 'article', title: 'The Annotated Transformer', source: 'Harvard NLP', url: 'https://nlp.seas.harvard.edu/annotated-transformer/', note: 'The paper reproduced line by line as working PyTorch code.' },
        ],
      },
      {
        id: 'gpt-3',
        short: 'GPT-3',
        title: 'Language Models are Few-Shot Learners',
        authors: 'Tom B. Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah, Jared Kaplan, Prafulla Dhariwal, Arvind Neelakantan, Pranav Shyam, Girish Sastry, Amanda Askell, et al.',
        year: 2020,
        venue: 'NeurIPS',
        pdf: 'https://arxiv.org/abs/2005.14165',
        lede: 'Trains a 175-billion-parameter language model and tests it on tasks described only in the prompt, with no further training. Read it to see where few-shot prompting works, where it fails, and how benchmark leakage was handled.',
        minutes: 11,
        resources: [
          { type: 'article', title: 'How GPT3 Works: Visualizations and Animations', source: 'Jay Alammar', url: 'https://jalammar.github.io/how-gpt3-works-visualizations-animations/', note: 'A short animated explanation of what the model does with your prompt.' },
          { type: 'video', title: 'But what is a GPT? Visual intro to transformers', source: '3Blue1Brown', url: 'https://www.youtube.com/watch?v=wjZofJX0v4M', note: 'The bigger picture of what a GPT-style model computes, token by token.' },
        ],
      },
      {
        id: 'scaling-laws',
        short: 'Scaling laws',
        title: 'Scaling Laws for Neural Language Models',
        authors: 'Jared Kaplan, Sam McCandlish, Tom Henighan, Tom B. Brown, Benjamin Chess, Rewon Child, Scott Gray, Alec Radford, Jeffrey Wu, Dario Amodei',
        year: 2020,
        venue: 'arXiv',
        pdf: 'https://arxiv.org/abs/2001.08361',
        lede: 'Measures how language-model loss falls with parameters, data and compute, and finds simple power laws. Read it with the Chinchilla correction to understand how labs decide a model’s size and how much text to train it on.',
        minutes: 11,
        resources: [
          { type: 'paper', title: 'Training Compute-Optimal Large Language Models', source: 'Hoffmann et al. · DeepMind, 2022 ("Chinchilla")', url: 'https://arxiv.org/abs/2203.15556', note: 'The correction: with learning-rate schedules matched to each run, the best split is about 20 training tokens per parameter.' },
          { type: 'article', title: 'Scaling laws', source: 'Epoch AI', url: 'https://epoch.ai/blog/scaling-laws-literature-review', note: 'A readable literature review of what has been measured since.' },
        ],
      },
    ],
  },
]

export const ALL_PAPERS: Paper[] = CATEGORIES.flatMap((c) => c.papers)
export const PAPER_COUNT = ALL_PAPERS.length

export function categoryOf(paperId: string): Category {
  const c = CATEGORIES.find((cat) => cat.papers.some((p) => p.id === paperId))
  if (!c) throw new Error(`research papers: unknown paper "${paperId}"`)
  return c
}

export function paperById(paperId: string): Paper {
  const p = ALL_PAPERS.find((x) => x.id === paperId)
  if (!p) throw new Error(`research papers: unknown paper "${paperId}"`)
  return p
}

/** the next paper in reading order, wrapping from the last category to the first */
export function nextPaper(paperId: string): { paper: Paper; category: Category; newCategory: boolean } {
  const i = ALL_PAPERS.findIndex((p) => p.id === paperId)
  const next = ALL_PAPERS[(i + 1) % ALL_PAPERS.length]
  const here = categoryOf(paperId)
  const cat = categoryOf(next.id)
  return { paper: next, category: cat, newCategory: cat.id !== here.id }
}

export function prevPaper(paperId: string): Paper | null {
  const i = ALL_PAPERS.findIndex((p) => p.id === paperId)
  return i > 0 ? ALL_PAPERS[i - 1] : null
}
