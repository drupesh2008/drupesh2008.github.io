/**
 * The written chapters of the foundations pathway, keyed by stage id.
 * Rendered one per page by StageView; a stage listed in the data but
 * missing here fails the static build.
 *
 * One running example carries the whole pathway: hitcount, a small HTTP
 * service that counts page views for a blog and returns the top pages.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
import {
  LatencyLadder,
  LostUpdate,
  RoundTrips,
  Utf8Bytes,
  PointerVsFlat,
  SafeSnapshot,
} from './foundations-diagrams'

export const sections: Record<string, ReactNode> = {

  /* ── 01 · From source code to a running process ─────────────── */
  'how-code-runs': (
    <>
      <p>
        This chapter follows one small program from the text you type to the instructions a
        processor runs. The aim is practical. When a stack trace, a profile or a crash report shows
        you something strange later on, you should be able to say which layer it came from and
        what that layer was doing.
      </p>
      <p>
        The program is <strong>hitcount</strong>, and it stays with us for the whole pathway. A
        blog of about two thousand posts puts a small script on every page. When a reader leaves a
        post, the script sends one HTTP request to hitcount naming the page and how long the reader
        stayed. hitcount adds one to that page’s counter. A second endpoint returns the ten
        most-read pages, which the blog shows in its sidebar. On an ordinary day hitcount sees
        about 50 requests a second. When a post reaches the front page of a link aggregator, that
        climbs to around two thousand.
      </p>
      <p>
        Here is the first version, in Go. It is deliberately naive, and most of the chapters that
        follow find something wrong with it. For now, read it as a list of things the machine will
        have to do.
      </p>
      <pre><code>{`type Page struct {
    Path   string
    Title  string
    Views  int64
    ReadMs int64 // total reported time on page, in milliseconds
    Reads  int64 // how many time-on-page reports we received
}

var pages = map[string]*Page{}
var total int64

func hit(w http.ResponseWriter, r *http.Request) {
    q := r.URL.Query()
    path := q.Get("page")
    p, ok := pages[path]
    if !ok {
        p = &Page{Path: path, Title: fetchTitle(path)}
        pages[path] = p
    }
    p.Views++
    total++
    if ms, err := strconv.ParseInt(q.Get("ms"), 10, 64); err == nil {
        p.ReadMs += ms
        p.Reads++
    }
    w.WriteHeader(http.StatusNoContent)
}

func top(w http.ResponseWriter, r *http.Request) {
    list := make([]*Page, 0, len(pages))
    for _, p := range pages {
        list = append(list, p)
    }
    sort.Slice(list, func(i, j int) bool { return list[i].Views > list[j].Views })
    if len(list) > 10 {
        list = list[:10]
    }
    json.NewEncoder(w).Encode(list)
}

func main() {
    http.HandleFunc("/hit", hit)
    http.HandleFunc("/top", top)
    http.ListenAndServe(":8080", nil)
}`}</code></pre>
      <p>
        <code>fetchTitle</code> asks the blog’s content system for a post’s title the first time
        hitcount sees its path. We will come back to it in the network chapter, because it is the
        line most likely to take the whole service down.
      </p>

      <h3>What the processor does with p.Views++</h3>
      <p>
        A processor understands a small vocabulary of <strong>instructions</strong>. Load a value
        from memory into a register. Add two registers. Store a register back to memory. Compare
        two values. Jump to a different instruction, either always or only if the last comparison
        came out a certain way. A <strong>register</strong> is one of a few dozen slots inside the
        core that hold a 64-bit value each and can be read in a single cycle. Everything else in
        your program, including structs, maps, closures and HTTP handlers, is eventually expressed
        in that vocabulary.
      </p>
      <p>
        Take the single line <code>p.Views++</code>. On a 64-bit x86 machine it becomes something
        close to this:
      </p>
      <pre><code>{`MOVQ  p, AX           ; AX = address of this Page struct
MOVQ  32(AX), CX      ; CX = the 8 bytes found at AX + 32 (the Views field)
INCQ  CX              ; CX = CX + 1
MOVQ  CX, 32(AX)      ; write CX back to AX + 32`}</code></pre>
      <p>
        Two details are worth slowing down for. First, why 32? A Go string is stored as a pointer
        and a length, 16 bytes in total. <code>Path</code> occupies bytes 0 to 15 of the struct and{' '}
        <code>Title</code> bytes 16 to 31, so <code>Views</code> starts at byte 32. At run time the
        field has no name. It is an offset from an address, decided by the compiler. Second, the
        increment is three separate steps: read the old value, compute the new one, write it back.
        The compiler may fuse them into one instruction, <code>INCQ 32(AX)</code>, but the core
        still performs a read, an add and a write internally. That fact is harmless today and
        becomes the central bug of the concurrency chapter, when two cores run those steps on the
        same page at the same moment.
      </p>
      <p>
        The core runs a loop it never leaves: fetch the instruction at the address held in the
        instruction pointer, decode it, execute it, move the pointer on. There is no{' '}
        <code>if</code> in silicon. The line <code>if !ok</code> becomes a test of a register
        followed by a conditional jump that skips the block when the page is already known. Modern
        cores do not wait to find out which way that jump goes. They predict it and carry on
        executing down the predicted path, throwing the work away if the guess was wrong. A wrong
        guess costs on the order of 15 to 20 cycles. For hitcount the guess is almost always right,
        because after the first few minutes nearly every request is for a page that already exists.
        Branches that go the same way most of the time are close to free; branches that depend on
        unpredictable data are not, and that is one reason the same algorithm can run at very
        different speeds on different inputs.
      </p>

      <h3>Three roads from source text to instructions</h3>
      <p>
        Go is compiled ahead of time. <code>go build</code> reads the source, checks the types,
        optimises, and writes machine code for one operating system and one processor family into
        a single executable file of several megabytes. By the time hitcount starts, every
        instruction it will run already exists.
      </p>
      <p>
        That is one of three common roads. Suppose a colleague writes the same service in Python.
        CPython compiles the source to <strong>bytecode</strong>, a compact list of operations for
        an imaginary machine, and then a loop written in C reads those operations one at a time and
        carries each one out. <code>p.views += 1</code> becomes five or so bytecode operations
        (load the object, load the attribute, load the constant, add, store the attribute), and
        each of those costs the interpreter dozens of real machine instructions to dispatch and
        execute. A third colleague writes it in JavaScript for Node.js. V8 starts the same way as
        CPython, interpreting bytecode, but it watches which functions run often and what types
        flow through them. Once <code>hit</code> is hot, V8 compiles it to machine code specialised
        for the types it has seen, a <strong>just-in-time</strong> (JIT) compiler. If a later call
        breaks the assumption, say a string arrives where a number always had, V8 throws the
        specialised code away and falls back.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Road</th><th>hitcount written in</th><th>Start-up</th><th>Steady state</th><th>What you notice</th></tr>
          </thead>
          <tbody>
            <tr><td>Ahead-of-time compile</td><td>Go, Rust, C</td><td>milliseconds</td><td>fast from the first request</td><td>a build step; one binary per OS and CPU</td></tr>
            <tr><td>Bytecode interpreter</td><td>CPython</td><td>tens to hundreds of ms of imports</td><td>slowest per operation</td><td>hot loops are worth moving into C libraries</td></tr>
            <tr><td>Bytecode + JIT</td><td>Node.js, Java, C#</td><td>fast to start, slow to warm</td><td>close to compiled once warm</td><td>benchmarks change over the first seconds or minutes</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The rows blur in practice. PyPy runs Python with a JIT. Java compiles to bytecode ahead of
        time and then JITs it. “Compiled versus interpreted” describes an implementation, not a
        language. What the table gives you is a way to explain behaviour you will see.
      </p>
      <Predict q={<>We restart all three versions of hitcount and immediately send 20,000 requests. Then we wait a minute while traffic flows and send another 20,000. Which version’s numbers change most between the two runs, and why?</>}>
        <p>
          The Node.js version changes most. During the first burst, V8 is still interpreting{' '}
          <code>hit</code> and the HTTP parsing code, and it spends some of its time compiling them.
          After a minute of traffic those paths are compiled, and per-request cost drops
          noticeably. The Go version is about the same in both runs, because nothing about its
          instructions changes after start-up. The Python version is also roughly the same in both
          runs, and slower than either of the others per request, because CPython (without a JIT)
          interprets every operation every time.
        </p>
        <p>
          The practical rule: say whether a benchmark was warm or cold, and for a JIT runtime,
          discard the first part of any measurement. Also notice what the question did not ask.
          At 50 requests a second, all three versions are idle most of the time. The differences
          only matter at the spike, and even then, as later chapters show, much of each request’s
          time is spent in the kernel and on the network, not in our code.
        </p>
      </Predict>

      <h3>What happens when you run ./hitcount</h3>
      <p>
        An executable is a structured file. On Linux the format is ELF, and its header lists
        sections: machine code (<code>.text</code>), read-only constants such as the string{' '}
        <code>{'"page"'}</code> (<code>.rodata</code>), global variables with initial values
        (<code>.data</code>), and global variables that start at zero (<code>.bss</code>, where{' '}
        <code>total</code> lives). The header also names the program’s entry point.
      </p>
      <p>
        When you type <code>./hitcount</code>, the shell asks the kernel to create a new process
        and then calls <code>execve</code>, which replaces that process’s program with ours. The
        kernel builds a fresh, empty address space, maps the file’s sections into it (lazily: the
        bytes are only read from disk when first touched, which the operating system chapter
        explains), sets up a stack holding the command-line arguments and environment, and jumps to
        the entry point.
      </p>
      <p>
        For a Go program the entry point is not <code>main</code>. It is the Go runtime, which
        sets up its memory allocator and garbage collector, starts a few operating system threads,
        and creates the scheduler that will run goroutines on them. Then it runs package
        initialisation, which is where <code>pages = map[string]*Page{'{}'}</code> is actually
        created, and only then calls <code>main.main</code>. A C program built the usual way has a
        different preamble: before its own code runs, a dynamic loader (on Linux,{' '}
        <code>ld-linux-x86-64.so.2</code>) finds and maps the shared libraries it needs, such as
        the C library. Go binaries are commonly built statically, with everything inside, which is
        why they can be copied into a nearly empty container image and run.
      </p>
      <p>
        This layer explains one of the more confusing errors in operations work. Someone builds a
        program on a normal Linux distribution, copies it into a minimal Alpine container, and
        runs it. The shell replies <code>no such file or directory</code>, while{' '}
        <code>ls</code> shows the file sitting right there. The missing file is not the program.
        It is the dynamic loader named inside the program’s header, which Alpine does not ship
        because it uses a different C library. Once you know the kernel reads that header and goes
        looking for the loader, the message stops being absurd.
      </p>

      <h3>The only way out of the process is a system call</h3>
      <p>
        Inside its address space, hitcount can compute freely. It cannot touch the network card,
        the disk, or another process’s memory. Every one of those requests goes through a{' '}
        <strong>system call</strong>: a special instruction (<code>syscall</code> on x86-64) that
        switches the core into kernel mode at a fixed, trusted entry point. The kernel checks the
        arguments, does the work, and returns a result. The direct cost of the switch is in the
        range of a hundred nanoseconds to a microsecond on current hardware, depending on the call
        and on the security mitigations the kernel has enabled, and the kernel’s work also
        disturbs the caches our code was using.
      </p>
      <p>
        You can watch hitcount make these calls with <code>strace</code>. Trimmed and simplified,
        start-up and one request look like this:
      </p>
      <pre><code>{`socket(AF_INET6, SOCK_STREAM|SOCK_NONBLOCK, IPPROTO_IP) = 3
bind(3, {sin6_port=htons(8080), ...}, 28)                 = 0
listen(3, 4096)                                           = 0
epoll_ctl(4, EPOLL_CTL_ADD, 3, {EPOLLIN, ...})            = 0
...
accept4(3, {...}, [28], SOCK_NONBLOCK)                    = 7
read(7, "GET /hit?page=/posts/unicode&ms=41200 HTTP/1.1\\r\\nHost"..., 4096) = 312
write(7, "HTTP/1.1 204 No Content\\r\\nDate: "..., 87)                   = 87`}</code></pre>
      <p>
        The small numbers returned by <code>socket</code> and <code>accept4</code> are{' '}
        <strong>file descriptors</strong>: indexes into a table the kernel keeps for each process,
        listing the files, sockets and pipes it has open. Descriptor 3 is the listening socket;
        descriptor 7 is one reader’s connection. Our <code>hit</code> function runs between the{' '}
        <code>read</code> and the <code>write</code>, and nothing it does there needs the kernel.
        One request costs a handful of system calls, and the user-space work in between is a few
        microseconds.
      </p>
      <p>
        Here is how that boundary caused an outage in a service shaped like hitcount. Someone
        added a debugging line to <code>hit</code>: <code>{'log.Printf("hit %s", path)'}</code>.
        Go’s standard logger takes a lock and writes each line to standard error with its own{' '}
        <code>write</code> system call. In a container, standard error is a pipe, and on the other
        end is the container runtime’s logging process, which copies each line into a log file.
      </p>
      <p>
        On a quiet day nothing happened. Then a post went viral. Traffic rose to 2,000 requests a
        second, which meant 2,000 log lines a second, and the logging process on the host fell
        behind because it was also handling every other container’s output. A Linux pipe holds 64
        KiB by default, roughly a thousand of these lines. Once it filled, each{' '}
        <code>write</code> blocked until the reader made room. The goroutine doing that write
        blocked while holding the logger’s lock, so every other request’s log call waited for the
        lock. Within a second every handler in hitcount was parked behind one slow pipe. The CPU
        graph showed the service nearly idle, and it answered nothing.
      </p>
      <p>
        The fix was to stop logging each hit, keep a counter of hits instead, and log a summary
        line every ten seconds. Where per-event logs were genuinely needed, a buffered logger that
        drops lines when its buffer is full would also have worked. Both fixes cost something: we
        lose individual log lines, sometimes exactly the ones we would want after an incident. We
        made that choice deliberately. A counter of page views can lose a debug line; it cannot
        stop answering because a log file is slow.
      </p>

      <h3>The call stack, physically</h3>
      <p>
        When <code>top</code> calls <code>sort.Slice</code>, which calls our comparison function,
        each call gets a <strong>stack frame</strong>: a block of memory holding the return
        address and the function’s local variables. Returning releases the frame. Allocating a
        frame is just moving the stack pointer, which is why local variables that stay on the stack
        cost almost nothing compared with objects allocated on the heap. Goroutine stacks start
        small, a few kilobytes, and the runtime grows them by copying when a call chain needs more.
      </p>
      <p>
        Frames are also what a stack trace prints. Suppose a later version adds a helper that
        shortens long titles and is handed a nil page by mistake. hitcount crashes with:
      </p>
      <pre><code>{`panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation code=0x1 addr=0x10 pc=0x6d2f1a]

goroutine 41 [running]:
main.shortTitle(...)
        /src/hitcount/top.go:58
main.top({0x8a1e40, 0xc0001c2000}, 0xc0001b8100)
        /src/hitcount/top.go:31 +0x1ba
net/http.HandlerFunc.ServeHTTP(...)
        /usr/local/go/src/net/http/server.go:2171
...`}</code></pre>
      <p>
        Read it from the top. The first frame is where the fault happened; each frame below it is
        the caller of the one above. The bug is in <code>shortTitle</code> at line 58 or in{' '}
        <code>top</code> at line 31, which handed it the nil, and not in the HTTP server further
        down, which merely called our code. The address is informative too. <code>addr=0x10</code>{' '}
        is 16: the program tried to read the field at offset 16 of a struct whose address was zero.
        Offset 16 in <code>Page</code> is <code>Title</code>. The operating system never maps the
        first page of the address space, precisely so that reads through a nil pointer fault
        instead of returning garbage. The processor raised the fault, the kernel turned it into a
        signal, and the Go runtime turned the signal into the panic you see.
      </p>

      <h3>When this level of detail is not worth your time</h3>
      <p>
        Most days you will not read assembly or strace output, and you should not. hitcount’s
        correctness depends on the logic in <code>hit</code> and <code>top</code>, and its speed at
        50 requests a second is not in question. The layer model earns its keep when a symptom
        does not make sense at the level where you are looking: a file that exists but is “not
        found”, a service that stops answering while its CPU is idle, a crash address that names a
        field. Those are the moments to drop a layer, find the instruction, frame or system call
        involved, and come back up.
      </p>
      <p>
        Revisit this chapter when a profile shows time in functions you did not write, such as
        runtime internals or system calls, or when the same code behaves differently on two
        machines. Those are both signs that something below your source code is doing the work.
      </p>
      <p>
        Everything in this chapter moved numbers around: a count, a length, an offset of 32. The
        next chapter, <em>Bits, numbers and text</em>, asks what those numbers actually are. It
        follows hitcount’s counters to the edge of their bits, finds out why its average reading
        time stopped moving, and explains why a post called “Café” once appeared in the sidebar as
        “CafÃ©”.
      </p>
      <Notes
        items={[
          'Every line of source becomes loads, stores, arithmetic and jumps; a struct field is just an offset from an address.',
          'An increment is a read, an add and a write, even when the compiler emits one instruction for it.',
          'Ahead-of-time, interpreted and JIT runtimes differ mainly in start-up cost, warm-up behaviour and per-operation overhead.',
          'A process reaches files, sockets and other processes only through system calls, each of which crosses into the kernel.',
          'A blocked system call, such as a write to a full pipe, can stop a service whose CPU is idle.',
          'Read a stack trace from the top: the first frame is where it failed, the frames below are who called it.',
        ]}
      />
    </>
  ),

  /* ── 02 · Bits, numbers and text ────────────────────────────── */
  'data-representation': (
    <>
      <p>
        This chapter lets you choose a representation for a number or a piece of text knowing
        where it breaks. Every representation has an edge. The work is to find it in advance and
        decide whether your data will ever reach it.
      </p>
      <p>
        hitcount stores three kinds of value. There are counters: views per page and the total
        across the blog. There are measurements that become averages: time on page, reported in
        milliseconds. And there is text: page paths and post titles. The code in the previous
        chapter uses 64-bit integers for all the numbers. The first draft did not, and in its first
        year three bug reports came in. The total on the stats page went negative. The blog-wide
        average reading time drifted for a few days and then stopped changing. And a post called
        “Café culture in Lisbon” appeared in the sidebar as “CafÃ© culture in Lisbon”. Each one is a
        representation meeting its edge.
      </p>

      <h3>How many views fit in a counter</h3>
      <p>
        A group of n bits has 2ⁿ possible patterns, and a type is an agreement about which number
        each pattern means. With 8 bits there are 256 patterns. Read as unsigned, they mean 0 to
        255. Read as signed, the machine uses <strong>two’s complement</strong>: the top bit counts
        as −128 instead of +128. So <code>0111 1111</code> is 127, and <code>1000 0000</code> is
        −128. The scheme has a useful property: the same adding circuit works for signed and
        unsigned numbers, and −1 is simply all ones, so −1 + 1 wraps neatly to zero. It also has a
        consequence. Add one to 127 and the bits become <code>1000 0000</code>, which is −128.
        Nothing in the hardware complains.
      </p>
      <p>
        The first draft of hitcount declared <code>total</code> as an <code>int32</code>, reasoning
        that no blog gets two billion views. A signed 32-bit integer holds up to 2,147,483,647. At
        the ordinary rate of 50 hits a second, the counter reaches that in 2,147,483,647 ÷ 50 ≈
        43 million seconds, about 497 days. Every test passed. The service would have failed
        sixteen months after launch, on whatever day happened to be next. A viral week shortens the
        fuse: at 2,000 hits a second it is 12.4 days.
      </p>
      <p>
        What happens at the edge depends on the language. Go and Java wrap silently, so the stats
        page shows −2,147,483,648 and starts counting upward from there. Rust panics on overflow in
        debug builds and wraps in release builds unless you use its checked arithmetic. In C,
        signed overflow is undefined behaviour, which means the compiler is allowed to assume it
        never happens and optimise accordingly, so the result can be stranger than a wrap. Python
        integers grow as needed and never overflow, at the cost of being objects on the heap rather
        than raw machine words. This is not a hypothetical failure. In 2014 YouTube reported that a
        music video had passed the largest view count its 32-bit counter could hold, and moved
        view counts to 64-bit integers.
      </p>
      <p>
        The fix is <code>int64</code>. Its maximum is about 9.2 × 10¹⁸, and at 2,000 hits a second
        that lasts roughly 146 million years. The cost is four more bytes per counter: for two
        thousand pages, eight kilobytes. We write the decision down so it can be challenged: every
        counter of events in the world is a signed 64-bit integer, because the extra bytes are
        negligible and the alternative fails on a date nobody can predict.
      </p>
      <Predict q={<>A moderation tool removes bot traffic after the fact with <code>p.Views -= botHits</code>. Someone declared <code>Views</code> as <code>uint32</code>, reasoning that a view count can never be negative. A page has 3 recorded views, and the tool decides 5 of them were bots. What does the sidebar show next?</>}>
        <p>
          3 − 5 in unsigned 32-bit arithmetic wraps to 2³² − 2, which is 4,294,967,294. The page
          jumps to first place in the sidebar with four billion views.
        </p>
        <p>
          An unsigned type does not make “cannot be negative” true. It makes a negative result
          turn into a very large positive one, which is usually harder to notice than a negative
          number would have been. The fix is a signed type plus an explicit rule at the point of
          subtraction (clamp at zero, or refuse to remove more than was recorded), so the invariant
          is enforced by code rather than hoped for by a type.
        </p>
      </Predict>

      <h3>Why the average reading time stopped moving</h3>
      <p>
        The second bug came from a field declared <code>float32</code> “to keep the struct small”:
        a blog-wide running sum of reading time in milliseconds, divided by the number of reports
        to give the average shown on the stats page.
      </p>
      <p>
        A floating-point number stores a value as a significand times a power of two, much like
        scientific notation in base 2. A <code>float32</code> has 1 sign bit, 8 exponent bits and
        23 fraction bits, which with an implied leading 1 gives 24 bits of precision. A{' '}
        <code>float64</code> has 1, 11 and 52, giving 53 bits. The number of significant bits is
        the same at every scale, so the gap between one representable value and the next grows as
        the values grow. Between 2²⁴ and 2²⁵ the gap for a <code>float32</code> is 2. The number
        16,777,217 cannot be stored at all, and 16,777,216 + 1 rounds back to 16,777,216.
      </p>
      <p>
        Now apply that to the sum. The blog gets about 50 reports a second, or 4.3 million a day,
        averaging around 45 seconds each. That adds about 1.9 × 10¹¹ milliseconds to the sum per
        day. When you add a small value to a large float, the result is rounded to the nearest
        representable number, so each 45,000 ms report is effectively rounded to a multiple of the
        current gap.
      </p>
      <p>
        After a few hours the sum is past 2³⁴, and the gap is 2,048 ms. Each report is rounded by
        up to a second; the average is already slightly wrong. By the end of the first day the sum
        is near 2³⁷, the gap is 16,384 ms, and a 45,000 ms report becomes 49,152, nearly 10% high.
        A day later the gap is 32,768, and the same report rounds down to 32,768, 27% low. Past 2³⁹
        the gap is 65,536 ms, and 45,000 rounds up to a full 65,536. Then, once the sum passes 2⁴⁰
        (about 1.1 × 10¹² ms, reached in under a week), half the gap is larger than any typical
        report, so every addition rounds to zero. The sum stops growing while the report count
        keeps rising, and the average falls a little every day. Nobody had written a line of
        incorrect logic.
      </p>
      <p>
        The fix is the representation in the current code: an <code>int64</code> sum of
        milliseconds and an <code>int64</code> count, both exact, divided only when someone asks
        for the average. An <code>int64</code> of milliseconds holds about 292 million years. The
        division produces a <code>float64</code>, which is perfectly adequate for display. The cost
        is that we had to choose a unit in advance; we cannot record sub-millisecond reading times,
        and we do not want to.
      </p>
      <p>
        The other famous float fact belongs here too. Most decimal fractions have no exact binary
        form, in the same way 1/3 has no exact decimal form. So 0.1 + 0.2 evaluates to
        0.30000000000000004 in every language that uses IEEE 754 doubles. Two consequences follow.
        Do not compare floats with <code>==</code>; compare within a tolerance that suits the
        quantity. And do not store money in floats. If hitcount ever billed advertisers per view,
        the bill would be kept in integer minor units (cents or paise) or a decimal type, because
        an invoice that drifts by rounding is wrong in a way accountants will find.
      </p>

      <h3>Numbers that cross into JavaScript</h3>
      <p>
        The stats dashboard is written in JavaScript, and a later version of hitcount gives each
        page a 64-bit ID derived from a hash of its path, so the dashboard can link to{' '}
        <code>/page/&lt;id&gt;</code>. The IDs travel in JSON. JavaScript’s ordinary number type is
        a <code>float64</code>, and a <code>float64</code> represents integers exactly only up to
        2⁵³, which is 9,007,199,254,740,992. A hash spread over 64 bits is usually much larger than
        that.
      </p>
      <p>
        So the dashboard parses <code>13754893227394560123</code> as the nearest double it can
        represent, <code>13754893227394560000</code>, builds a link with it, and the link returns
        404. Most links are broken; occasionally two pages even round to the same ID. View counts
        are not affected, because they will never approach 2⁵³, which is exactly why the bug went
        unnoticed in testing on small numbers. The fix is to send IDs as strings. The cost is
        modest: clients must treat the ID as an opaque token, and they cannot do arithmetic on it,
        which they should never have wanted to do with an identifier anyway.
      </p>

      <h3>Text is bytes plus an agreement</h3>
      <p>
        Unicode gives every character a number, its <strong>code point</strong>, written like{' '}
        <code>U+00E9</code> for é. An <strong>encoding</strong> decides which bytes carry those
        numbers. UTF-8 is the encoding the web settled on, and its design is worth knowing because
        it explains the failures. Code points 0 to 127 are one byte, identical to ASCII. Code points
        up to <code>U+07FF</code> take two bytes, shaped <code>110xxxxx 10xxxxxx</code>. Larger
        ones take three or four bytes. Continuation bytes always begin with <code>10</code>, so a
        decoder can tell where a character starts, and no byte inside a multi-byte character can be
        mistaken for an ASCII character such as <code>/</code> or <code>?</code>.
      </p>
      <Fig caption="Fig 1 · “Café” as characters, code points and UTF-8 bytes, and what a Latin-1 decoder makes of the same bytes">
        <Utf8Bytes />
      </Fig>
      <p>
        The figure shows the sidebar bug. é is <code>U+00E9</code>, binary{' '}
        <code>000 1110 1001</code>. Split into five bits and six bits, it fills the two-byte
        pattern as <code>11000011 10101001</code>, which is <code>C3 A9</code>. The script that
        imported titles from the content system read its export as Latin-1, an older encoding where
        every byte is one character. Latin-1 maps <code>C3</code> to Ã and <code>A9</code> to ©.
        The bytes were never damaged; they were read under the wrong agreement. That is all{' '}
        <strong>mojibake</strong> ever is.
      </p>
      <p>
        It becomes damage if the wrongly decoded text is saved back. Encode “CafÃ©” as UTF-8 and
        you get <code>C3 83 C2 A9</code> for the last two characters, and the original bytes are
        now buried under a second encoding. Repair means knowing exactly which wrong conversions
        happened, in which order. The defence is unglamorous: state the encoding at every boundary
        where bytes become text, including HTTP <code>Content-Type</code> headers, database column
        definitions and file readers, and never let a library guess.
      </p>
      <p>
        A second bug hid in the sidebar’s title truncation. To keep the sidebar tidy, someone wrote{' '}
        <code>title[:40]</code>. In Go that slices bytes, not characters. When the 40th byte fell
        between <code>C3</code> and <code>A9</code>, the sidebar received a string ending in half a
        character. That is invalid UTF-8, and browsers render it as the replacement character, a
        question mark in a diamond. Slicing by code points fixes that case, but not all of them,
        because what a reader calls one character can be several code points.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Text</th><th>UTF-8 bytes</th><th>Code points</th><th>JS .length</th><th>Characters a reader sees</th></tr>
          </thead>
          <tbody>
            <tr><td>Cafe</td><td>4</td><td>4</td><td>4</td><td>4</td></tr>
            <tr><td>Café, é as one code point (NFC)</td><td>5</td><td>4</td><td>4</td><td>4</td></tr>
            <tr><td>Café, e + combining accent (NFD)</td><td>6</td><td>5</td><td>5</td><td>4</td></tr>
            <tr><td>👨‍👩‍👧 (family emoji)</td><td>18</td><td>5</td><td>8</td><td>1</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The family emoji is three person emoji joined by two invisible “zero-width joiner”
        characters. Each emoji takes four bytes in UTF-8 and each joiner three, giving 18 bytes.
        JavaScript strings count UTF-16 units, where each emoji takes two and each joiner one,
        giving 8. A reader sees one picture. The unit a reader perceives is called a{' '}
        <strong>grapheme cluster</strong>, and truncation for display should happen on those
        boundaries, using a Unicode-aware library. The cost is a dependency on Unicode’s tables,
        which change as Unicode adds characters.
      </p>
      <p>
        The table’s middle rows lead to the bug that cost the most counts. The same post can reach
        hitcount as <code>/posts/café</code> with é as one code point, or as e followed by a
        combining accent, depending on the reader’s operating system and keyboard. It can also
        arrive percent-encoded (<code>%C3%A9</code>), with lower-case hex, or with a tracking query
        string attached. hitcount used the raw path as its map key, so it kept several counters for
        one post. Each held a fraction of the views, and none was large enough to reach the top ten.
      </p>
      <p>
        The fix is to put every path into one <strong>canonical form</strong> before it becomes a
        key: decode the percent-encoding, normalise to NFC, drop the query string, and drop a
        trailing slash. The cost is that canonicalisation is a claim that two different inputs mean
        the same thing. Get the rules wrong and you merge pages that differ; we do not lower-case
        paths, for example, because the blog treats <code>/posts/Go</code> and{' '}
        <code>/posts/go</code> as different posts. The operating system chapter returns to this
        fix, because without it a crawler can make hitcount’s map grow without limit.
      </p>

      <h3>Byte order when a counter leaves the machine</h3>
      <p>
        One more agreement matters when numbers are written as raw bytes rather than as text. A
        64-bit integer is eight bytes, and machines disagree about which byte comes first. x86 and
        most ARM systems store the least significant byte first (little-endian); network protocols
        traditionally send the most significant first (big-endian). hitcount’s snapshot file is
        JSON, which writes numbers as decimal text and so never meets the question. If we switched
        to a binary snapshot for speed, the format would have to state the byte order, and the code
        would write it explicitly (Go’s <code>encoding/binary</code> makes you choose), rather than
        dumping memory as it happens to be laid out. Formats such as Protocol Buffers exist partly
        to pin these details in writing.
      </p>

      <h3>The representations hitcount settled on</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Value</th><th>Representation</th><th>Why</th><th>What it costs</th></tr>
          </thead>
          <tbody>
            <tr><td>Views, total</td><td><code>int64</code></td><td>exact; lasts geological time at our rate</td><td>8 bytes per counter</td></tr>
            <tr><td>Reading time</td><td><code>int64</code> ms sum + <code>int64</code> count</td><td>exact accumulation, no drift</td><td>unit fixed in advance</td></tr>
            <tr><td>Average shown</td><td><code>float64</code>, computed on read</td><td>approximate is fine for display</td><td>never compared with <code>==</code></td></tr>
            <tr><td>Page ID in JSON</td><td>string</td><td>JS numbers are exact only to 2⁵³</td><td>clients treat it as opaque</td></tr>
            <tr><td>Path used as key</td><td>canonical UTF-8, NFC, no query</td><td>one counter per post</td><td>canonical rules must be right</td></tr>
            <tr><td>Title for display</td><td>UTF-8, truncated on graphemes</td><td>no half characters on screen</td><td>a Unicode library</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>When the simple representation is fine</h3>
      <p>
        None of this means every number needs a decimal type or every string needs grapheme-aware
        handling. <code>float64</code> is the right representation for measurements that are
        approximate anyway: durations, averages, ratios, sensor readings, the weights of a machine
        learning model. Decimal arithmetic is slower and needs more code, and it buys nothing when
        the input was a rounded measurement to begin with. A string that is only ever stored and
        echoed back does not need normalising.
      </p>
      <p>
        Revisit the representation when one of these is true: the value is money; the code
        compares values for equality; a counter could plausibly pass 2³¹; an identifier crosses
        into JavaScript or another runtime with different number types; or text is truncated,
        sorted, compared or used as a key. Those are the points where the edge stops being
        theoretical.
      </p>
      <p>
        We now know what hitcount’s bytes mean. The next chapter, <em>The machine underneath</em>,
        asks where those bytes physically sit while the program runs, in registers, caches and
        main memory, and why the speed of <code>/top</code> depends more on that than on the
        sorting algorithm it calls.
      </p>
      <Notes
        items={[
          'An n-bit integer wraps silently at its edge in most languages; a signed 32-bit counter at 50 events a second lasts about 16 months.',
          'Unsigned types do not prevent negative results; they turn them into very large positive ones.',
          'Floats keep a fixed number of significant bits, so adding small values to a large running sum loses them; accumulate in integers and divide on read.',
          'JavaScript numbers are exact integers only up to 2⁵³, so 64-bit IDs should travel as strings.',
          'Mojibake is correct bytes decoded under the wrong encoding; state the encoding at every boundary.',
          'Anything used as a key, such as a URL path, needs one canonical form or it will be counted under several names.',
        ]}
      />
    </>
  ),

  /* ── 03 · The machine underneath ────────────────────────────── */
  machine: (
    <>
      <p>
        This chapter gives you a cost model for reading memory that is good enough to compare two
        designs before you build either: which is faster, and by roughly how much. The model has
        two parts. Where does each piece of data sit, and does the program walk through it in order
        or jump around?
      </p>
      <p>
        hitcount’s <code>/top</code> endpoint builds a list of every page and sorts it. For the one
        blog it was written for, about two thousand pages, that takes well under a millisecond. Now
        change one variable. A friend who runs a blogging platform asks to use hitcount for all of
        their blogs: roughly 5 million pages, with a platform-wide “trending” list built the same
        way. The code and the algorithm are unchanged. The number of pages is 2,500 times larger.
        Is <code>/top</code> 2,500 times slower, or worse? The answer depends less on the sort
        than on where the pages live.
      </p>

      <h3>A core, its caches and the long walk to main memory</h3>
      <p>
        A core works on values in its registers. Everything else is fetched from memory, and memory
        is arranged as a hierarchy. Closest to each core is the L1 data cache, typically 32 to 48
        KB, which answers in about a nanosecond. Behind it is a per-core L2 of around one or two
        megabytes, then an L3 of tens of megabytes shared by all the cores on the chip. Behind all
        of that is main memory (DRAM): tens or hundreds of gigabytes, about 100 nanoseconds away.
      </p>
      <p>
        The caches exist because DRAM latency has improved very little in decades while cores have
        become much faster. A core running at 3 GHz completes a cycle every third of a nanosecond,
        and can retire several instructions per cycle. A 100 ns trip to main memory is 300 cycles
        in which a core that needs the value has nothing useful to do. The caches hold copies of
        recently used memory, on the bet that a program will soon use the same data again, or data
        next to it.
      </p>
      <Fig caption="Fig 1 · The latency ladder on a log scale. Each rung is roughly ten to a thousand times the one above">
        <LatencyLadder />
      </Fig>
      <p>
        The same ladder continues below memory, into storage and the network. The rounded figures
        below change a little with each hardware generation; the ratios between them have been
        stable for a long time, and the ratios are what decisions depend on. The right-hand column
        says where hitcount touches each rung.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Access</th><th>Rough cost</th><th>Where hitcount meets it</th></tr>
          </thead>
          <tbody>
            <tr><td>L1 cache hit</td><td>~1 ns</td><td>the <code>Views</code> field of a page it touched a moment ago</td></tr>
            <tr><td>L2 / L3 hit</td><td>~4–40 ns</td><td>a popular page’s struct, touched within the last few thousand requests</td></tr>
            <tr><td>Main memory</td><td>~100 ns</td><td>a rarely read page’s struct, chased through a pointer</td></tr>
            <tr><td>Sequential read from RAM</td><td>~10 GB/s per core</td><td>a scan over a flat, contiguous array</td></tr>
            <tr><td>SSD random read</td><td>~100 µs</td><td>loading the snapshot file at start-up, if it is not in the OS cache</td></tr>
            <tr><td>Round trip in one data centre</td><td>~0.5 ms</td><td><code>fetchTitle</code> calling the content system</td></tr>
            <tr><td>Round trip across a continent</td><td>~150 ms</td><td>a reader far from the server sending a hit</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Two things in this table matter for everything that follows. First, the jump from cache to
        main memory is about a hundredfold, so a program that misses the cache on every access runs
        at a hundredth of the speed of one that does not, with exactly the same instructions.
        Second, the network rows are thousands of times slower than any memory row. Shaving cache
        misses from a request that also makes a network call is usually wasted effort, a point we
        return to at the end.
      </p>

      <h3>Memory moves in 64-byte lines</h3>
      <p>
        Memory does not travel one byte at a time. The unit of transfer between main memory and
        the caches is the <strong>cache line</strong>, 64 bytes on most current processors. Read
        one byte and the hardware fetches the 63 around it. If the program then reads those
        neighbours, they are already in the cache. On top of that, the core watches the pattern of
        addresses being read. When it sees a steady walk forwards through memory, a hardware{' '}
        <strong>prefetcher</strong> starts fetching lines before they are asked for. A sequential
        scan therefore pays the main-memory latency roughly once and then streams at memory
        bandwidth.
      </p>
      <p>
        hitcount’s data does not look like that. <code>pages</code> is a{' '}
        <code>map[string]*Page</code>. The map’s own table is reasonably compact, but each entry
        holds a pointer to a <code>Page</code> struct that was allocated on the heap when the page
        was first seen. Pages are first seen in an arbitrary order, interleaved with every other
        allocation the program makes, so the structs are scattered. To read one page’s{' '}
        <code>Views</code>, the core loads the pointer from the map, then loads from wherever that
        pointer leads. When the data set is larger than the caches, that second load is usually a
        miss.
      </p>
      <Fig caption="Fig 2 · The same counters, laid out two ways. Pointers send each read somewhere new; a flat slice puts four pages in each cache line">
        <PointerVsFlat />
      </Fig>
      <p>
        <code>/top</code> then makes it worse. It copies the pointers into a slice and calls{' '}
        <code>sort.Slice</code>, whose comparison function reads <code>list[i].Views</code> and{' '}
        <code>list[j].Views</code>, two more pointer dereferences per comparison, landing in random
        places. A sort of n items makes about n log₂ n comparisons.
      </p>
      <Predict q={<>With 5 million pages, estimate how long <code>/top</code> takes in the current design. Then estimate it for a design that keeps a separate flat slice of 16-byte records (an <code>int64</code> view count and a page index) and scans it once, keeping the ten largest in a small heap.</>}>
        <p>
          Current design. Just visiting every page once to read its count is 5 million likely
          misses. At about 100 ns each, that is around 0.5 seconds. The sort is worse: 5 million
          × log₂(5 million) ≈ 5 million × 22 ≈ 110 million comparisons, each touching two
          scattered structs. Even if the core overlaps several misses at a time, this is several
          seconds of work for one request, and possibly more than ten.
        </p>
        <p>
          Flat design. The slice is 5 million × 16 bytes = 80 MB, read front to back. At something
          like 10 GB/s, streaming it takes about 8 ms. Most records are compared once against the
          smallest of the current top ten and rejected, which costs a few nanoseconds and overlaps
          with the memory traffic. Call it 10 to 20 ms in total.
        </p>
        <p>
          The ratio is somewhere between a hundred and several hundred to one, from layout and
          algorithm together. Now redo the estimate at 2,000 pages: the whole set is a few hundred
          kilobytes and stays in L2 or L3 after the first call, so both versions finish in tens of
          microseconds to a fraction of a millisecond. The difference is real but invisible next
          to the network time of the request.
        </p>
      </Predict>
      <p>
        One more effect sits behind the word “overlap” in that answer. A modern core can have
        around ten or more cache misses in flight at once, provided it knows the addresses in
        advance. Iterating a map and following each entry’s pointer gives it independent addresses
        to work on, so some misses overlap. Walking a linked list does not: the address of the next
        node is inside the current node, so each miss must finish before the next can start. Of all
        layouts, a long linked list traversal is the one that pays the full 100 ns per element.
      </p>

      <h3>Seeing the misses instead of guessing them</h3>
      <p>
        Estimates like these are worth checking, and the processor will tell you directly. Every
        modern core keeps hardware counters of cycles, instructions retired, cache misses and
        mispredicted branches, and on Linux <code>perf stat</code> reads them for any command.
        Running a benchmark of each <code>/top</code> design over 5 million pages gives output
        shaped like this (numbers rounded, and yours will differ):
      </p>
      <pre><code>{`map of pointers + sort.Slice
    21,000,000,000  cycles
     7,300,000,000  instructions        #  0.35  insn per cycle
       200,000,000  cache-misses

flat slice + 10-item heap
        52,000,000  cycles
       118,000,000  instructions        #  2.27  insn per cycle
         1,300,000  cache-misses`}</code></pre>
      <p>
        The line to read first is instructions per cycle. A core that can retire several
        instructions per cycle retiring only a third of one is mostly waiting, and the cache-miss
        count says what for. The flat version not only executes far fewer instructions; it executes
        them about six times more efficiently, because the data arrives before it is needed. Its
        1.3 million misses are close to what streaming 80 MB in 64-byte lines must cost, about 1.25
        million lines, which is a good sign that the model in this chapter describes what the
        hardware is doing.
      </p>
      <p>
        Low instructions per cycle is the signature of a memory-bound program, and it changes what
        is worth trying. Reducing the arithmetic in a loop that runs at 0.35 instructions per cycle
        does almost nothing, because the core was not busy with arithmetic. Reducing the number of
        distinct cache lines the loop touches is what helps.
      </p>

      <h3>Lay the data out the way it is read</h3>
      <p>
        The flat slice is fast for one reason: the query reads only view counts, and the layout
        puts only view counts side by side. That principle reaches further than this one endpoint.
      </p>
      <p>
        A later version of hitcount keeps an hourly histogram for each page, 24 four-byte counters,
        so it can draw a chart of the last day. Stored as one array of rows, page after page, each
        row is 96 bytes. Drawing one page’s chart reads one row: two cache lines, fast. But the
        platform also wants “views across all pages in the last hour”, which reads one counter from
        every row. Each of those reads lands in a different cache line, so the query pulls in all
        480 MB of histograms to use 20 MB of them. The arithmetic is trivial; the memory traffic is
        24 times what it needs to be.
      </p>
      <p>
        Storing the same data as 24 arrays, one per hour, flips both costs: the cross-page query
        becomes a sequential scan of one 20 MB array, and the single-page chart becomes 24 scattered
        reads. Neither layout is correct in general. The right one is the one that matches the
        query you run most often or most urgently. Analytical databases store data column by column
        for exactly this reason, and transactional databases store it row by row for the opposite
        one; the System Design pathway returns to that choice.
      </p>

      <h3>Two counters, one cache line</h3>
      <p>
        Cache lines also explain a failure that looks impossible from the source code. It shows up
        when we try to make <code>total</code> cheaper to update from many cores, which the
        concurrency chapter will make necessary.
      </p>
      <p>
        The idea is sound: instead of every core incrementing the same counter, give each core its
        own, and add them up when someone asks for the total. Someone writes{' '}
        <code>var perCore [16]int64</code>. Each core increments only its own element. A benchmark
        on an 8-core machine shows that this is no faster than a single shared counter, and
        sometimes slower.
      </p>
      <p>
        Here is the sequence. Sixteen 8-byte counters occupy 128 bytes, which is two cache lines,
        eight counters per line. Caches keep copies consistent per line, not per variable. Before a
        core may write to a line, it must hold that line exclusively, which means every other
        core’s copy is invalidated. Core 0 writes its counter and takes the line. Core 1 writes its
        own counter, a different variable in the same line, and must take the line away from core
        0. Core 0’s next increment takes it back. The line moves between cores on nearly every
        increment, each move costing tens of nanoseconds or more, even though no two cores ever
        touch the same variable. This is <strong>false sharing</strong>.
      </p>
      <p>
        The fix is to give each counter its own line:
      </p>
      <pre><code>{`type paddedCounter struct {
    n int64
    _ [56]byte // fill the rest of the 64-byte line
}
var perCore [16]paddedCounter`}</code></pre>
      <p>
        The cost is memory: 64 bytes per counter instead of 8. For sixteen counters that is one
        kilobyte and not worth a second thought. It would be a bad trade for the per-page counters:
        5 million pages at 64 bytes is 320 MB instead of 40 MB, to fix contention that only exists
        on the handful of counters every request touches. So we pad the few hot shared counters and
        leave the per-page data packed.
      </p>

      <h3>Stack, heap and the cost of allocating</h3>
      <p>
        Where a value is allocated also decides where it sits. Values that live only during one
        function call can go on the goroutine’s stack, where allocation is moving a pointer and
        release is free. Values that outlive the call must go on the heap, where the allocator has
        to find space and the garbage collector later has to find out that the space is free again.
        Go decides which is which with <strong>escape analysis</strong> at compile time:{' '}
        <code>&amp;Page{'{'}...{'}'}</code> in <code>hit</code> escapes because it is stored in the
        map; the loop counter in <code>top</code> does not. <code>go build -gcflags=-m</code>{' '}
        prints these decisions.
      </p>
      <p>
        For hitcount’s ordinary requests, heap allocation is not a problem. Parsing the query
        string allocates a few hundred bytes per request; at 2,000 requests a second that is well
        under a megabyte a second. <code>/top</code> at platform scale is different: each call
        allocates a slice of 5 million pointers, 40 MB, and throws it away. At ten calls a second
        that is 400 MB a second of allocation, and the garbage collector will have to deal with all
        of it. The languages chapter prices that. For now, note that an allocation’s cost is paid
        twice, once when the memory is handed out and again when it is reclaimed.
      </p>

      <h3>When not to rearrange data for the cache</h3>
      <p>
        At two thousand pages, every byte of hitcount’s state fits comfortably in L2 or L3. The
        flat layout would save microseconds on a request whose total time is dominated by the
        network, measured in milliseconds or hundreds of milliseconds. It would also cost
        something: two structures to keep consistent (the map to find a page by path, the slice to
        scan), and more work whenever a page is deleted and its slot must be reused or compacted.
        For the original blog, that complexity buys nothing a reader could notice.
      </p>
      <p>
        Revisit the layout when three things are true together: the data set has grown past the L3
        cache, a request scans much of it, and a profile shows time going to loops that do little
        arithmetic per element. That is the situation the platform version is in, and it is why
        the flat slice appears there and not in the original.
      </p>
      <Callout>
        To compare two designs before building either, count the cache misses each makes per
        request and multiply by about 100 ns, then count the bytes each streams and divide by
        about 10 GB/s. The larger of those two numbers is usually close to the answer.
      </Callout>
      <p>
        Throughout this chapter we treated memory as hitcount’s own: one large array of bytes that
        the program reads and writes directly. It is not. The next chapter,{' '}
        <em>The operating system’s three lies</em>, looks at what the kernel does between hitcount
        and the hardware, and at three failures that only make sense once you see it: a slowdown
        with idle CPU, a silent kill, and a snapshot that vanished in a power cut.
      </p>
      <Notes
        items={[
          'A cache hit costs about a nanosecond and a main-memory access about a hundred, so layout can change speed a hundredfold with identical instructions.',
          'Memory moves in 64-byte lines, and sequential walks are prefetched; scattered pointer chasing pays the full latency per element.',
          'Lay data out to match the query you run most: values read together should sit together.',
          'Two cores writing different variables in the same cache line still contend; pad hot shared counters, not bulk data.',
          'Heap allocation is paid twice, once by the allocator and once by whatever reclaims it.',
          'Cache-level optimisation only matters once the data outgrows the cache and the request is not dominated by network time.',
        ]}
      />
    </>
  ),

  /* ── 04 · The operating system’s three lies ─────────────────── */
  os: (
    <>
      <p>
        This chapter lets you explain three behaviours of hitcount that make no sense from its
        source code. During a traffic spike its latency jumped by almost a tenth of a second while
        its CPU graph showed spare capacity. One night it disappeared with exit code 137 and no
        error message in its logs. And after a power cut, it came back with every counter at zero,
        even though it had been saving them every ten seconds.
      </p>
      <p>
        Each of these is the operating system keeping a promise imperfectly. The kernel tells every
        process three convenient things: you have the CPU to yourself, you have memory to yourself,
        and what you wrote has been saved. Programs are written as though those were true, and
        mostly they are. This chapter is about where each one leaks.
      </p>
      <p>
        One change to hitcount first. Version 2 writes all its counters to a file,{' '}
        <code>counts.json</code>, every ten seconds, and reads that file back when it starts, so
        a restart does not lose a day of counts.
      </p>

      <h3>hitcount does not have the CPU to itself</h3>
      <p>
        A machine runs far more threads than it has cores. The kernel’s <strong>scheduler</strong>{' '}
        decides which runnable thread runs on which core, and for how long. A thread runs until it
        blocks (waiting for a read, a lock, a timer) or until its time slice ends, a few
        milliseconds, at which point a timer interrupt lets the kernel take the core back and give
        it to someone else. Switching threads means saving one thread’s registers and loading
        another’s, a few microseconds directly. The indirect cost is often larger: the incoming
        thread finds the caches full of the previous thread’s data, and has to fetch its own back.
      </p>
      <p>
        Go adds a layer. hitcount runs thousands of goroutines, but the kernel sees only a handful
        of threads. The Go runtime multiplexes goroutines onto those threads itself, and switching
        goroutines happens in user space without a system call, in a fraction of a microsecond.
        This is why a Go server can afford one goroutine per connection where a thread per
        connection would be expensive.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Unit</th><th>Memory</th><th>Created in</th><th>Switched by</th><th>Isolation</th></tr>
          </thead>
          <tbody>
            <tr><td>Process</td><td>its own address space</td><td>~a millisecond</td><td>kernel, microseconds</td><td>full; a crash stays inside</td></tr>
            <tr><td>OS thread</td><td>a stack of up to ~8 MB reserved, shared heap</td><td>tens of microseconds</td><td>kernel, microseconds</td><td>none between threads</td></tr>
            <tr><td>Goroutine / async task</td><td>a few KB, growing as needed</td><td>under a microsecond</td><td>language runtime, ~100s of ns</td><td>none</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The table also explains a familiar rule of thumb. Work that computes wants about one
        thread per core: more threads than cores just adds switching. Work that waits, as hitcount
        mostly does, wants many cheap waiters, which is what goroutines and event loops provide.
      </p>
      <Predict q={<>hitcount runs in a container limited to 1 CPU on a 16-core host. During a traffic spike, its CPU graph shows it using about 60% of its limit, averaged per minute. Yet its p99 latency rises by roughly 90 ms. Where do the 90 ms come from?</>}>
        <p>
          A CPU limit on Linux containers is a quota per period: by default, 100 ms of CPU time in
          every 100 ms of wall-clock time for a 1-CPU limit. The quota is shared by all the
          container’s threads.
        </p>
        <p>
          Go versions before 1.25 set the number of threads running Go code to the number of cores
          the host has, 16, without looking at the container’s limit. During the spike, 16 threads
          run in parallel, and together they use up the 100 ms quota in about 6 ms of wall-clock
          time. The kernel then throttles the container: none of its threads may run for the
          remaining ~94 ms of the period. Any request that arrives during that window waits. Averaged
          over a minute, usage looks like 60% because most periods are quiet; the spikes are
          invisible in the average and obvious in the tail.
        </p>
        <p>
          The fix is to make the runtime’s parallelism match the limit, so it never burns the quota
          in a burst. Go 1.25 does this by default; older versions need{' '}
          <code>GOMAXPROCS</code> set explicitly, or a library that reads the container limit. The
          cost is less parallelism during short bursts, which is the honest description of a 1-CPU
          limit anyway.
        </p>
      </Predict>

      <h3>Its memory is virtual</h3>
      <p>
        The addresses hitcount uses are not physical addresses in RAM. They are{' '}
        <strong>virtual</strong>, and every memory access is translated by the hardware, using
        page tables the kernel maintains, in units of 4 KiB <strong>pages</strong>. A small cache of
        recent translations, the TLB, makes the common case cost nothing extra. This fiction buys
        a great deal. Processes cannot read each other’s memory, because their page tables do not
        map each other’s pages. The kernel can hand out memory lazily: when hitcount asks for a
        gigabyte, the kernel records the promise, and only assigns physical pages when each page is
        first touched. That first touch triggers a <strong>page fault</strong>, a trap into the
        kernel that finds a free physical page, maps it, and resumes the program. A minor fault of
        this kind costs on the order of a microsecond. A major fault, where the page’s contents must
        be read from disk, costs a disk read, and turns a memory access into something a hundred
        thousand times slower.
      </p>
      <p>
        This is why two memory numbers appear on every dashboard. Virtual size is what the process
        has been promised, and for a Go program it is often several gigabytes, because the runtime
        reserves address ranges it may never use. Resident set size (RSS) is what is actually
        occupying RAM. RSS is the number that matters, because it is what the container’s memory
        limit is measured against.
      </p>
      <p>
        Here is how that limit killed hitcount. Version 2 ran in a container with a 256 MiB memory
        limit. Its map keys were raw paths, before the canonicalisation fix from the previous
        chapter. A crawler started requesting posts with a random tracking parameter on each URL,{' '}
        <code>/posts/unicode?ref=8f3a…</code>, about 100 times a second. Every one became a new
        key with its own <code>Page</code> struct, title string and map entry, roughly 200 bytes
        in all.
      </p>
      <p>
        At 200 bytes per key, 256 MiB holds about 1.3 million keys. At 100 new keys a second, that
        is roughly 13,000 seconds, about three and a half hours. Through those hours RSS climbed
        steadily. When it reached the limit, the kernel first tried to reclaim memory it could
        drop, such as cached file pages. Nothing hitcount held was droppable. So the kernel’s
        out-of-memory killer sent it <code>SIGKILL</code>. A process cannot catch or log that
        signal; it simply stops. The container runtime reported exit code 137, which is 128 plus
        signal number 9. There was no panic, no stack trace and no last log line, because the
        process was never given a chance to write one.
      </p>
      <p>
        Then it got worse. The container restarted, loaded <code>counts.json</code>, and the
        snapshot contained a million junk keys. hitcount started near its limit and was killed again
        within minutes, and again, a crash loop. The fix had three parts. Canonicalise paths so the
        query string never reaches the key. Count only paths that the content system says exist,
        refreshed every few minutes. And put a hard cap on the number of keys, refusing new ones
        past it, so no future bug can grow the map without bound. The cost is that a brand-new post
        is not counted until the list of known paths refreshes. We wrote down that we accept a few
        minutes of missed views on new posts in exchange for a memory footprint that cannot be
        driven by strangers.
      </p>

      <h3>What it wrote is not on disk yet</h3>
      <p>
        When hitcount calls <code>write</code> on a file and the call returns successfully, the
        bytes have been copied into the kernel’s <strong>page cache</strong>, in RAM. The kernel
        will write them to the storage device later, in an order of its choosing; on Linux’s
        default settings, dirty data is usually written back within about thirty seconds. Until
        then, the “written” data exists only in memory.
      </p>
      <p>
        It is worth separating two kinds of crash. If the hitcount process dies, the data it wrote
        is still in the kernel’s page cache, and the kernel will still write it to disk. Only if the
        machine itself stops, through a power cut, a kernel panic or a hypervisor failure, is
        unflushed data lost. That is why durability bugs survive testing: killing the process in a
        test does not reproduce them.
      </p>
      <Predict q={<>Version 2 saves with <code>{'os.WriteFile("counts.json", data, 0644)'}</code>, which opens the file with truncation, writes the bytes, and closes it. The call returns <code>nil</code>. The process exits cleanly a second later. Five seconds after that, the power fails. When the machine comes back, what is in <code>counts.json</code>?</>}>
        <p>
          It may be the complete new snapshot, but nothing guarantees that. Truncation is a
          metadata change, and the new contents were sitting in the page cache. Depending on the
          filesystem and its options, after the power cut you can find the new file, the old file,
          a file of the right length full of zeros, a partially written file, or an empty file.
          The clean exit of the process changed nothing; the data was in the kernel’s hands, not
          the device’s.
        </p>
        <p>
          The real outage followed from what hitcount did with the damaged file. On start-up it
          failed to parse the JSON, treated the error as “no snapshot yet”, and started every
          counter at zero. Ten seconds later it wrote a fresh snapshot of almost nothing over the
          remains of the old one.
        </p>
      </Predict>
      <p>
        The fix uses two operations the kernel provides for exactly this. <code>fsync</code> on a
        file blocks until that file’s data has reached the device. <code>rename</code> replaces one
        name with another atomically: anyone looking at the directory sees either the old file or
        the new one, never a mixture. Together they give a sequence in which a crash at any point
        leaves one complete snapshot:
      </p>
      <Fig caption="Fig 1 · Write to a temporary file, flush it, rename it into place, flush the directory. A crash after any step leaves a complete snapshot">
        <SafeSnapshot />
      </Fig>
      <pre><code>{`func saveSnapshot(dir string, data []byte) error {
    tmp, err := os.CreateTemp(dir, "counts-*.tmp")
    if err != nil {
        return err
    }
    defer os.Remove(tmp.Name()) // harmless once the rename has happened
    if _, err := tmp.Write(data); err != nil {
        tmp.Close()
        return err
    }
    if err := tmp.Sync(); err != nil { // fsync: the bytes reach the device
        tmp.Close()
        return err
    }
    if err := tmp.Close(); err != nil {
        return err
    }
    if err := os.Rename(tmp.Name(), filepath.Join(dir, "counts.json")); err != nil {
        return err
    }
    d, err := os.Open(dir)
    if err != nil {
        return err
    }
    defer d.Close()
    return d.Sync() // fsync the directory, so the rename itself is durable
}`}</code></pre>
      <p>
        The last step surprises people. A rename changes the directory, not the file, and the
        directory’s change sits in the page cache like any other write until the directory itself
        is flushed. Without that final <code>fsync</code>, a power cut can leave the old name in
        place even though the new file’s data is safely on disk.
      </p>
      <p>
        The second half of the fix is in start-up. A snapshot that fails to parse is now a reason
        to refuse to start and raise an alert, not a reason to start from zero. The service is
        down until someone looks, which is the right trade for a counter: a few minutes of missing
        counts is better than silently replacing a year of them.
      </p>
      <p>
        The cost of all this is small for hitcount. An <code>fsync</code> takes from well under a
        millisecond on a local SSD to several milliseconds on a network-attached cloud disk, and we
        do it twice every ten seconds. What the design does not buy is per-hit durability. If the
        power fails, we lose up to ten seconds of counts, and we wrote that down: these numbers
        choose which links appear in a sidebar, and ten seconds of them is not worth more. If
        hitcount billed advertisers per view, that sentence would be wrong. Each hit would have to
        be appended to a log and flushed before the request was acknowledged, with many hits
        grouped into each flush to keep the cost bearable. That design is the write-ahead log, and
        it is the starting point of every database you will meet in the System Design pathway.
      </p>

      <h3>The page cache works for reads too</h3>
      <p>
        The page cache that delays writes also speeds up reads, and it explains a puzzle from the
        platform version’s deploy logs. After an ordinary deploy, hitcount restarted and was ready
        in under a second. After the host machine was rebooted for a kernel update, the same
        restart took about five seconds, long enough for the orchestrator’s readiness check to
        give up and restart it again.
      </p>
      <p>
        The difference is where <code>counts.json</code> was. The platform’s snapshot is about 600
        MB. When hitcount restarts on a running machine, the file it wrote a minute ago is still in
        the page cache, so reading it runs at memory speed, a few gigabytes a second, and takes a
        fraction of a second. After a reboot the page cache is empty, and the file comes from the
        cloud disk, which on a common configuration delivers something like 125 to 250 MB a second.
        600 MB at that rate is three to five seconds. Nothing in hitcount changed; the kernel’s
        cache did.
      </p>
      <p>
        Two lessons follow. Measure start-up time cold, after dropping the caches or rebooting,
        because that is the start-up that happens during an incident. And set readiness timeouts
        from that cold number, with a margin. We raised the readiness check’s allowance to thirty
        seconds and added a log line reporting how long the snapshot took to load, so the next
        change in that number is visible.
      </p>
      <p>
        The page cache has one more effect worth knowing. On Linux, file pages a container has read
        or written are charged to that container’s memory usage, so a container’s memory graph
        includes cached file data. That memory is reclaimable, which is why the kernel tries to
        drop it before killing anything. A container whose memory graph sits near its limit is not
        necessarily in danger; one whose resident anonymous memory, the heap, sits near it is.
      </p>

      <h3>The three promises, side by side</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>The promise</th><th>What actually happens</th><th>Where it leaked for hitcount</th><th>What we did</th></tr>
          </thead>
          <tbody>
            <tr><td>You have the CPU</td><td>time slices; containers get a quota per period</td><td>throttled for ~90 ms during bursts</td><td>match runtime parallelism to the CPU limit</td></tr>
            <tr><td>You have the memory</td><td>virtual pages, assigned on first touch, capped by the cgroup</td><td>killed with exit code 137, then a crash loop</td><td>canonical keys, known paths only, a hard cap</td></tr>
            <tr><td>What you wrote is saved</td><td>bytes sit in the page cache until flushed</td><td>an empty snapshot after a power cut</td><td>temp file, fsync, rename, fsync directory; refuse to start on a bad file</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>When the fictions are good enough</h3>
      <p>
        Most of the time, the right response to these leaks is to let the fiction stand. hitcount
        should not call <code>fsync</code> on every hit, pin goroutines to cores, or manage its own
        memory pages. Each of those would cost speed or complexity to defend against a failure the
        requirements say we can tolerate. The operating system’s defaults are tuned for programs
        like ours, and they are good.
      </p>
      <p>
        Revisit the decision when the requirements move: when lost data becomes lost money, when a
        container limit is tightened to save cost, when another service is placed on the same
        machine and competes for its caches and cores, or when data grows past memory and starts
        living on disk. Each of those turns one of the three promises from “true enough” into
        something the design must handle.
      </p>
      <p>
        The scheduler’s freedom to pause a thread anywhere has one more consequence, and in hitcount
        it is the bug that has been sitting in <code>p.Views++</code> since the first chapter. The
        next chapter, <em>Concurrency: two requests, one counter</em>, runs thousands of requests
        at once against that line and counts what goes missing.
      </p>
      <Notes
        items={[
          'A container CPU limit is a quota per period, so a runtime that runs too many threads in parallel gets throttled in bursts that averages hide.',
          'Resident set size, not virtual size, is what a container memory limit measures.',
          'An out-of-memory kill is SIGKILL, exit code 137, with no chance to log anything; any key set driven by outside input needs a bound.',
          'A successful write means the bytes reached the kernel, not the disk; only fsync makes them durable.',
          'To replace a file safely, write a temporary file, fsync it, rename it over the old one, then fsync the directory.',
          'Write down how much data a crash may lose, and revisit it when that data starts to represent money.',
        ]}
      />
    </>
  ),

  /* ── 05 · Concurrency ───────────────────────────────────────── */
  concurrency: (
    <>
      <p>
        This chapter lets you look at a piece of shared state and answer one question precisely:
        who is allowed to touch it, and when? Once you can answer that, choosing between a lock,
        an atomic operation and a single owner becomes a decision with known costs rather than a
        matter of taste.
      </p>
      <p>
        Go’s HTTP server serves each connection on its own goroutine, and the runtime spreads
        goroutines across every core. During a spike, hundreds of goroutines run{' '}
        <code>hit</code> at the same moment, on eight cores, all reading and writing{' '}
        <code>pages</code> and <code>total</code>. We test it: a load generator sends exactly
        100,000 hits for one page from 200 connections. Afterwards <code>/top</code> reports 97,412
        views. We run it again and get 96,880. On the third run hitcount crashes with{' '}
        <code>fatal error: concurrent map writes</code>. These are two different bugs, and they
        fail in opposite ways.
      </p>

      <h3>How an increment goes missing</h3>
      <p>
        The first chapter showed what <code>p.Views++</code> becomes: load the value into a
        register, add one, store it back. Each core has its own registers. If two cores run those
        three steps on the same page and their steps interleave, both can load the same old value.
      </p>
      <Fig caption="Fig 1 · The lost update. Both cores load 41 before either stores, so two hits leave the counter at 42">
        <LostUpdate />
      </Fig>
      <p>
        Both cores did exactly what the code says. The result is still wrong, and only sometimes,
        which is what makes this class of bug expensive. A <strong>data race</strong> is two
        accesses to the same memory from different threads, at least one of them a write, with
        nothing ordering them. Even when the compiler emits a single <code>INCQ</code> instruction,
        the core performs the load, add and store internally, and without a special locked form of
        the instruction another core’s write can land in between.
      </p>
      <Predict q={<>We write a test: 100 goroutines each increment <code>total</code> 1,000 times with no synchronisation. We run it on a laptop with 8 cores, and then in CI on a runner with one core. What totals do we see?</>}>
        <p>
          On 8 cores, a total below 100,000 that changes from run to run. How far below depends
          on timing, on the compiler’s choices and on how often goroutines collide.
        </p>
        <p>
          On a single-core runner the test very often passes with exactly 100,000. With one core,
          only one goroutine runs at a time, and the Go scheduler rarely switches goroutines in the
          middle of three instructions. The race is still there; it just almost never fires. This
          is how racy code reaches production with a green test suite.
        </p>
        <p>
          The dependable way to find it is the race detector. <code>go test -race</code> instruments
          every memory access and reports any pair of unordered accesses it observes, with the
          stack of each, whether or not the interleaving actually produced a wrong answer on that
          run. It slows the program several times over, so it belongs in tests and staging, not in
          production.
        </p>
      </Predict>
      <p>
        The map fails differently. Inserting into a map can make it grow, which moves entries into
        a new, larger table. A goroutine reading or writing during that move can see a half-moved
        table: entries missing, entries twice, internal pointers to memory that is about to be
        reused. Rather than let that corrupt the program quietly, the Go runtime checks for
        concurrent writes in many cases and stops the whole process with a fatal error that cannot
        be recovered. A crash is unpleasant, but it is a better failure than a counter that is
        silently wrong, because somebody notices it.
      </p>

      <h3>Three ways to make the increment safe</h3>
      <p>
        A <strong>mutex</strong> (mutual exclusion lock) lets one goroutine at a time into a
        section of code. Taking and releasing an uncontended mutex costs about 20 ns. Here is the
        store with one:
      </p>
      <pre><code>{`type store struct {
    mu    sync.Mutex // guards pages and total.
                     // Invariant: total == sum of p.Views over all pages.
    pages map[string]*Page
    total int64
}

func (s *store) hit(path string, ms int64, hasMs bool) {
    s.mu.Lock()
    defer s.mu.Unlock()
    p, ok := s.pages[path]
    if !ok {
        p = &Page{Path: path} // title fetched elsewhere, never under the lock
        s.pages[path] = p
    }
    p.Views++
    s.total++
    if hasMs {
        p.ReadMs += ms
        p.Reads++
    }
}`}</code></pre>
      <p>
        An <strong>atomic</strong> operation does a read-modify-write as one indivisible step,
        using the processor’s locked instructions: <code>atomic.Int64</code>’s <code>Add</code>,
        for example. It costs a few nanoseconds uncontended, more when many cores fight over the
        same cache line. It protects one word of memory and nothing else. A third option is to
        have no shared state at all: one goroutine owns the map, and handlers send it paths over
        a channel. Nothing needs a lock because only one goroutine ever touches the data.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Approach</th><th>What it guarantees</th><th>What it costs</th><th>Right when</th></tr>
          </thead>
          <tbody>
            <tr><td>One mutex around the store</td><td>all fields change together; readers see a consistent state</td><td>~20 ns per hit uncontended; waiting when contended</td><td>updates are short and the state is related</td></tr>
            <tr><td>Atomic per counter</td><td>each counter is exact on its own</td><td>a few ns; no help with map inserts or multi-field updates</td><td>one independent number, such as a request count</td></tr>
            <tr><td>Sharded store (N maps, N locks)</td><td>consistency within each shard only</td><td>more code; <code>/top</code> must merge shards</td><td>a profile shows one lock is genuinely contended</td></tr>
            <tr><td>Single owner + channel</td><td>no shared memory at all</td><td>~100s of ns per send; one core’s throughput at most</td><td>the logic is complex and naturally sequential</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        For hitcount, the arithmetic picks the first row. Each hit holds the lock for perhaps 100
        ns. At 2,000 hits a second, the lock is held for 2,000 × 100 ns = 0.2 ms out of every
        second, 0.02% of the time. The chance that a hit finds the lock taken is about the same,
        and the wait when it does is about 100 ns. Contention only becomes noticeable as that
        fraction approaches tens of percent: at 100 ns per hit, that is millions of hits a second.
        We write the decision down: one mutex guards the whole store, because at our load it is
        held 0.02% of the time and it keeps every invariant in one place.
      </p>

      <h3>What does the lock protect?</h3>
      <p>
        The comment on <code>mu</code> is not decoration. A lock protects an{' '}
        <strong>invariant</strong>, a statement about the data that must hold whenever nobody is
        in the middle of changing it. For hitcount there are two. The total equals the sum of all
        pages’ views. And each page’s <code>ReadMs</code> and <code>Reads</code> describe the same
        set of reports, so that their ratio is a real average.
      </p>
      <p>
        That second invariant is why atomics alone are not enough. Suppose we replaced the mutex
        with atomics, one per field, to avoid locking. A page has <code>Reads = 1</code> and{' '}
        <code>ReadMs = 45,000</code>. A new report arrives. The handler atomically adds 45,000 to{' '}
        <code>ReadMs</code>; before it increments <code>Reads</code>, the stats page reads both
        fields and computes 90,000 ÷ 1, an average of 90 seconds that never existed. Each field
        was updated atomically; the pair was not. Atomic operations do not compose. The moment an
        invariant spans two values, it needs something that covers both, which is what the mutex
        does.
      </p>
      <p>
        Readers need the lock too. <code>/top</code> reads <code>Views</code> while handlers write
        it. On 64-bit hardware an aligned 8-byte load will not see half of one value and half of
        another, but Go’s memory model makes no promise about a racy program at all: the compiler
        may keep a value in a register, reorder reads, or assume nothing else changes it. The race
        detector reports the read, and it is right to. Either <code>/top</code> takes the lock
        while it copies what it needs, or it reads from a separate copy that is never written.
      </p>

      <h3>A deadlock in the snapshot code</h3>
      <p>
        Locks fix races and introduce a failure of their own. hitcount version 2 has two locks.{' '}
        <code>s.mu</code> guards the store, as above. <code>snapMu</code> makes sure only one
        snapshot is written at a time. The snapshot loop takes <code>snapMu</code>, then{' '}
        <code>s.mu</code> to read the store. Later someone adds an admin endpoint to rename a page
        when a post’s URL changes. It takes <code>s.mu</code>, moves the entry to its new key, and
        then, still holding <code>s.mu</code>, calls the snapshot function so the rename is saved
        immediately. The snapshot function takes <code>snapMu</code>.
      </p>
      <p>
        One afternoon the timing lines up. The snapshot loop takes <code>snapMu</code> and asks for{' '}
        <code>s.mu</code>. At the same moment, a rename has taken <code>s.mu</code> and asks for{' '}
        <code>snapMu</code>. Each goroutine holds what the other needs and waits for it. Neither
        will ever let go. Within milliseconds every incoming hit calls <code>s.mu.Lock()</code> and
        joins the wait. hitcount stops answering. Its CPU usage drops to zero, which is the
        signature of a deadlock rather than an overload.
      </p>
      <p>
        Go does detect deadlocks, but only when every goroutine in the program is blocked. The
        HTTP server’s listening goroutine is waiting in the network poller, which does not count,
        so the runtime sees a healthy program. The fastest way to diagnose this in production is a
        goroutine dump (send <code>SIGQUIT</code>, or fetch <code>/debug/pprof/goroutine</code>):
        two goroutines blocked in <code>Lock</code>, each holding the lock the other wants, and
        two thousand more queued behind them.
      </p>
      <p>
        A deadlock needs four conditions at once: exclusive locks, holding one lock while waiting
        for another, no way to take a lock away, and a cycle in who waits for whom. The practical
        fixes break the second or the fourth. One is a global order: every code path takes{' '}
        <code>snapMu</code> before <code>s.mu</code>, never the reverse, so no cycle can form. The
        better fix here is to stop holding locks while calling into other code. The rename now
        updates the map, releases <code>s.mu</code>, and then signals the snapshot loop on a
        channel. The snapshot loop, in turn, holds <code>s.mu</code> only while copying the counts,
        and writes the file after releasing it, so no lock is ever held during disk I/O.
      </p>
      <p>
        That last change has a cost: the copy. For two thousand pages it is a few hundred
        kilobytes and tens of microseconds. For the platform’s 5 million pages it is hundreds of
        megabytes, and the performance chapter will show what happens when someone tries to avoid
        it.
      </p>

      <h3>A write another core may never see</h3>
      <p>
        Races are not only about lost updates. They are also about whether one goroutine’s write
        becomes visible to another at all. hitcount’s graceful shutdown shows how.
      </p>
      <p>
        When the container is asked to stop, a signal handler should let the snapshot loop finish
        its current write and save one last time. The first attempt used a plain boolean:
      </p>
      <pre><code>{`var stopping bool // set by the signal handler, read by the snapshot loop

go func() {
    <-sigterm
    stopping = true
}()

for !stopping {
    s.snapshotIfDue()
}
s.snapshotNow()`}</code></pre>
      <p>
        Nothing in this code orders the write to <code>stopping</code> before the read in the loop.
        Go’s memory model, like those of C++, Java and Rust, says that without such an ordering the
        reading goroutine is not guaranteed to see the write, ever. In practice, two things can
        happen. The compiler, seeing no synchronisation inside the loop, may load{' '}
        <code>stopping</code> into a register once and test the register forever. And on processors
        with weaker ordering rules than x86, including the ARM chips in many cloud servers, writes
        from one core can become visible to another in a different order from the one the code
        wrote them in.
      </p>
      <p>
        The unpleasant part is that this version usually works. With a function call in the loop
        body, the current compiler happens to reload the variable each time, and on an x86 laptop
        the ordering is strict enough to hide the problem. It fails after a compiler upgrade
        changes inlining, or after a move to ARM servers, and the symptom is a container that
        ignores its stop signal until it is killed, losing every count since the last snapshot.
      </p>
      <p>
        The language defines a <strong>happens-before</strong> relation that does guarantee
        visibility. Unlocking a mutex happens before the next lock of it. A send on a channel
        happens before the matching receive completes, and closing a channel happens before a
        receive that sees it closed. An atomic store happens before an atomic load that observes
        it. Writes made before any of those events are visible after the matching event. So the
        fix is to communicate the stop through one of them: close a <code>done</code> channel and
        have the loop <code>select</code> on it, or use an <code>atomic.Bool</code>. The cost is
        nothing measurable. The rule that falls out is simple to state: if two goroutines share a
        variable and one writes it, every access needs a synchronising operation between them,
        even when the variable is a single boolean and no update can be “lost”.
      </p>

      <h3>Event loops: fewer interleavings, not none</h3>
      <p>
        The Node.js version of hitcount runs all JavaScript on one thread. While one handler
        runs, no other JavaScript runs, so <code>counts.set(path, (counts.get(path) || 0) + 1)</code>{' '}
        on an in-memory map is safe without a lock. Interleaving happens only where code waits,
        at each <code>await</code>, and between those points every handler has the data to itself.
      </p>
      <p>
        Now the team runs four Node processes to use four cores, and moves the counts into Redis so
        the processes can share them:
      </p>
      <pre><code>{`app.post('/hit', async (req, res) => {
  const key = 'views:' + canonical(req.query.page)
  const v = await redis.get(key)       // other handlers run while we wait
  await redis.set(key, Number(v) + 1)  // ...and one of them may have written in between
  res.status(204).end()
})`}</code></pre>
      <p>
        This is the lost update again, now across processes and a network. Two handlers read 41,
        both write 42. The fix is to make the read-modify-write one operation on the server that
        owns the data: <code>await redis.incr(key)</code>. Redis runs each command on its own
        single thread, so the increment is indivisible. The general lesson carries straight into
        the Distributed Systems pathway: an operation that reads, decides and writes is only safe
        when one owner performs all three.
      </p>
      <p>
        Event loops have a failure of their own. Because one thread runs everything, a handler that
        computes for a long time stops every other handler. Building the platform-wide{' '}
        <code>/top</code> over 5 million pages in JavaScript would take on the order of a second,
        during which no hit is counted and no other request is answered. Heavy computation on an
        event loop belongs in a worker thread, another process, or a precomputed result.
      </p>

      <h3>When not to add a lock</h3>
      <p>
        Locks are for state that is shared and mutable. Data written once before any goroutine
        starts, such as configuration, needs no lock. Data owned by exactly one goroutine needs no
        lock. Immutable data can be shared freely, and that gives a useful pattern for readers:
        build a new top-ten list, then publish it by swapping a single pointer with an atomic
        store. Readers load the pointer and use whatever list it points to, which never changes
        after publication. Readers never wait; the cost is building a fresh copy for every update.
      </p>
      <p>
        The habit to avoid is adding locks until the race detector goes quiet. Every lock added
        without knowing which invariant it guards is another candidate for a deadlock cycle. If you
        cannot say in one sentence what a lock protects, the design is not finished. Revisit
        hitcount’s single mutex if a mutex profile (the performance chapter shows how) reports real
        waiting on it, or if a hit ever needs to do slow work, such as I/O, that would have to
        happen while holding it.
      </p>
      <Callout>
        For every piece of shared state, be able to say who may touch it and what must remain true
        when they finish. If you cannot, that state is a bug that has not fired yet.
      </Callout>
      <p>
        So far every request began when bytes arrived on hitcount’s socket. The next chapter,{' '}
        <em>One request across the network</em>, starts further back, in a reader’s browser on
        another continent, and accounts for the 800 milliseconds that pass before the 40
        microseconds of work in <code>hit</code> begin.
      </p>
      <Notes
        items={[
          'An unsynchronised increment from two cores can lose updates, and a single-core test run will rarely show it.',
          'Run tests with the race detector; it reports racy accesses even when the interleaving happened to produce the right answer.',
          'A lock protects an invariant; write the invariant next to the lock.',
          'Atomics protect one word each and do not compose; a rule that spans two fields needs a lock or a single owner.',
          'Deadlocks come from cycles in lock acquisition; take locks in one global order and never hold one across I/O or calls into unknown code.',
          'Event loops remove interleaving between awaits, but a read, an await and a write is still a lost update.',
        ]}
      />
    </>
  ),

  /* ── 06 · The network ───────────────────────────────────────── */
  network: (
    <>
      <p>
        This chapter lets you account for the time between a reader’s browser and hitcount’s
        handler, and name each thing that can go missing on the way. The network is the bottom of
        the latency ladder and the first place where failure is partial: a packet can simply fail
        to arrive, and nobody is obliged to tell you.
      </p>
      <p>
        A reader in Mumbai finishes a post. hitcount runs on one server in the eastern United
        States. The browser’s developer tools show the hit request taking about 800 ms. hitcount’s
        own log says the handler took 40 µs. The difference is twenty thousand times the work, and
        all of it is spent before or after our code runs.
      </p>

      <h3>A name becomes an address</h3>
      <p>
        The page’s script sends its request to <code>hitcount.example.com</code>. Before anything
        else, the browser needs an IP address. It asks the operating system, which asks a
        recursive resolver, usually run by the reader’s ISP or a public service. If the resolver
        has the answer cached, it replies at once. If not, it asks a root server which servers
        handle <code>.com</code>, asks those which servers are authoritative for{' '}
        <code>example.com</code>, and asks those for the address. Each answer comes with a{' '}
        <strong>TTL</strong>, the number of seconds it may be cached.
      </p>
      <p>
        The TTL is the first cache you configure, and it sets a trade-off you will meet again. We
        once moved hitcount to a new server by changing its DNS record, which had a TTL of 3,600
        seconds. For the next hour, resolvers that had cached the old address kept sending readers
        to the old server, and some resolvers ignore TTLs and hold answers longer. Any hit sent
        there was lost, because the old server had been switched off. The fix for next time: lower
        the TTL to 60 seconds a day before a move, so that every cache has expired the long TTL
        before the change, and keep the old server running, forwarding hits to the new one, until
        its traffic falls to zero. The cost of a short TTL is more lookups, so more readers pay a
        full resolution on their first request. We raise it again once the move is done.
      </p>

      <h3>A connection costs round trips before it carries anything</h3>
      <p>
        IP, the protocol that carries packets between machines, promises nothing: packets can be
        lost, duplicated or reordered. <strong>TCP</strong> builds a reliable, ordered stream of
        bytes on top of it. Before any data flows, the two ends exchange three packets to agree on
        starting sequence numbers: SYN, SYN-ACK, ACK. That is one full round trip. Then TLS 1.3
        spends one more round trip agreeing on keys and proving the server’s identity. Only then
        can the browser send the request and wait one further round trip for the response.
      </p>
      <Fig caption="Fig 1 · A fresh HTTPS request pays for DNS, TCP and TLS before the request itself crosses the wire">
        <RoundTrips />
      </Fig>
      <p>
        The round-trip time (RTT) between Mumbai and the eastern US is set mostly by physics. Light
        in optical fibre travels at about two-thirds of its speed in a vacuum, roughly 200,000 km a
        second. The great-circle distance is about 13,000 km, and real cable routes are longer. So
        one way takes at least 65 ms and a round trip at least 130 ms; in practice it is around 200
        ms. No amount of bandwidth changes that number.
      </p>
      <Predict q={<>The reader’s browser has no open connection to hitcount and its resolver has the address cached. Using an RTT of 200 ms, how long until the first hit is answered? The reader then opens a second post and leaves it a minute later. How long does that hit take?</>}>
        <p>
          First hit: DNS is answered from the nearby resolver’s cache, a few milliseconds. Then
          TCP’s handshake (200 ms), TLS 1.3 (200 ms) and the request itself (200 ms). About 600 ms,
          plus the 40 µs of real work. If the resolver had to go to the authoritative servers, add
          up to another round trip or more, which gets us to the 800 ms in the developer tools.
        </p>
        <p>
          Second hit: if the browser kept the connection open (HTTP keep-alive), only the request
          crosses the ocean, so about 200 ms. If the connection was closed in between, the whole
          600 ms is paid again.
        </p>
        <p>
          Two improvements follow. Reuse connections wherever possible, which is what keep-alive
          and connection pools do. And move the handshakes closer to the reader: a proxy at the
          edge of the network near Mumbai terminates TCP and TLS 20 ms away and forwards the hit to
          hitcount over a connection it keeps open permanently. The reader’s first hit then costs
          a few short round trips plus one long one. Because the blog sends hits with{' '}
          <code>navigator.sendBeacon</code>, which does not hold up the page, readers never feel
          any of this; it matters for <code>/top</code>, which the sidebar waits for.
        </p>
      </Predict>
      <p>
        Written out as a budget, the three cases look like this. The edge column assumes a proxy
        about 10 ms from the reader that keeps a warm connection open to hitcount.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Step</th><th>Fresh connection to hitcount</th><th>Reused connection</th><th>Fresh connection to a nearby edge</th></tr>
          </thead>
          <tbody>
            <tr><td>DNS</td><td>0–200 ms</td><td>0</td><td>0–20 ms</td></tr>
            <tr><td>TCP handshake</td><td>200 ms</td><td>0</td><td>20 ms</td></tr>
            <tr><td>TLS 1.3 handshake</td><td>200 ms</td><td>0</td><td>20 ms</td></tr>
            <tr><td>Request and response</td><td>200 ms</td><td>200 ms</td><td>20 ms + 200 ms on the warm edge-to-origin link</td></tr>
            <tr><td>hitcount’s handler</td><td>0.04 ms</td><td>0.04 ms</td><td>0.04 ms</td></tr>
            <tr><td>Total</td><td>600–800 ms</td><td>~200 ms</td><td>~260–280 ms</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The edge removes the handshakes from the long path but not the ocean. The last 200 ms can
        only go if the request stops crossing it, and for hits there is a way to arrange that. The
        edge can answer the browser with <code>204 No Content</code> immediately and forward hits
        to hitcount in batches every second. The reader’s request then completes in 60 to 80 ms.
        The cost is a new failure: if an edge machine crashes while holding a second’s worth of
        hits, they are gone, and the browser was already told they had been received. For a page
        view counter we accept that. For anything that represents money or a user’s action, the
        acknowledgement would have to wait until the data was stored somewhere durable, and the
        round trip would come back.
      </p>

      <h3>What TCP does when packets go missing</h3>
      <p>
        TCP numbers every byte. The receiver acknowledges what has arrived, and the sender
        retransmits anything that is not acknowledged in time, or sooner if repeated
        acknowledgements show a gap. It also paces itself. <strong>Flow control</strong> stops the
        sender from overrunning the receiver’s buffer. <strong>Congestion control</strong> stops it
        from overrunning the network: a new connection starts with a small window, typically ten
        packets or about 14 KB in flight, and doubles it every round trip until loss signals that
        the path is full. This is called slow start.
      </p>
      <p>
        Slow start explains a number that otherwise looks wrong. hitcount’s <code>/top</code>{' '}
        response is about 2 KB and fits in the first window, so it arrives one round trip after the
        request. The platform’s CSV export of a blog’s counts is about 1 MB. On a fresh connection
        the window grows 14 KB, 28, 56, 112 and so on; the total sent after k round trips is about
        14 KB × (2ᵏ − 1), so 1 MB needs about seven round trips. At 200 ms that is 1.4 seconds,
        even on a link that could carry the whole file in a few milliseconds. Reusing a warm
        connection avoids most of it.
      </p>
      <p>
        Because TCP delivers bytes strictly in order, one lost packet holds up everything sent after
        it until the retransmission arrives. This <strong>head-of-line blocking</strong> shaped the
        last decade of HTTP:
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Version</th><th>Transport</th><th>Requests per connection</th><th>Where one lost packet hurts</th></tr>
          </thead>
          <tbody>
            <tr><td>HTTP/1.1</td><td>TCP</td><td>one at a time</td><td>that request; browsers open ~6 connections to work around it</td></tr>
            <tr><td>HTTP/2</td><td>TCP</td><td>many interleaved streams</td><td>every stream on the connection waits</td></tr>
            <tr><td>HTTP/3</td><td>QUIC over UDP</td><td>many independent streams</td><td>only the stream that lost the packet; handshake also combined</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>The queue in front of accept</h3>
      <p>
        One more piece of TCP machinery explains a latency pattern that looks like a clue once you
        know it. The first chapter’s trace showed hitcount calling <code>listen(3, 4096)</code>. The
        second argument sizes a queue inside the kernel. When a browser’s SYN arrives, the kernel
        completes the handshake on hitcount’s behalf, without waking the program, and puts the
        finished connection on that queue. Only when hitcount calls <code>accept</code> does the
        connection leave the queue and become a file descriptor.
      </p>
      <p>
        Go’s HTTP server accepts on a goroutine of its own and starts a new goroutine per
        connection, so it keeps accepting even when every handler is stuck; that is why the
        performance chapter will find a pile of waiting goroutines rather than a full queue. A
        server with a fixed pool of worker threads behaves differently. The team’s early Python
        prototype of hitcount ran sixteen threads, and when all sixteen were blocked on the same
        slow lock, nothing called <code>accept</code> and the queue filled. Once it is full, Linux by default
        quietly drops new SYNs instead of refusing them, so the client hears nothing and, after its
        retransmission timer expires, sends the SYN again. That timer starts at one second and
        doubles on each retry. The result is a distinctive histogram: most connections take a round
        trip to establish, and then there are clusters at about one second and about three seconds,
        with almost nothing in between. Latencies that bunch at those values are worth reading as
        “the server’s accept queue was full”, and the kernel counts the drops (<code>netstat -s</code>{' '}
        reports listen queue overflows) so the suspicion can be confirmed.
      </p>
      <p>
        A bigger queue is not the fix. It only lets more connections wait longer. The fix is
        whatever stopped the program accepting, and the queue size is a reminder that the network
        stack has buffers between every pair of layers, each of which hides a stall for a while and
        then turns it into timeouts somewhere else.
      </p>

      <h3>Bytes, not messages</h3>
      <p>
        Version 3 of hitcount added a second way to receive hits, to count readers whose browsers
        block the script. The blog’s web server streams its access log to hitcount over a plain TCP
        connection, one page path per line. The first implementation of the receiving end looked
        like this:
      </p>
      <pre><code>{`buf := make([]byte, 4096)
for {
    n, err := conn.Read(buf)
    if err != nil {
        return
    }
    for _, path := range strings.Split(string(buf[:n]), "\\n") {
        if path != "" {
            s.hit(path)
        }
    }
}`}</code></pre>
      <p>
        It passed every test, because on a laptop each line the sender wrote arrived as one read. In
        production it miscounted, and here is the sequence. TCP delivers a stream of bytes and
        keeps no record of where the sender’s writes began or ended. Under load the sender’s lines
        are packed into packets and the packets arrive in bursts, so a read returns whatever is in
        the buffer at that moment. One read returned{' '}
        <code>/posts/unicode\n/posts/ca</code>, the next <code>che-design\n</code>. The loop
        counted a page called <code>/posts/ca</code> and a page called <code>che-design</code>,
        and the real post lost a view. At thousands of lines a second, that produced thousands of
        junk keys, which is the unbounded-map problem from the operating system chapter arriving by
        a new route.
      </p>
      <p>
        The fix is to keep the partial line until the rest arrives. In Go,{' '}
        <code>bufio.Scanner</code> does exactly that, splitting on newlines across reads. The cost
        is a decision about limits: the scanner refuses lines longer than its buffer (64 KB by
        default), so a sender that never sends a newline cannot make us buffer forever. Every
        protocol over TCP must define where one message ends, with a delimiter as here, a length
        prefix, or a header that states the length, as HTTP’s <code>Content-Length</code> does.
      </p>

      <h3>The network does not say no; it goes quiet</h3>
      <p>
        The most damaging line in hitcount is <code>fetchTitle</code>. The first version called the
        content system with Go’s default HTTP client, which has no timeout. On a normal day the
        content system answers in about 20 ms, at worst 150 ms.
      </p>
      <p>
        One evening the content system’s database stalled. Its web server still accepted
        connections, so there was no error, just silence. Step by step: the next hit for a page
        hitcount had not seen before called <code>fetchTitle</code> and waited. In version 2 that
        call happened while holding <code>s.mu</code>, because it sat inside the code that inserts
        a new page. Every other hit now queued for the lock. Goroutines piled up, one per incoming
        request, each holding its connection and a few kilobytes of memory. hitcount, a service
        whose job does not require titles at all, stopped counting because a dependency that only
        provides titles went quiet.
      </p>
      <p>
        The fix had three parts. A client with a timeout:{' '}
        <code>http.Client{'{'}Timeout: 2 * time.Second{'}'}</code>, chosen as a comfortable multiple
        of the content system’s normal worst case. The call moved out from under the lock: a new
        page is inserted with its path as a provisional title, and a background goroutine fetches
        the real title and fills it in later. And a failed fetch is retried a few minutes later
        rather than immediately. The cost is visible: during an outage of the content system,
        new posts appear in the sidebar under their paths for a while. We chose that over an
        outage of our own.
      </p>
      <p>
        Choosing the number deserves more care than it usually gets. A timeout far above the
        dependency’s normal worst case, say 30 seconds, protects nothing: by the time it fires,
        thousands of requests have queued behind it, as Little’s law in the performance chapter will
        show. A timeout at or below its normal p99 fails requests that would have succeeded, one in
        a hundred on an ordinary day. A small multiple of the normal p99 sits between the two.
        Retries need the same discipline. If every caller retries a timed-out request three times,
        a dependency that slows down receives up to four times its usual load at the moment it can
        least handle it. So hitcount retries title fetches at most once, minutes later, and the
        Distributed Systems pathway covers the general forms: retry budgets, jittered backoff and
        deadlines passed from caller to callee.
      </p>
      <p>
        A timeout leaves a harder question, and it belongs to the next pathway. When a request
        times out, we do not know whether the other side did the work. If the content system had
        been a billing service rather than a source of titles, a timed-out request might have
        charged the customer, and a retry might charge them twice. On one machine an operation
        either happened or did not. Across a network there is a third answer, “unknown”, and the
        Distributed Systems pathway is largely about designing for it.
      </p>

      <h3>When not to go lower than HTTP</h3>
      <p>
        The raw TCP log feed cost us a framing bug that HTTP would have prevented, because HTTP
        already defines where each request begins and ends. Most services should speak HTTP or
        gRPC to each other and leave sockets to the libraries. Write your own protocol over TCP
        only when you need something the standard ones cannot give you, such as very low per-message
        overhead at very high rates, and then define the framing first.
      </p>
      <p>
        Revisit the network design when the numbers move. If most readers are far from the server,
        terminate connections at the edge. If hit volume grows by orders of magnitude, batch: one
        request carrying a hundred hits pays the round trip once instead of a hundred times. If a
        dependency sits on the request path, give every call to it a timeout and decide in advance
        what the request does when the timeout fires.
      </p>
      <p>
        We can now price every part of one request: instructions, memory, system calls, round
        trips. The next chapter, <em>Reasoning about cost</em>, turns those prices into estimates
        made before building, and uses them to decide whether one machine can run hitcount for the
        whole platform.
      </p>
      <Notes
        items={[
          'A DNS TTL is a cache lifetime: lower it before a migration, and expect some resolvers to hold old answers longer.',
          'A fresh HTTPS connection costs about three round trips before the response; at intercontinental distances that is more than half a second.',
          'Round-trip time is bounded by the speed of light in fibre, so reuse connections and terminate them close to the user.',
          'TCP slow start means a large response on a fresh connection takes several round trips regardless of bandwidth.',
          'TCP delivers bytes, not messages; every protocol on top of it must define where a message ends.',
          'Every network call needs a timeout and a planned fallback, and should never be made while holding a lock.',
        ]}
      />
    </>
  ),

  /* ── 07 · Reasoning about cost ──────────────────────────────── */
  cost: (
    <>
      <p>
        This chapter lets you estimate, before building, whether a design will survive the load it
        is meant for, and find out which part of it will break first. The tools are a way of
        describing how cost grows with input (big-O notation), the prices from earlier chapters,
        and a few minutes of arithmetic.
      </p>
      <p>
        The platform from the machine chapter has said yes. hitcount will count views for about
        20,000 blogs and 5 million pages. Traffic averages 1,000 hits a second, with peaks of
        10,000 when several posts go viral at once. Each blog’s sidebar calls{' '}
        <code>/top</code> for its own pages, and the platform’s home page shows a trending list
        across all of them. Before anyone writes code for this, we want to know three things. Do
        any of hitcount’s algorithms fall over at this size? Can one machine do it? And if
        something breaks first, what?
      </p>

      <h3>Ask how cost grows, then put a price on it</h3>
      <p>
        Big-O notation describes how the work an algorithm does grows as its input grows, ignoring
        constant factors. Looking up a page in a hash map is O(1): the work does not depend on how
        many pages there are. Scanning every page is O(n). Sorting them is O(n log n). Comparing
        every page with every other is O(n²). The notation deliberately hides constants, which the
        machine chapter showed can differ a hundredfold, so it answers a narrower question than
        “how fast?” It answers “what happens when n gets much bigger?”, which is exactly the
        question the platform asks.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Growth</th><th>Where hitcount does it</th><th>Steps at n = 2,000</th><th>Steps at n = 5 million</th><th>At ~1 ns per step</th></tr>
          </thead>
          <tbody>
            <tr><td>O(1)</td><td>find a page in the map</td><td>1</td><td>1</td><td>nanoseconds</td></tr>
            <tr><td>O(log n)</td><td>find a position in a sorted index</td><td>~11</td><td>~22</td><td>nanoseconds</td></tr>
            <tr><td>O(n)</td><td>scan every page’s count</td><td>2,000</td><td>5 × 10⁶</td><td>~5 ms</td></tr>
            <tr><td>O(n log n)</td><td>sort every page</td><td>~22,000</td><td>~1.1 × 10⁸</td><td>~0.1 s, more with cache misses</td></tr>
            <tr><td>O(n²)</td><td>compare every page with every other</td><td>4 × 10⁶</td><td>2.5 × 10¹³</td><td>~7 hours</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The last column is the step that turns notation into a decision. Multiply the step count by
        a realistic cost per step, taken from the latency table, and the growth class becomes a
        duration you can compare with a budget. The O(n²) row is harmless at two thousand items, 4
        ms, and absurd at five million.
      </p>

      <h3>The quiet quadratic</h3>
      <p>
        Nobody writes an O(n²) algorithm on purpose. It arrives as an O(n) operation inside
        something that is already done n times. hitcount’s version arrived with a bot filter. The
        rule was reasonable: ignore a repeat hit from the same IP address for the same page within
        30 minutes. The implementation kept a slice of recent hits and checked each new one against
        all of them:
      </p>
      <pre><code>{`for _, r := range s.recent {           // every hit in the last 30 minutes
    if r.ip == ip && r.path == path {
        return // repeat hit, ignore it
    }
}
s.recent = append(s.recent, seen{ip, path, now})`}</code></pre>
      <p>
        On the single blog this was invisible. At 50 hits a second, 30 minutes holds 50 × 1,800 =
        90,000 entries. Checking each costs a couple of nanoseconds, so a hit spends about 0.2 ms
        in the loop, and 50 hits a second cost 10 ms of CPU per second: 1% of one core.
      </p>
      <Predict q={<>A post goes viral and hits rise from 50 a second to 2,000 a second, forty times more. The filter used 1% of a core before. What does it use now?</>}>
        <p>
          The rate rose 40 times, so there are 40 times as many hits to check. The window now holds
          2,000 × 1,800 = 3.6 million entries, also 40 times more, so each check is 40 times
          longer. Total work grows by 40 × 40 = 1,600. One percent of a core becomes around sixteen
          cores. That is the signature of a quadratic: double the traffic and the work quadruples.
        </p>
        <p>
          It was worse than that, because the loop ran while holding the store’s mutex. However
          many cores the machine had, only one hit could be in the loop at a time, so hitcount
          could process at most one hit per 7 ms or so, about 140 hits a second. Requests arrived
          at 2,000 a second and the queue grew until connections timed out.
        </p>
      </Predict>
      <p>
        The fix replaces the scan with a hash map keyed by the IP-and-path pair, holding the time
        it was last seen, and sweeps out expired entries once a minute. Each check becomes O(1). The
        cost moves from time to memory, and the memory is worth pricing. At the spike, 3.6 million
        entries at around 100 bytes each (two strings, a timestamp and the map’s overhead) is 360
        MB, more than hitcount’s entire container limit. So the requirement had to give a little
        too. We shortened the window to five minutes, which still catches the bots we had seen, and
        stored a 64-bit hash of the pair instead of the two strings. Five minutes at 2,000 hits a
        second is 600,000 entries; at about 40 bytes each, roughly 25 MB. The maths chapter shows why
        a 64-bit hash makes accidental collisions between pairs vanishingly unlikely.
      </p>
      <p>
        This is the general shape of algorithmic fixes in services: trade a growing cost in time
        for a bounded cost in memory, then check the memory against the machine. An estimate that
        stops after the first half often trades one outage for another.
      </p>

      <h3>/top: sort it, heap it, or keep it sorted</h3>
      <p>
        <code>/top</code> has four reasonable designs. Which one is right depends on two numbers:
        how many pages there are, and how often <code>/top</code> is called compared with how often
        a hit arrives.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Design</th><th>Cost per /top</th><th>Cost per hit</th><th>What it must also handle</th></tr>
          </thead>
          <tbody>
            <tr><td>Sort every page on each call</td><td>O(n log n)</td><td>O(1)</td><td>nothing; it is the simplest</td></tr>
            <tr><td>Scan with a 10-item heap</td><td>O(n log k), close to O(n)</td><td>O(1)</td><td>a flat layout to make the scan fast</td></tr>
            <tr><td>Keep pages in a sorted structure</td><td>O(k)</td><td>O(log n): remove and reinsert</td><td>every hit pays; pointer-heavy trees</td></tr>
            <tr><td>Compute every t seconds, cache it</td><td>O(1) almost always</td><td>O(1)</td><td>the list is up to t seconds stale</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        For the original blog: n = 2,000, <code>/top</code> called about 5 times a second (the CDN
        in front of the blog caches most sidebar requests), and up to 2,000 hits a second. Sorting
        costs about 22,000 comparisons, perhaps 0.1 ms, five times a second: half a millisecond of
        CPU per second. A sorted structure would instead charge every hit about 11 steps of pointer
        chasing, 22,000 steps a second at the spike. The costs are similar and tiny, so the
        simplest design wins. We keep the sort.
      </p>
      <p>
        Now change the variables to the platform’s trending list: n = 5 million, called 50 times a
        second, with 10,000 hits a second. Sorting costs around a second per call, at least; fifty
        calls a second would need fifty cores. That design is out. A heap scan over a flat array
        costs about 15 ms per call, 0.75 of a core at fifty calls a second. It works, but it spends
        most of a core recomputing an answer that barely changes between calls. Caching for 5
        seconds means one scan per 5 seconds, about 3 ms of CPU per second. The cost is that the
        trending list can be 5 seconds out of date, and nobody browsing a trending list can tell.
        The decision: for the platform, scan with a heap every 5 seconds and serve the cached
        result; for a single blog’s sidebar, keep sorting on each call.
      </p>

      <h3>Amortised and expected costs</h3>
      <p>
        Two refinements stop big-O from misleading. The first is <strong>amortised</strong> cost.
        A Go map that runs out of room grows to a larger table and moves its entries. That one
        insert costs O(n), but it happens only after many cheap inserts, so the cost averaged over
        all inserts is still O(1). Go also spreads the move across subsequent operations rather than
        doing it all at once, so no single hit pays the full price. When latency matters, it is
        worth asking whether an amortised O(1) operation does its expensive work all at once.
      </p>
      <p>
        The second is the difference between <strong>expected</strong> and worst-case cost. A hash
        map is O(1) on average because a good hash function spreads keys evenly over its slots.
        If many keys land in the same slot, lookups degrade to O(n), and n lookups to O(n²). For a
        service whose keys come from the internet, that is not a theoretical case. In 2011,
        researchers showed that many web frameworks could be stalled with a single request full of
        parameter names crafted to collide, a hash-flooding attack. Go’s maps use a hash seeded
        randomly when each map is created, so an attacker cannot compute colliding paths in
        advance. If you ever write your own hash table keyed by outside input, it needs the same
        property.
      </p>

      <h3>The estimate, worked: can one machine run the platform?</h3>
      <p>
        Now the question the platform actually asked. We go resource by resource, with the peak
        load of 10,000 hits a second and 5 million pages.
      </p>
      <p>
        CPU. A hit costs a few tens of microseconds of CPU: parsing HTTP, a few system calls, a
        canonicalised map lookup and a short critical section. Call it 50 µs to be safe. 10,000 ×
        50 µs = 0.5 seconds of CPU per second, half a core. The <code>/top</code> designs above add
        a few percent.
      </p>
      <p>
        Memory. About 200 bytes per page for the key, struct, title and map overhead, times 5
        million, is 1 GB. The bot filter adds 25 MB. A machine with 4 GB of RAM leaves comfortable
        headroom, and the languages chapter will show why “comfortable” matters for a garbage
        collected runtime.
      </p>
      <p>
        Network. A hit request is about 500 bytes with headers. 10,000 × 500 bytes = 5 MB a second,
        40 Mbit/s. Any cloud machine handles that.
      </p>
      <p>
        Disk. This is where the estimate finds the problem. The snapshot is JSON at about 120
        bytes a page, so 5 million pages make a 600 MB file. Written every 10 seconds, that is 60
        MB a second of continuous disk writes. Encoding JSON at roughly 400 megabytes a second
        takes about a second and a half of a core per snapshot, 15% of a core all the time, and the
        concurrency chapter’s design copies all the counts under the lock first. Nothing about the
        hit path is in trouble. The snapshot is.
      </p>
      <p>
        The real fix is to stop writing pages that have not changed. At 1,000 hits a second, at
        most 10,000 pages change in a 10-second window, about 1.2 MB of JSON. Write a full snapshot
        once an hour and small files of changed pages every 10 seconds, and on restart load the full
        snapshot and replay the changes after it. The cost is recovery code that must handle
        partial and out-of-order files, which is the design of a log-structured store in miniature
        and the subject of a System Design chapter. Until it is built, the interim decision is a
        full snapshot once a minute instead of every ten seconds: one sixth of the write load, in
        exchange for up to a minute of counts lost in a power cut. The performance chapter picks up
        what happened next.
      </p>
      <p>
        Money. A cloud machine with 4 vCPUs and 8 to 16 GB of memory costs in the region of a
        hundred dollars a month at on-demand prices, less with a commitment. That number is worth
        putting next to the alternative. Splitting hitcount across several machines to “be ready
        for scale” would take an engineer weeks and add every problem in the Distributed Systems
        pathway. A year of the single machine costs less than a few days of that engineer’s time.
        The estimate is how we earned the right to stay on one machine.
      </p>

      <h3>Why half a core is not the same as half the risk</h3>
      <p>
        The CPU estimate said half a core at peak, on a four-core machine. It is tempting to read
        that as “we could take eight times the traffic”. Latency says otherwise, because of
        queueing, and the shape of the effect is worth carrying into every estimate.
      </p>
      <p>
        Any resource that serves requests one at a time, such as a core, a lock or a disk, has a
        utilisation ρ: the fraction of time it is busy. When requests arrive at random, a request
        that finds the resource busy waits. The simplest queueing model, a single server with
        random arrivals and random service times, gives the average time a request spends as the
        service time divided by (1 − ρ). At 50% utilisation, requests take twice their service
        time on average. At 80%, five times. At 90%, ten times. At 95%, twenty. Real systems do not
        follow the model exactly, but they share its shape: waiting is modest up to about half
        busy, grows quickly past 70 or 80%, and has no limit as utilisation approaches 100%.
      </p>
      <p>
        This is the hidden half of the bot filter story. Its loop, running under the store’s mutex,
        made the mutex itself the resource. At 50 hits a second each holding it for 0.2 ms, the
        mutex was 1% busy and nobody waited. At the spike, each hit needed it for about 7 ms and
        2,000 arrived each second, which asks for 14 seconds of mutex time per second. Utilisation
        above 100% has no steady state; the queue simply grows until something times out.
      </p>
      <p>
        So the estimate needs a target utilisation, not just a capacity. We plan for the busiest
        resource to be at most about 50% busy at the expected peak. hitcount’s CPU at 12% of four
        cores and its store mutex at a fraction of a percent both pass. The rule has a cost too: it
        means paying for capacity that is idle most of the time. The alternative is latency that
        climbs sharply exactly when traffic is highest, which for most services is the worst time
        for it.
      </p>

      <h3>When the estimate is the wrong tool</h3>
      <p>
        For small inputs, growth rates are irrelevant and constants decide. A linear scan of a
        dozen items in a slice beats a hash map lookup, and nobody should build a heap to find the
        largest of ten numbers. Estimating also has limits in the other direction. An estimate
        gives you an order of magnitude; it does not give you a tail latency, a lock convoy or a
        garbage collector pause. It tells you where to look, and measurement, the subject of the
        next chapter, tells you what is there.
      </p>
      <p>
        One more trap: big-O counts operations, not where they happen. If the sidebar fetched ten
        titles from the content system one request at a time, that is O(k) with k = 10, and also
        ten round trips, about 5 ms in one data centre. If someone later asks for the top hundred,
        it is a hundred round trips. A loop of network calls is priced in round trips, and the fix
        is to batch them into one request.
      </p>
      <p>
        The estimate says one machine can run the platform, and that the snapshot is the part to
        watch. The next chapter, <em>Measuring before believing</em>, starts on the morning after
        a release, when the p99 latency of <code>/hit</code> went from 4 ms to nearly a second and
        nothing in the estimate predicted it.
      </p>
      <Notes
        items={[
          'Big-O says how cost grows with input; multiply by a realistic per-step cost to turn it into a duration you can compare with a budget.',
          'A quadratic usually hides as a linear scan inside a per-request handler; doubling traffic then quadruples the work.',
          'Fixing time often costs memory, so price the memory before shipping the fix.',
          'The right algorithm depends on the read-to-write ratio, and caching a result for a few seconds is often the cheapest design.',
          'Hash maps keyed by outside input need a randomly seeded hash to keep their expected O(1).',
          'Estimate every resource, CPU, memory, network, disk and money, because the bottleneck is often the one nobody looked at.',
        ]}
      />
    </>
  ),

  /* ── 08 · Measuring before believing ────────────────────────── */
  performance: (
    <>
      <p>
        This chapter lets you go from “it is slow” to a specific cause with evidence, without
        guessing. The previous chapter estimated; this one measures. The two go together. An
        estimate with no measurement hardens into folklore, and a measurement with no estimate has
        no way to notice that it is absurd.
      </p>
      <p>
        The platform version of hitcount shipped a release on Tuesday. On Wednesday morning the
        dashboard showed the p99 latency of <code>/hit</code> at about 900 ms, up from 4 ms. The
        median had not moved from 3 ms. Readers did not notice, because hits are sent in the
        background. But the edge proxies in front of hitcount keep a limited pool of connections to
        it, and once a minute that pool filled and the proxies returned errors. Those hits were
        never counted.
      </p>

      <h3>Ask which latency got worse</h3>
      <p>
        A latency <strong>percentile</strong> is the value below which a given share of requests
        fall. The p50, or median, is the typical request. The p99 is the value only one request in
        a hundred exceeds. Different percentiles moving differently is the first piece of evidence,
        and averages hide it.
      </p>
      <p>
        Here is Wednesday’s data, simplified. Over each minute, 97.5% of hits take about 3 ms. The
        other 2.5% are delayed by anything from 0 to 1.5 seconds, spread fairly evenly, averaging
        750 ms. The mean is 0.975 × 3 ms + 0.025 × 750 ms ≈ 22 ms. On a dashboard showing only the
        mean, that reads as a mild regression from 3 ms. The median is still 3 ms. The p95 is
        still about 3 ms, because 95% of requests are unaffected. The p99 sits inside the delayed
        group: the slowest 1% of all requests is the slowest 40% of the delayed ones, so it lands
        around 0.6 × 1.5 s, about 900 ms.
      </p>
      <Predict q={<>Before reading further, use the shape alone. The median and p95 are unchanged, about 2.5% of requests are delayed, and the worst delay is about 1.5 seconds. What kind of event produces that, and how often must it happen?</>}>
        <p>
          Something stops all requests at once, for about 1.5 seconds, regularly. If every request
          during a 1.5-second window is delayed, and 2.5% of requests are delayed, then the window
          covers 2.5% of the time: 1.5 s ÷ 0.025 = 60 seconds. So: something that blocks every hit
          for about a second and a half, once a minute.
        </p>
        <p>
          A once-a-minute event in hitcount is easy to name: the snapshot, which the cost chapter
          moved to a one-minute interval. A slow dependency or a slow disk would produce a
          different shape, with delays spread across the minute rather than clustered.
        </p>
      </Predict>

      <h3>Ask each resource three questions</h3>
      <p>
        Before opening the code, check the resources. Brendan Gregg’s <strong>USE method</strong>{' '}
        asks three questions of every resource the service uses. Utilisation: how much of the time
        is it busy? Saturation: how much work is queued waiting for it? Errors: is it reporting
        failures? Resources include the obvious hardware, CPU, memory, disk and network, and also
        software resources that requests queue for: locks, connection pools, thread pools.
        Saturation is the question people skip, and it is where latency hides, because a queue is
        time spent doing nothing.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Resource</th><th>Utilisation</th><th>Saturation</th><th>Errors</th></tr>
          </thead>
          <tbody>
            <tr><td>CPU</td><td>~30%; one core pinned for ~1.5 s each minute</td><td>run queue short</td><td>none</td></tr>
            <tr><td>Memory</td><td>1.2 of 2 GB</td><td>no swapping, no reclaim</td><td>no OOM kills</td></tr>
            <tr><td>Disk</td><td>idle, then a ~600 MB write each minute</td><td>brief queue during the write</td><td>none</td></tr>
            <tr><td>Store mutex</td><td>held continuously for ~1.5 s each minute</td><td>~1,500 goroutines waiting at the peak</td><td>none</td></tr>
            <tr><td>Edge connection pool</td><td>a handful in use, of 1,000 allowed</td><td>exhausted each minute</td><td>503s returned to browsers</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The table points straight at the mutex. Nothing is short of CPU or memory. Once a minute,
        one goroutine holds the store’s lock for a second and a half and every hit queues behind
        it; the queue holds connections open, and the edge pool runs out.
      </p>

      <h3>Why 1,500 goroutines, and how many hits were lost</h3>
      <p>
        The numbers in that table are not independent, and one small law connects them.{' '}
        <strong>Little’s law</strong> says that in any stable system, the average number of items
        inside it equals the rate at which they arrive times the average time each one spends
        inside: L = λ × W. It holds whatever the distribution of arrivals or service times, which
        makes it one of the most useful relations in capacity work.
      </p>
      <p>
        On a normal minute, hits arrive at λ = 1,000 a second and each spends W = 3 ms in hitcount,
        so L = 1,000 × 0.003 = 3 hits in flight at any moment. That is why the edge proxies only
        ever had a handful of connections busy. During the stall, hits keep arriving at 1,000 a
        second and none leave. After 1.5 seconds, 1,500 are waiting, which is exactly the number of
        goroutines the dump found parked on the lock.
      </p>
      <p>
        The same arithmetic prices the damage. Each waiting hit holds one of the edge pool’s 1,000
        connections. The pool is full after one second of the stall, so for the remaining half
        second, about 500 hits are refused with a 503. Once a minute, out of 60,000 hits, that is
        about 0.8% of all hits never counted, concentrated on whichever pages happened to be read
        during the stall. A number like that turns “p99 is up” into a statement a product owner can
        weigh.
      </p>
      <p>
        Little’s law also works in reverse, for sizing. If hitcount must handle 10,000 hits a
        second with each taking at most 50 ms, it must be able to hold 10,000 × 0.05 = 500 hits in
        flight. Pools, queues and connection limits smaller than that will reject work before the
        latency target is reached; much larger ones only let a stall build a bigger queue.
      </p>

      <h3>Read the profile that matches the problem</h3>
      <p>
        A CPU profiler interrupts the program many times a second and records the call stack each
        time. The aggregate shows where CPU time went. It is usually drawn as a{' '}
        <strong>flame graph</strong>: each stack is a column of boxes, callers below callees, and
        the width of a box is the share of samples in which that function was on the stack. Read
        widths, not heights. A tall, thin tower is a deep call chain that costs little; a wide,
        flat box is where the time is.
      </p>
      <p>
        hitcount exposes Go’s profiler on an internal port, so a 30-second CPU profile is one
        command: <code>go tool pprof http://hitcount:6060/debug/pprof/profile?seconds=30</code>.
        The flame graph is dominated by <code>encoding/json</code> under{' '}
        <code>(*store).snapshot</code>. That is true and misleading. It tells us what the CPU does
        while the snapshot runs. It does not tell us why hits are slow, because a hit waiting for a
        lock uses no CPU at all and never appears in a CPU profile.
      </p>
      <p>
        Waiting needs an off-CPU view. Go provides a <strong>mutex profile</strong>, which records
        where goroutines waited for locks and which code was holding them, and a block profile for
        other kinds of waiting. Enabled with <code>runtime.SetMutexProfileFraction</code>, the mutex
        profile shows nearly all lock waiting in <code>(*store).hit</code>, attributed to a holder
        in <code>(*store).snapshot</code>. A goroutine dump taken during the stall agrees: about
        1,500 goroutines parked in <code>sync.(*Mutex).Lock</code>, called from{' '}
        <code>hit</code>. Now we open the code, and the release diff explains it:
      </p>
      <pre><code>{`// before: copy under the lock, encode and write after releasing it
s.mu.Lock()
rows := make([]row, 0, len(s.pages))
for _, p := range s.pages {
    rows = append(rows, row{p.Path, p.Views, p.ReadMs, p.Reads})
}
s.mu.Unlock()
return writeSnapshot(rows)

// after (Tuesday's release): stream straight from the map to save memory
s.mu.Lock()
defer s.mu.Unlock()
enc := json.NewEncoder(f)
for _, p := range s.pages {
    enc.Encode(p)
}`}</code></pre>
      <p>
        The change had a good reason. Copying 5 million rows of about 48 bytes allocated around 240
        MB every minute, and on a busy day that copy pushed the container close to its memory
        limit. Streaming directly from the map removed the copy. It also moved the JSON encoding
        and the file writes inside the lock, and those take about a second and a half.
      </p>
      <p>
        Reverting brings back the memory problem, so the fix has to address both. We split the
        store into 64 shards, each a map with its own mutex, choosing the shard by a hash of the
        path. The snapshot locks one shard, copies its roughly 78,000 pages (about 4 MB), unlocks
        it, writes them, and moves on to the next shard. A hit now waits at most for one shard’s
        copy, a few milliseconds, and the snapshot never holds more than 4 MB of copied rows at a
        time.
      </p>
      <p>
        The cost: the snapshot is no longer a picture of a single instant. Shard 1 is copied a few
        seconds after shard 0, so the file mixes slightly different moments, and the saved total no
        longer equals the sum of the saved pages. We decided that was acceptable, because page
        counts are independent of each other, and we now recompute the total from the pages when
        loading rather than saving it. The other cost is code: <code>/top</code> now merges results
        from 64 shards. After the deploy, p99 returned to about 4 ms and the edge errors stopped. We
        kept the before and after graphs in the incident note, because they are the evidence that
        the fix fixed the thing.
      </p>
      <p>
        With the stall gone, a CPU profile from an ordinary minute is worth reading for a different
        reason: it shows what hitcount spends its CPU on when nothing is wrong. The widest boxes
        are not ours. They are the kernel’s network code under the read and write system calls,
        and Go’s HTTP request parsing, with the runtime’s allocator and garbage collector a few
        percent each behind them. Our{' '}
        <code>hit</code> function, the code we wrote, is a sliver a few percent wide, and{' '}
        <code>canonical</code>, which decodes and normalises each path, is wider than{' '}
        <code>hit</code> itself.
      </p>
      <p>
        That width puts a ceiling on any optimisation. If <code>hit</code> accounts for 3% of
        hitcount’s CPU, then making it infinitely fast saves 3%, and no more. This is{' '}
        <strong>Amdahl’s law</strong> applied to a profile: the speed-up from improving one part is
        limited by the share of the time that part takes. Before optimising a function, read its
        width, and work out the best possible result. For hitcount, the best available savings on
        an ordinary day are in fewer system calls per hit (batching hits at the edge) and fewer
        allocations per request, not in the handler.
      </p>

      <h3>Benchmarking without fooling yourself</h3>
      <p>
        Before a fix ships, we usually want a benchmark that shows it helps. Benchmarks are easy to
        get wrong in ways that produce confident, wrong numbers.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Mistake</th><th>Why the number is wrong</th><th>What to do instead</th></tr>
          </thead>
          <tbody>
            <tr><td>One run, one number</td><td>run-to-run noise is often larger than the change</td><td>many runs; compare distributions (Go’s <code>benchstat</code> does this)</td></tr>
            <tr><td>Cold versus warm</td><td>first runs measure caches filling and JITs compiling</td><td>warm up, then measure; state which you report</td></tr>
            <tr><td>Reporting the mean</td><td>a few stalls vanish into a pleasant average</td><td>report p50, p99 and the maximum</td></tr>
            <tr><td>Toy data</td><td>2,000 pages fit in cache; 5 million do not</td><td>benchmark at production size</td></tr>
            <tr><td>Result never used</td><td>the compiler removes work whose result is discarded</td><td>use the result, or Go’s <code>b.Loop</code>, which prevents this</td></tr>
            <tr><td>Load generator waits for replies</td><td>it stops sending during a stall and records too few slow requests</td><td>generate load at a fixed arrival rate</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The last row deserves a worked example, because it would have hidden Wednesday’s problem.
        Our first load test used 50 connections, each sending a request and waiting for the reply
        before sending the next. During a 1.5-second stall, each connection had one request waiting
        and sent nothing else, so the test recorded 50 slow requests. Real traffic does not wait:
        at 1,000 hits a second, about 1,500 hits arrive during the stall, and every one of them is
        slow. The test under-reported slow requests by a factor of thirty, and its p99 looked fine.
        This error is called <strong>coordinated omission</strong>. Tools that send requests at a
        fixed rate, regardless of replies, measure what users would actually experience.
      </p>
      <p>
        One rule outranks all the others: change one thing at a time, keep the numbers, and write
        down the conditions, including data size, concurrency, and warm or cold. A performance
        claim without its conditions cannot be checked by anyone else, including you in a month.
      </p>

      <h3>Making the next regression visible sooner</h3>
      <p>
        Wednesday’s regression was found because someone looked at a p99 graph. It would have been
        found faster, and without luck, if the saturation signals from the USE table had been
        watched all along. After the incident we added three measurements to hitcount’s dashboard,
        each chosen because it would have moved before users were affected.
      </p>
      <p>
        The first is the number of goroutines. By Little’s law it is the arrival rate times the
        time each request spends inside, so with a steady arrival rate it rises the moment requests
        start waiting, for any reason. On a normal minute it sits in the tens; a jump to the
        thousands is a stall, whatever caused it. The second is time spent waiting for the store’s
        locks, from the runtime’s mutex statistics, which separates “slow because busy” from “slow
        because queued”. The third is a latency histogram rather than a set of precomputed
        percentiles, so that any percentile over any window can be read later, including ones
        nobody thought to ask for in advance. The maths chapter explains why that last choice
        matters when several servers report.
      </p>
      <p>
        We also run a continuous profiler that takes a short CPU and mutex profile from each
        instance every few minutes and keeps them for a month. Its overhead is small, around a
        percent, and it means the next investigation can compare “before the release” with “after
        the release” profiles directly, instead of reconstructing the past from graphs.
      </p>

      <h3>When to stop measuring</h3>
      <p>
        Measurement needs a target, or it never ends. hitcount’s is written down: p99 for{' '}
        <code>/hit</code> under 50 ms at the platform’s peak load, measured at the edge. While that
        holds, we do not profile for fun or shave microseconds off the handler, because no reader or
        blog owner would notice. Profiling effort goes where a target is missed or an estimate and
        a measurement disagree. When they disagree, one of them is teaching you something, and
        usually it is the estimate that needs correcting.
      </p>
      <p>
        Two habits make the next investigation faster. Keep profiling endpoints enabled in
        production, on an internal port, because the problem you need to see is the one happening
        now. And keep a small set of benchmarks for the hottest paths in the repository, run on
        every change, with the noise caveats from the table in mind.
      </p>
      <Callout>
        A CPU profile shows where the program computes; a slow request that is waiting appears
        only in a mutex, block or off-CPU profile. Match the profile to the shape of the problem
        before reading it.
      </Callout>
      <p>
        Wednesday’s CPU profile had one more detail we skipped: a few percent of samples in{' '}
        <code>runtime.mallocgc</code> and <code>runtime.gcBgMarkWorker</code>, and a memory graph
        with a sawtooth reaching 1.9 GB of a 2 GB limit. That is the Go runtime’s own work. The
        next chapter, <em>Languages and runtimes</em>, looks at what a runtime does on your behalf,
        what it charges, and when choosing a different language would change the answer.
      </p>
      <Notes
        items={[
          'Look at p50, p99 and the maximum separately; the mean hides a small group of very slow requests.',
          'The shape of a regression narrows the cause: a fixed share of requests delayed by a fixed amount points to a periodic stall.',
          'For each resource, including locks and pools, check utilisation, saturation and errors; saturation is where waiting hides.',
          'A CPU profile cannot show waiting; use a mutex, block or off-CPU profile when requests are slow but the CPU is not busy.',
          'A load generator that waits for replies under-reports stalls; drive load at a fixed arrival rate.',
          'Set a written target, and stop optimising once it is met.',
        ]}
      />
    </>
  ),

  /* ── 09 · Languages and runtimes ────────────────────────────── */
  languages: (
    <>
      <p>
        This chapter lets you predict what a language’s runtime adds to a service’s cost, in CPU,
        memory and behaviour under load, and judge when changing a runtime setting, or the language
        itself, would change the answer. Your language is not a transparent pipe to the machine. It
        brings a compiler that rewrites your code, often a garbage collector that manages memory
        for you, and sometimes a JIT, and their costs appear on your profiles under your function
        names.
      </p>
      <p>
        Two things prompt the question for hitcount. The platform version’s memory graph is a
        sawtooth that climbs to 1.9 GB of its 2 GB limit before dropping, and a few percent of every
        CPU profile is the Go runtime’s own functions. And someone on the platform team has asked,
        reasonably, whether the service would be faster in Rust or simpler in Python.
      </p>

      <h3>What the compiler did with hit()</h3>
      <p>
        A compiler’s front end reads source text into a tree and checks it: names resolve, types
        agree, <code>{'p.Views += "1"'}</code> is rejected. Its back end lowers the tree to
        instructions and optimises them. Go’s compiler inlines small functions into their callers,
        removes array bounds checks it can prove unnecessary, deletes code whose result is never
        used, and runs escape analysis to decide what can live on the stack. You can ask it to
        explain itself:
      </p>
      <pre><code>{`$ go build -gcflags=-m ./...
./store.go:41:6: can inline canonical
./store.go:58:12: &Page{...} escapes to heap
./store.go:72:15: make([]row, 0, len(s.pages)) escapes to heap
./hit.go:19:23: inlining call to canonical`}</code></pre>
      <p>
        Two practical consequences follow. Hand-optimising small things, such as caching a field in
        a local variable or writing a manual loop instead of a helper, usually produces the same
        machine code the compiler would have produced anyway, and makes the source harder to read.
        And because the compiler deletes work whose result is unused, a benchmark that computes
        something and throws it away may be measuring nothing, which is the “result never used” row
        in the previous chapter’s table.
      </p>

      <h3>Garbage collection, priced</h3>
      <p>
        Go, Java, C#, JavaScript and Python all reclaim memory automatically. Go uses a{' '}
        <strong>tracing garbage collector</strong>: starting from roots (global variables and every
        goroutine’s stack), it follows every pointer to mark each reachable object, then frees
        whatever was not marked. Go’s collector does most of this concurrently with the program, so
        its stop-the-world pauses are usually well under a millisecond. The cost has not
        disappeared; it has moved. Marking uses CPU, about a quarter of the available cores while a
        cycle runs, plus extra work charged to goroutines that allocate quickly during a cycle. And
        the collector needs memory headroom, because the program keeps allocating while marking
        happens.
      </p>
      <p>
        Two numbers decide how much a program pays. The cost of one cycle grows with the amount of
        live memory and, above all, with the number of pointers the collector must follow. The
        number of cycles grows with how fast the program allocates relative to the headroom it is
        allowed. Go’s main setting, <code>GOGC</code>, sets the headroom: at the default of 100, a
        new cycle starts when the heap has grown to twice the live heap measured after the last
        cycle.
      </p>
      <p>
        That rule explains the sawtooth. hitcount’s live heap is about 1 GB, mostly page data. With{' '}
        <code>GOGC=100</code>, the collector lets the heap grow to about 2 GB before starting a
        cycle, then marks, frees the garbage, and the heap drops back towards 1 GB. The peak of the
        sawtooth is the live heap times two.
      </p>
      <Predict q={<>The platform adds blogs, and hitcount’s live heap grows by 10%, from 1.0 GB to 1.1 GB. The container limit stays at 2 GB and nothing else changes. What happens?</>}>
        <p>
          The collector’s target becomes 2.2 GB. The heap grows towards it, passes 2 GB before the
          collector thinks a cycle is due, and the kernel kills the process with exit code 137, as
          in the operating system chapter. Go never reports an out-of-memory error, because Go
          never ran out of memory by its own accounting. It simply was not told about the
          container’s limit.
        </p>
        <p>
          The trap is that nothing was close to failing in the usual sense. Live data was 55% of
          the limit. It was the runtime’s headroom policy, not the data, that crossed the line.
        </p>
      </Predict>
      <p>
        Since Go 1.19 the runtime accepts a soft memory limit, <code>GOMEMLIMIT</code>. Set to
        1.8 GiB, it tells the collector to start cycles earlier whenever the heap approaches that
        figure, whatever <code>GOGC</code> would have said. hitcount now collects more often as it
        nears the limit and stays under it. The cost appears as the live heap approaches the
        limit: cycles run back to back, spending more and more CPU to reclaim less and less. Go
        caps the collector’s share of CPU in that situation, at roughly half, so the service
        degrades instead of spending all its time collecting, but by then it is effectively out of
        memory. So we also alert when the live heap passes 70% of the limit, which gives someone
        time to act.
      </p>
      <p>
        The deeper fix is to give the collector less to do. Each page currently involves several
        pointers: the map key’s string, the <code>*Page</code> value, and the strings inside{' '}
        <code>Page</code>. That is about 20 million pointers to follow on every cycle. The flatter
        layout from the machine chapter helps here too:
      </p>
      <pre><code>{`type stat struct { // no pointers inside: the collector never scans these
    Views, ReadMs, Reads int64
}

type store struct {
    index  map[string]uint32 // canonical path -> position in stats
    stats  []stat
    titles []string
}`}</code></pre>
      <p>
        Memory the collector knows contains no pointers is never scanned, so the 5 million{' '}
        <code>stat</code> records cost it nothing to mark. Pointers fall to roughly two per page,
        the key and the title, halving the marking work, and the scan for <code>/top</code> gets the
        cache-friendly layout as a side effect. The cost is code: an index to keep consistent and
        slots to reuse when pages are removed. We did it for the platform version only. The single
        blog’s two thousand pages cost the collector nothing worth recovering.
      </p>
      <p>
        Other runtimes strike the same bargain in different ways. Java’s collectors are
        generational, collecting recently allocated objects often and cheaply because most objects
        die young. CPython frees most objects immediately by counting references to them, with a
        separate collector for cycles. Rust has no collector at all: the compiler tracks which
        variable owns each value and inserts the free when the owner goes out of scope. The
        invariant across all of them is that something must work out when memory is no longer
        needed, and that work is paid for in CPU, memory headroom, or the programmer’s time.
      </p>

      <h3>The same service in four runtimes</h3>
      <p>
        Back to the platform team’s question. The useful comparison is not a benchmark of the
        increment. It is what each runtime would change about hitcount’s specific problems.
      </p>
      <Tbl>
        <table>
          <thead>
            <tr><th>Runtime</th><th>Concurrency</th><th>The counter race</th><th>Memory per page</th><th>What it charges</th></tr>
          </thead>
          <tbody>
            <tr><td>Go</td><td>goroutines on all cores</td><td>silent for integers, fatal for maps; race detector finds both</td><td>~200 bytes</td><td>GC CPU and headroom</td></tr>
            <tr><td>Python (CPython)</td><td>one thread runs bytecode at a time (GIL); free-threaded builds are newer</td><td>rarer, not impossible; multiple processes need a shared store</td><td>several times Go’s, as every value is an object</td><td>interpreter overhead per operation</td></tr>
            <tr><td>Node.js</td><td>one event loop thread per process</td><td>impossible between awaits; returns across awaits</td><td>somewhat more than Go’s</td><td>a blocked loop stops everything; JIT warm-up</td></tr>
            <tr><td>Rust</td><td>threads or async tasks on all cores</td><td>a compile error: shared mutable data must be in a Mutex or atomic</td><td>close to the raw data</td><td>development time; no GC cost at all</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Python’s row deserves a closer look, because it changes the architecture, not just the
        speed. CPython’s global interpreter lock lets only one thread execute Python bytecode at a
        time, so a Python hitcount uses one core no matter how many threads it runs. To use eight
        cores, it would run eight processes, and eight processes do not share a map. The counters
        would move to Redis or a database, every hit would become a network round trip, and the
        lost update from the concurrency chapter would return in its Node-and-Redis form. The
        language choice would have decided the system’s shape.
      </p>
      <p>
        Rust’s row deserves a closer look too, because it is the strongest argument for switching.
        Safe Rust refuses to compile a program that shares a mutable counter between threads
        without a lock or an atomic, so the first bug of the concurrency chapter could not have
        shipped. And with no collector, there is no headroom to budget and no sawtooth.
      </p>
      <p>
        Now the decision, with costs on both sides. Rewriting in Rust would remove a memory cost we
        can buy for a few dollars a month (another gigabyte of RAM) and a class of bug we already
        catch with the race detector. It would cost weeks of work, a team learning a stricter
        language, and a new set of bugs in rewritten code that has worked for a year. hitcount’s
        CPU use at peak is half a core; its time goes to the network and the disk, which no
        language changes. We keep Go, set <code>GOMEMLIMIT</code>, and flatten the store. If the
        service were a high-frequency trading engine where a millisecond pause costs money, or
        if the GC’s share of CPU stayed above a quarter after tuning, the same reasoning could come
        out the other way.
      </p>

      <h3>When a JIT’s warm-up meets an autoscaler</h3>
      <p>
        The Node.js version of hitcount, which another team runs for a sister site, shows the
        runtime cost a JIT adds, and it is not the one people expect. Steady-state speed was fine.
        The trouble came from the first minute of each new instance’s life.
      </p>
      <p>
        That deployment scales automatically: when average CPU across instances passes 70%, the
        platform starts more. During a spike, here is the sequence. CPU passes 70% and four new
        instances start. Each one begins by interpreting hitcount’s code and the HTTP library’s
        code, which is several times slower per request than the compiled form, and spends extra
        CPU compiling the hot functions it discovers. The load balancer sends each new instance its
        full share of traffic immediately. So the new instances run at high CPU while they warm up,
        average CPU across the fleet stays high, and the autoscaler starts four more, which are
        also cold. The fleet overshoots, then shrinks once everything is warm, and the cycle can
        repeat at the next spike.
      </p>
      <p>
        A second, quieter cost came from types. hitcount’s handler received <code>ms</code> as a
        string from query strings and as a number from a newer JSON endpoint. V8 compiles a
        function specialised for the types it has seen; when a value of a new type arrives, it can
        throw that compiled code away (a <strong>deoptimisation</strong>) and compile a more
        general, slower version later. A handler that sees two types for the same value runs
        slower than one that always sees one. The fix there was to convert at the boundary, so
        everything inside the service sees a number.
      </p>
      <p>
        The fix for the warm-up was to keep new instances out of the load balancer until they had
        handled a few thousand synthetic requests, and to scale on request rate rather than CPU.
        The cost is that new capacity arrives later, perhaps half a minute later, so the scaling
        threshold had to come down to start new instances earlier. A Go service starts at full
        speed and has neither problem; a Java service has both in larger measure. This is one of
        the places where runtime choice genuinely changes how a system behaves.
      </p>

      <h3>Types, and the price of crossing boundaries</h3>
      <p>
        A type system catches some of the bugs in this pathway and not others, and it helps to
        know which. Go would not let the first draft add an <code>int64</code> to an{' '}
        <code>int32</code> without an explicit conversion. But the conversion,{' '}
        <code>int32(total)</code>, compiles happily and truncates silently. The type system made
        the narrowing visible in the source; it did not make it safe. And types stop at the edge
        of the process. Once a number is serialised as JSON, the receiving runtime applies its own
        types, which is how the 64-bit page IDs broke in JavaScript.
      </p>
      <p>
        Calling between runtimes has a cost per crossing. A Python program calling into C, or a Go
        program calling C through cgo, pays to convert arguments and to coordinate the two runtimes
        on every call, tens of nanoseconds at the least and often much more. A loop that crosses
        once per item spends its time crossing. The pattern that works is the one this pathway keeps
        finding: hand the whole array to NumPy rather than calling it per number, make one system
        call with a large buffer rather than many with small ones, send one request with a hundred
        hits rather than a hundred requests. Cross boundaries rarely and carry a lot each time.
      </p>
      <p>
        Static versus dynamic typing is a separate dial, and an engineering one. Static types are
        checked documentation and a safety net for refactoring, and they pay off more as a codebase
        and its team grow. Dynamic typing buys speed of change when the code is small. That is why
        many successful dynamic codebases add types gradually, through TypeScript or Python’s type
        hints, at the point where the cost of maintenance overtakes the cost of declaring types.
      </p>

      <h3>Build a small interpreter once</h3>
      <p>
        The exercise in this chapter that repays its time best is to build a tiny interpreter. Give
        hitcount a query language, something like <code>{'top 10 where path starts "/posts/" by views'}</code>, and implement it: a lexer that turns text into tokens, a parser that turns
        tokens into a tree, and an evaluator that walks the tree over the page data. A weekend is
        enough, and <em>Crafting Interpreters</em> covers the full journey if you want more. Most
        of what seems mysterious about languages, such as how scope works, why an error is reported
        where it is, what a stack trace is really listing, and what a REPL does, becomes ordinary
        once you have written each piece yourself.
      </p>

      <h3>When the runtime choice is worth revisiting</h3>
      <p>
        Most of the time the runtime is the least important thing to change. Team skill, libraries
        and operational experience usually outweigh the differences in the table above, and a
        rewrite throws away years of fixed bugs. Revisit the choice when a profile shows the
        runtime’s own costs dominating after its settings have been tuned: collection taking a large
        share of CPU, pause times that break a latency target measured in microseconds, start-up
        time that matters because instances start on every request, or memory per instance
        multiplied across thousands of replicas. Short of those, change the settings and the data
        layout first.
      </p>
      <p>
        Every technique in this pathway so far has been arithmetic on hitcount’s own numbers. The
        last chapter, <em>The mathematics you will actually use</em>, makes that arithmetic
        explicit: what an average hides, how to combine percentiles, how much error sampling
        introduces, and the vectors, gradients and probabilities the AI Engineering pathway assumes.
      </p>
      <Notes
        items={[
          'A compiler inlines, removes dead code and decides stack versus heap; ask it to show its decisions before hand-optimising.',
          'A tracing collector’s cost grows with live pointers and with allocation rate, and it needs memory headroom to work.',
          'With GOGC=100 a Go heap peaks near twice its live size; set GOMEMLIMIT below the container limit and alert well before it.',
          'Memory with no pointers in it is never scanned, so flat records of plain values are cheap for the collector.',
          'A runtime can decide a system’s architecture, as CPython’s single-threaded execution pushes shared counters into an external store.',
          'Cross runtime and process boundaries rarely and carry a lot of work each time.',
        ]}
      />
    </>
  ),

  /* ── 10 · The mathematics you will actually use ─────────────── */
  maths: (
    <>
      <p>
        This chapter lets you compute, and question, the numbers a service like hitcount produces,
        and read the notation of the AI Engineering pathway without stopping. None of it needs a
        degree. All of it repays working through small examples by hand, which is how this chapter
        presents it.
      </p>
      <p>
        hitcount already produces numbers people act on. The sidebar shows an average reading time.
        The dashboard shows a p99 latency. The platform is considering counting only one hit in ten
        to save resources, and wants a “related posts” feature that suggests what to read next.
        Each of those is a piece of mathematics applied to hitcount’s own data, and each has a
        common way of being wrong.
      </p>

      <h3>What an average hides</h3>
      <p>
        Take ten posts from the blog with these view counts: 9,000, 600, 120, 80, 60, 50, 40, 30,
        15 and 5. They add up to 10,000, so the <strong>mean</strong> is 1,000 views per post. Nine
        of the ten posts have fewer than 1,000 views, and eight have fewer than 150. The{' '}
        <strong>median</strong>, the middle value once they are sorted, is 55 (halfway between 50
        and 60). The mean describes the total divided evenly; the median describes a typical post.
        Page views on almost any site look like this: a few pages take most of the traffic and a
        long tail shares the rest. In data shaped like that, the mean is pulled far from the
        typical value by the few largest ones.
      </p>
      <p>
        Reading time has the same problem, from a different cause. Nine reports for one post, in
        seconds: 40, 45, 50, 55, 60, 65, 70, 80 and 28,800. The last is a reader who left the tab
        open for eight hours. The mean is 29,265 ÷ 9 ≈ 3,252 seconds, about 54 minutes, for a post
        that most people read in a minute. The median is 60 seconds. Capping each report at 30
        minutes before averaging helps, but the mean is still about 4 minutes. For the sidebar’s
        “typical reading time”, the median is the right statistic.
      </p>
      <p>
        The mean still has its uses, and it is not wrong, only answering a different question.
        For capacity planning, total = mean × count, so the mean is exactly what you want when
        estimating total bytes stored or total CPU used. The measure of spread around it is the{' '}
        <strong>standard deviation</strong>: the square root of the average squared distance from
        the mean. In skewed data it is dominated by the extremes too, which is a warning in itself.
      </p>

      <h3>Percentiles, and why you cannot average them</h3>
      <p>
        The performance chapter used percentiles; here is how they behave when combined. The
        platform runs hitcount on two machines for a while. Server A handled 9,900 requests last
        minute with a p99 of 5 ms. Server B handled 100 requests with a p99 of 500 ms, because it
        was stuck in the snapshot stall.
      </p>
      <Predict q={<>The dashboard shows the fleet’s p99 as the average of the two servers’ p99s, 252.5 ms. Is that the p99 of all 10,000 requests? If not, what is?</>}>
        <p>
          No. 252.5 ms is not the latency of any real request, and it is not a percentile of
          anything. The question cannot be answered from two percentiles alone, because a
          percentile throws away the information needed to combine it.
        </p>
        <p>
          Suppose we had kept counts instead. Server A: 9,850 requests at 5 ms or less, and 50
          between 5 and 10 ms. Server B: all 100 requests between 250 and 500 ms. Combined, the
          p99 is the 9,900th fastest of 10,000 requests. The first 9,850 are A’s fast ones, and
          ranks 9,851 to 9,900 are A’s 5 to 10 ms requests. So the fleet’s p99 is between 5 and
          10 ms. Server B’s requests are exactly the slowest 1%, and they show up at p99.5 and
          above.
        </p>
      </Predict>
      <p>
        The practical answer is to record <strong>histograms</strong>, counts of requests in fixed
        latency buckets such as up to 1 ms, 2, 5, 10, 25, 50 ms and so on, rather than percentiles.
        Histograms from different servers or different minutes combine by adding the counts in each
        bucket, and any percentile can then be read from the combined counts. The cost is
        precision: a percentile read from a histogram is only known to within its bucket, so the
        buckets need to be finest around the values you care about, such as the latency target.
        Monitoring systems that store histograms do this for you; ones that store pre-computed
        percentiles cannot combine them correctly at all.
      </p>

      <h3>Sampling: how much error one in ten introduces</h3>
      <p>
        To save work at peak load, the platform proposes counting a random one in ten hits and
        multiplying each count by ten. Is the result right?
      </p>
      <p>
        On average, yes. If each hit is kept with probability 0.1, the expected number kept from{' '}
        n hits is 0.1n, and multiplying by ten gives n. An estimate whose average equals the true
        value is called unbiased. The question that matters is how far a single estimate strays. The
        number of kept hits follows a binomial distribution, whose variance is n × p × (1 − p). For
        a post with 1,000 true views: the expected kept count is 100, the variance is 1,000 × 0.1 ×
        0.9 = 90, and the standard deviation is about 9.5. Multiplied by ten, the estimate is 1,000
        give or take about 95, roughly 10%.
      </p>
      <p>
        For a post with 50 views, the expected kept count is 5, the standard deviation about 2.1,
        and the estimate is 50 give or take about 21, more than 40%. A rule of thumb follows: the
        relative error is about 1 ÷ √k, where k is the number of samples actually kept. A hundred
        kept samples give about 10%; ten thousand give about 1%. So sampling is fine for the
        trending list, whose pages have tens of thousands of views, and poor for the long tail,
        where a blog owner checking their newest post would see numbers that jump around. The
        decision: sample only on the platform-wide trending computation, and keep exact counts per
        page.
      </p>

      <h3>Collisions: the birthday bound</h3>
      <p>
        Twice in this pathway hitcount replaced a string with a hash: 64-bit page IDs for the
        dashboard, and hashed IP-and-path pairs in the bot filter. Someone suggests saving memory
        with 32-bit hashes. How likely is it that two different keys get the same hash?
      </p>
      <Predict q={<>With 32-bit hashes there are about 4.3 billion possible values. The platform has 5 million pages. Roughly how many pairs of pages would share a hash?</>}>
        <p>
          There are n(n − 1)/2 pairs of pages, about n²/2, and each pair collides with probability
          1/N, where N is the number of possible hash values. So the expected number of colliding
          pairs is about n² ÷ 2N. With n = 5 million and N = 2³² ≈ 4.3 × 10⁹, that is 2.5 × 10¹³
          ÷ 8.6 × 10⁹ ≈ 2,900. Nearly three thousand pairs of pages would be merged into one
          counter each.
        </p>
        <p>
          For the original blog, n = 2,000: 4 × 10⁶ ÷ 8.6 × 10⁹ ≈ 0.0005, about a 1 in 2,000 chance
          of any collision at all. With 64-bit hashes and 5 million pages: 2.5 × 10¹³ ÷ 3.7 × 10¹⁹ ≈
          7 × 10⁻⁷. The size that is safe depends on n squared, not n, which is why it surprises
          people. This is the same arithmetic as the birthday problem, where 23 people are enough
          for an even chance that two share a birthday.
        </p>
      </Predict>

      <h3>Vectors: deciding which posts are related</h3>
      <p>
        For “related posts”, each post is represented as a <strong>vector</strong>, a list of
        numbers. In practice a model turns each post’s text into a vector of a few hundred numbers,
        called an embedding, arranged during the model’s training so that posts about similar things
        point in similar directions. To see the arithmetic, use three dimensions and pretend they
        mean something readable: how much a post is about Go, about concurrency, and about food.
      </p>
      <p>
        Post A, on Go’s mutexes, is [0.9, 0.8, 0.1]. Post B, on goroutine leaks, is [0.8, 0.9, 0.2].
        Post C, on cafés in Lisbon, is [0.1, 0.1, 0.9]. The <strong>dot product</strong> multiplies
        matching entries and adds them up. A · B = 0.72 + 0.72 + 0.02 = 1.46. The length of a vector
        is the square root of its dot product with itself: |A| = √1.46 ≈ 1.208, and |B| = √1.49 ≈
        1.221. <strong>Cosine similarity</strong> divides the dot product by both lengths, which
        removes the effect of size and leaves only direction: 1.46 ÷ (1.208 × 1.221) ≈ 0.99. For A
        and C, the dot product is 0.09 + 0.08 + 0.09 = 0.26, |C| = √0.83 ≈ 0.911, and the cosine is
        0.26 ÷ (1.208 × 0.911) ≈ 0.24. Post B is related to A; post C is not. Real embedding
        dimensions do not have readable meanings, but the arithmetic is identical.
      </p>
      <p>
        To score one post against every other, stack all the post vectors as the rows of a{' '}
        <strong>matrix</strong> E, with n rows and d columns, and multiply it by the query vector
        q. Each entry of the result is one row’s dot product with q. The shapes follow a rule worth
        memorising: an (n × d) matrix times a (d × 1) vector gives an (n × 1) result; the inner
        dimensions must match, and they are the ones summed away. For one blog, n = 2,000 posts and
        d = 768: 1.5 million multiply-adds and 6 MB of data, well under a millisecond.
      </p>
      <p>
        For the platform, n = 5 million: 3.8 billion multiply-adds per query, and E is 5 million ×
        768 × 4 bytes ≈ 15 GB, more than our machine’s entire memory. Even with enough RAM, streaming
        15 GB at memory bandwidth takes around a second per query. The machine chapter’s cost model
        applies to linear algebra like everything else. This is why systems for searching vectors at
        scale use approximate indexes that look at a small fraction of the rows, a topic in the AI
        Engineering pathway, and why ML hardware processes many queries at once: multiplying E by a
        matrix of many query vectors reuses each row of E for all of them while it is in cache. A
        layer of a neural network is the same operation, a matrix of learned weights multiplied by
        a batch of input vectors, followed by a simple non-linear function.
      </p>

      <h3>Gradients: fitting a trend by walking downhill</h3>
      <p>
        The platform wants to predict tomorrow’s views for a rising post. The simplest model is a
        straight line: predicted views = w × day + b. Training means choosing w and b so the
        predictions match past data. Take three days of data, in hundreds of views: day 1 had 2,
        day 2 had 4, day 3 had 6.
      </p>
      <p>
        First, a measure of wrongness, the <strong>loss</strong>: the mean of the squared errors.
        Start with w = 0 and b = 0. Every prediction is 0, the errors (prediction minus actual) are
        −2, −4 and −6, and the loss is (4 + 16 + 36) ÷ 3 ≈ 18.7. The <strong>gradient</strong> says
        how the loss changes as each parameter changes. For this loss, the derivative with respect
        to w is (2/n) × Σ error × day = (2/3) × (−2 − 8 − 18) ≈ −18.7, and with respect to b it is
        (2/n) × Σ error = (2/3) × (−12) = −8. Both are negative, meaning that increasing w and b
        would reduce the loss.
      </p>
      <p>
        <strong>Gradient descent</strong> takes a step in the downhill direction, scaled by a{' '}
        <strong>learning rate</strong>. With a learning rate of 0.05: w becomes 0 + 0.05 × 18.7 ≈
        0.93, and b becomes 0 + 0.05 × 8 = 0.4. The new predictions are 1.33, 2.27 and 3.2, the
        errors are −0.67, −1.73 and −2.8, and the loss is about 3.8, down from 18.7. Repeating the
        step converges on w = 2, b = 0, which fits the data exactly.
      </p>
      <p>
        Now change one variable: a learning rate of 0.5. The first step sets w ≈ 9.3 and b = 4, the
        predictions become 13.3, 22.7 and 32, and the loss jumps to about 384. The step was so large
        it went past the bottom of the valley and up the other side, and the next step will
        overshoot further. Most training problems you will read about, a loss that explodes or one
        that stops improving, come down to step size.
      </p>
      <p>
        In a neural network the loss depends on a parameter through many layers. The{' '}
        <strong>chain rule</strong> of calculus says that the derivative through a chain of
        functions is the product of each link’s derivative. Backpropagation is the chain rule
        applied systematically from the loss backwards through every layer, so that one pass gives
        the gradient for every parameter. You need the picture and the chain rule; nobody will ask
        you to integrate anything.
      </p>

      <h3>Probabilities: choosing which related post to show</h3>
      <p>
        The related-posts feature produces a score for each candidate post. Suppose three
        candidates score 2, 1 and 0. Always showing the top one means the other two never get a
        chance to prove themselves, so we want to choose randomly, favouring higher scores.{' '}
        <strong>Softmax</strong> turns scores into probabilities: raise e to each score and divide
        by the total. e² ≈ 7.39, e¹ ≈ 2.72, e⁰ = 1, total 11.11, so the probabilities are about
        0.67, 0.24 and 0.09.
      </p>
      <p>
        <strong>Temperature</strong> divides the scores before the softmax. At a temperature of 0.5
        the scores become 4, 2 and 0, and the probabilities about 0.87, 0.12 and 0.02: much more
        concentrated on the favourite. At a temperature of 2 they become 1, 0.5 and 0, giving about
        0.51, 0.31 and 0.19: much more even. A language model does exactly this at every step, over
        a vocabulary of tens of thousands of tokens, which is why the same prompt can produce
        different answers and why the temperature setting changes how predictable they are.
      </p>
      <p>
        Training such a model means making the observed data as probable as possible. If the data
        is a thousand observed choices, each given probability 0.01 by the model, the probability of
        all of them is 0.01 multiplied by itself a thousand times, which is 10⁻²⁰⁰⁰. The smallest
        positive <code>float64</code> is around 10⁻³⁰⁸, so that product underflows to exactly zero,
        a representation edge of the kind the second chapter described. Taking logarithms turns the
        product into a sum, 1,000 × ln(0.01) ≈ −4,605, which is easy to store. That is why training
        objectives are written as log-likelihoods.
      </p>

      <h3>How much mathematics is enough</h3>
      <Tbl>
        <table>
          <thead>
            <tr><th>Question about hitcount</th><th>Tool</th><th>What getting it wrong looks like</th></tr>
          </thead>
          <tbody>
            <tr><td>What is a typical post’s reading time?</td><td>median, not mean</td><td>“54 minutes” for a one-minute read</td></tr>
            <tr><td>What is the fleet’s p99?</td><td>merged histograms</td><td>an average of percentiles that matches no request</td></tr>
            <tr><td>Can we count one hit in ten?</td><td>binomial error, about 1/√k</td><td>small pages with ±40% counts</td></tr>
            <tr><td>Is a 32-bit hash big enough?</td><td>birthday bound, n²/2N</td><td>thousands of merged pages</td></tr>
            <tr><td>Which posts are related?</td><td>cosine similarity, matrix shapes</td><td>a 15 GB scan per query</td></tr>
            <tr><td>Where are views heading?</td><td>loss, gradient, learning rate</td><td>a model whose loss explodes</td></tr>
            <tr><td>Which post do we suggest?</td><td>softmax, temperature, log-likelihood</td><td>always the same suggestion, or a product that underflows</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        That table is the level to aim for: enough to compute each answer by hand on a small
        example. Resist a detour into proofs before something concrete needs them. When an AI
        Engineering chapter uses an idea you cannot work through on three numbers, come back to the
        linked book for that idea, and only that one. The 3Blue1Brown series on linear algebra
        builds the geometric picture behind vectors and matrices in an evening, and is a good place
        to start if this chapter’s section on vectors felt quick.
      </p>
      <p>
        That completes the foundations. hitcount has gone from source to process, from bytes to
        meaning, through caches, the kernel, concurrent requests, the network, an estimate, a
        profile, its runtime and its own statistics. One assumption has held throughout: hitcount
        runs on one machine, and that machine either works or does not. The next pathway,{' '}
        <em>Distributed Systems</em>, removes it. Put hitcount on three machines so that one can
        fail, and a new question appears that nothing in this pathway can answer: when the machines
        disagree about a page’s count, which one is right?
      </p>
      <Notes
        items={[
          'In skewed data such as page views or reading times, report the median for “typical” and keep the mean for totals.',
          'Percentiles cannot be averaged; store histograms and add their bucket counts.',
          'Sampling one in ten is unbiased, with relative error of about 1 ÷ √k for k kept samples.',
          'Hash collisions grow with the square of the number of keys: expect about n² ÷ 2N colliding pairs.',
          'Cosine similarity is a dot product divided by two lengths, and scoring many items at once is a matrix–vector product whose cost follows the memory model.',
          'Gradient descent steps against the gradient, scaled by a learning rate that is the usual cause of divergence.',
        ]}
      />
    </>
  ),
}
