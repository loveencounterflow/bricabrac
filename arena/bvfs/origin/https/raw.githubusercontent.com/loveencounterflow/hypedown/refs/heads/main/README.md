

## HypeDown: A MarkDown-like Text Formatting Language


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Design Goals](#design-goals)
- [HypeDown: A MarkDown-like Text Formatting Language](#hypedown-a-markdown-like-text-formatting-language)
- [Notes](#notes)
  - [Update: Self-Closing Tags](#update-self-closing-tags)
  - [Including and Inserting](#including-and-inserting)
  - [Code Spans and Code Blocks](#code-spans-and-code-blocks)
  - [HTMLish Tags](#htmlish-tags)
- [Links](#links)
- [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Design Goals

<!--

### thx to https://github.com/jgm/djot#rationale ###

1. It should be possible to parse djot markup in linear time,
    with no backtracking.

2. Parsing of inline elements should be "local" and not depend
    on what references are defined later. This is not the case
    in commonmark:  `[foo][bar]` might be "[foo]" followed by
    a link with text "bar", or "[foo][bar]", or a link with
    text "foo", or a link with text "foo" followed by
    "[bar]", depending on whether the references `[foo]` and
    `[bar]` are defined elsewhere (perhaps later) in the
    document. This non-locality makes accurate syntax highlighting
    nearly impossible.

3. Rules for emphasis should be simpler. The fact that doubled
    characters are used for strong emphasis in commonmark leads to
    many potential ambiguities, which are resolved by a daunting
    list of 17 rules. It is hard to form a good mental model
    of these rules. Most of the time they interpret things the
    way a human would most naturally interpret them---but not always.

4. Expressive blind spots should be avoided. In commonmark,
    you're out of luck if you want to produce the HTML
    `a<em>?</em>b`, because the flanking rules classify
    the first asterisk in `a*?*b` as right-flanking. There is a
    way around this, but it's ugly (using a numerical entity instead
    of `a`). In djot there should not be expressive blind spots of
    this kind.

5. Rules for what content belongs to a list item should be simple.
    In commonmark, content under a list item must be indented as far
    as the first non-space content after the list marker (or five
    spaces after the marker, in case the list item begins with indented
    code). Many people get confused when their indented content is
    not indented far enough and does not get included in the list item.

6. Parsers should not be forced to recognize unicode character classes,
    HTML tags, or entities, or perform unicode case folding.
    That adds a lot of complexity.

7. The syntax should be friendly to hard-wrapping: hard-wrapping
    a paragraph should not lead to different interpretations, e.g.
    when a number followed by a period ends up at the beginning of
    a line. (I anticipate that many will ask, why hard-wrap at
    all?  Answer:  so that your document is readable just as it
    is, without conversion to HTML and without special editor
    modes that soft-wrap long lines. Remember that source readability
    was one of the prime goals of Markdown and Commonmark.)

8. The syntax should compose uniformly, in the following sense:
    if a sequence of lines has a certain meaning outside a list
    item or block quote, it should have the same meaning inside it.
    This principle is [articulated in the commonmark
    spec](https://spec.commonmark.org/0.30/#principle-of-uniformity),
    but the spec doesn't completely abide by it (see
    commonmark/commonmark-spec#634).

9. It should be possible to attach arbitrary attributes to any
    element.

10. There should be generic containers for text, inline content,
    and block-level content, to which arbitrary attributes can be applied.
    This allows for extensibility using AST transformations.

11. The syntax should be kept as simple as possible, consistent with
    these goals. Thus, for example, we don't need two different
    styles of headings or code blocks.

These goals motivated the following decisions:


- Block-level elements can't interrupt paragraphs (or headings),
  because of goal 7. So in djot the following is a single paragraph, not
  (as commonmark sees it) a paragraph followed by an ordered list
  followed by a block quote followed by a section heading:

  ```
  My favorite number is probably the number
  1. It's the smallest natural number that is
  > 0. With pencils, though, I prefer a
  # 2.
  ```

  Commonmark does make some concessions to goal 7, by forbidding
  lists beginning with markers other than `1.` to interrupt paragraphs.
  But this is a compromise and a sacrifice of regularity and
  predictability in the syntax. Better just to have a general rule.

- An implication of the last decision is that, although "tight"
  lists are still possible (without blank lines between items),
  a *sublist* must always be preceded by a blank line. Thus,
  instead of

  ```
  - Fruits
    - apple
    - orange
  ```

  you must write

  ```
  - Fruits

    - apple
    - orange
  ```

  (This blank line doesn't count against "tightness.")
  reStructuredText makes the same design decision.

- Also to promote goal 7, we allow headings to "lazily"
  span multiple lines:

  ```
  ## My excessively long section heading is too
  long to fit on one line.
  ```

  While we're at it, we'll simplify by removing setext-style
  (underlined) headings. We don't really need two heading
  syntaxes (goal 11).

- To meet goal 5, we have a very simple rule: anything that is
  indented beyond the start of the list marker belongs in
  the list item.

  ```
  1. list item

    > block quote inside item 1

  2. second item
  ```

  In commonmark, this would be parsed as two separate lists with
  a block quote between them, because the block quote is not
  indented far enough. What kept us from using this simple rule
  in commonmark was indented code blocks. If list items are
  going to contain an indented code block, we need to know at
  what column to start counting the indentation, so we fixed on
  the column that makes the list look best (the first column of
  non-space content after the marker):

  ```
  1.  A commonmark list item with an indented code block in it.

          code!
  ```

  In djot, we just get rid of indented code blocks. Most people
  prefer fenced code blocks anyway, and we don't need two
  different ways of writing code blocks (goal 11).

- To meet goal 6 and to avoid the complex rules commonmark
  adopted for handling raw HTML, we simply do not allow raw HTML,
  except in explicitly marked contexts, e.g.
  `` `<a id="foo">`{=html} `` or

  ````
  ``` =html
  <table>
  <tr><td>foo</td></tr>
  </table>
  ```
  ````

  Unlike Markdown, djot is not HTML-centric. Djot documents
  might be rendered to a variety of different formats, so although
  we want to provide the flexibility to include raw content in
  any output format, there is no reason to privilege HTML. For
  similar reasons we do not interpret HTML entities, as
  commonmark does.

- To meet goal 2, we make reference link parsing local.
  Anything that looks like `[foo][bar]` or `[foo][]` gets
  treated as a reference link, regardless of whether `[foo]`
  is defined later in the document. A corollary is that we
  must get rid of shortcut link syntax, with just a single
  bracket pair, `[like this]`. It must always be clear what is a
  link without needing to know the surrounding context.

- In support of goal 6, reference links are no longer
  case-insensitive. Supporting this beyond an ASCII context
  would require building in unicode case folding to every
  implementation, and it doesn't seem necessary.

- A space or newline is required after `>` in block quotes,
  to avoid the violations of the principle of uniformity
  noted in goal 8:

  ```
  >This is not a
  >block quote in djot.
  ```

- To meet goal 3, we avoid using doubled characters for
  strong emphasis. Instead, we use `_` for emphasis and `*` for
  strong emphasis. Emphasis can begin with one of these
  characters, as long as it is not followed by a space,
  and will end when a similar character is encountered,
  as long as it is not preceded by a space and some
  different characters have occurred in between. In the case
  of overlap, the first one to be closed takes precedence.
  (This simple rule also avoids the need we had in commonmark to
  determine unicode character classes---goal 6.)

- Taken just by itself, this last change would introduce a
  number of expressive blind spots. For example, given the
  simple rule,
  ```
  _(_foo_)_
  ```
  parses as
  ``` html
  <em>(</em>foo<em>)</em>
  ```
  rather than
  ``` html
  <em>(<em>foo</em>)</em>
  ```
  If you want the latter
  interpretation, djot allows you to use the syntax
  ```
  _({_foo_})_
  ```
  The `{_` is a `_` that can only open emphasis, and the `_}` is
  a `_` that can only close emphasis. The same can be done with
  `*` or any other inline formatting marker that is ambiguous
  between an opener and closer. These curly braces are
  *required* for certain inline markup, e.g. `{=highlighting=}`,
  `{+insert+}`, and `{-delete-}`, since the characters `=`, `+`,
  and `-` are found often in ordinary text.

- In support of goal 1, code span parsing does not backtrack.
  So if you open a code span and don't close it, it extends to
  the end of the paragraph. That is similar to the way fenced
  code blocks work in commonmark.

  ```
  This is `inline code.
  ```

- In support of goal 9, a generic attribute syntax is
  introduced. Attributes can be attached to any block-level
  element by putting them on the line before it, and to any
  inline-level element by putting them directly after it.

  ```
  {#introduction}
  This is the introductory paragraph, with
  an identifier `introduction`.

             {.important color="blue" #heading}
  ## heading

  The word *atelier*{weight="600"} is French.
  ```

- Since we are going to have generic attributes, we no longer
  support quoted titles in links. One can add a title
  attribute if needed, but this isn't very common, so we don't
  need a special syntax for it:

  ```
  [Link text](url){title="Click me!"}
  ```

- Fenced divs and bracketed spans are introduced in order to
  allow attributes to be attached to arbitrary sequences of
  block-level or inline-level elements. For example,

  ```
  {#warning .sidebar}
  ::: Warning
  This is a warning.
  Here is a word in [français]{lang=fr}.
  :::
  ```

-->

## HypeDown: A MarkDown-like Text Formatting Language

* **Hype**rtext Mark**Down**—an extensible subset of [MarkDown](https://commonmark.org) with an extensible
  superset of [HTML5](https://developer.mozilla.org/en-US/docs/Web/HTML)



## Notes

### Update: Self-Closing Tags

An ingenious discovery has been made by
(crisdosaygo/good.html)[https://github.com/crisdosaygo/good.html/blob/ba43292e35c4d48358abebbfe65f516318761f74/README.md#introducing-self-closing-tags-for-web-components]:

> ## Introducing: self-closing tags for Web Components
>
> **Void tags** have *finally* come to custom-elements&mdash;*with a **BANG!***
>
> ***BANG!*** is your library of choice for self-closing tags with Web Components:
>
> ```js
> <!app-header />
> <div>
>   <!app-content />
> </div>
> ```
>
> These self-closing tags are known as **bang-tags** (*web components with a **bang!***)
>
> They're actually just ***valid*** HTML comments that ***BANG!*** converts into valid [Web
> Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components).
>
> Like HTML [void tags](https://developer.mozilla.org/en-US/docs/Glossary/Empty_element), when you use
> **bang-tags** you can omit the self-closing slash `/>`. So, `<!custom-el2>` is also a valid void
> self-closing **bang-tag**.

### Including and Inserting

* `<include/>` with mandatory attribute `path` reads the referenced file and puts the definitions
  (declarations) of that file in a namespace (prefix) that defaults the the file's name
  * it is an error to refer multiple times to a file with the same name without giving explicit and distinct
    prefixes, so

    ```md
    <include path=./one-directory/f.hd/>
    <include path=./other-directory/f.hd/>
    ```

    is an error that can be resolved by writing

    ```md
    <include path=./one-directory/f.hd/>
    <include prefix=g path=./other-directory/f.hd/>
    ```

    or by explicitly allowing `overwrite`:

    ```md
    <include path=./one-directory/f.hd/>
    <include overwrite path=./other-directory/f.hd/>
    ```

  * with `prefix=*`, `<include>` will import all exportables into the documents' main namespace
  * renderable content of an `<include/>`d file will *not* be shown unless the `render` attribute is set;
    alternatively, use `<insert/>`
* `<insert path='...'/>` inserts the renderable content of another file; equivalent to `<include path='...'
  render='true'/>`; optionally with `prefix`

### Code Spans and Code Blocks

* Markup:
  * use one or more backticks to delineate code spans and blocks (code regions)
  * the number of backticks that start a code region must equal the numbers of backticks that end the
    region; sequences of fewer or more backticks within a code region will become part of the enclosed text;
  * therefore, ` ``x```y`` ` will be turned into `<code>x```y</code>` and  ``` ``x`y`` ``` will be turned
    into ``<code>x`y</code>``. As always in HypeDown, it is also possible to escape one or more backticks to
    mark them as literal characters, so this ``` `\`x\`` ``` will be rendered as ```<code>`x`</code>``` (but
    is probably not more readable than ``` `` `x` `` ```)
  * leading and trailing whitespace will be removed from code spans; this allows to start and end a code
    span with backticks. To include leading or trailing spaces, use backslash, space (`\ `) sequences, which
    will actually insert `U+00a0 No-Break Space` (very probably what you wanted in the first place).

* HTML representation:
  * `<code>...</code>` for code spans
  * `<pre><code>...</code></pre>` for code blocks

### HTMLish Tags
<!--
    without       with          open        close
    atrs          atrs

    <t>           <t k=v>       ✅         ❌           ltr           otag
    </>           ———           ❌         ✅           lsr           ctag (empty)
    </t>          ———           ❌         ✅           ls            ctag (named)
    <t/(?!>)      <t k=v/(?!>)  ✅         ❌           lt            ntag
    (?<!<)/(?!>)  ———           ❌         ✅           s             nctag
    <t/>          <t k=v/>      ✅         ✅           ltsr          stag

 -->


| nr |         sample        |   w/out atrs   | ws | open | close |  schematic  |      pg_tag      |
|----|-----------------------|----------------|----|------|-------|-------------|------------------|
|  1 | `ooo<t>iii`           | `<t>`          | ✔  | ✔    | ❌     | **O-LTR**   | otag             |
|  2 | `iii</>ooo`           | `</>`          | ❌  | ❌    | ✔     | **C-LSR**   | ctag<sup>1</sup> |
|  3 | `iii</t>ooo`          | `</t>`         | ❌  | ❌    | ✔     | **C-LSTR**  | ctag<sup>2</sup> |
|  4 | `ooo<t/iii`           | `<t/(?!>)`     | ✔  | ✔    | ❌     | **O-LT**    | ntag             |
|  5 | `iii/ooo`<sup>3</sup> | `(?<!<)/(?!>)` | ❌  | ❌    | ✔     | **C-S**     | nctag            |
|  6 | `ooo<t/>ooo`          | `<t/>`         | ✔  | ✔    | ✔     | **OC-LTSR** | stag             |

* Columns:<br>**nr**: row number for reference. <br>**sample**: what the source looks like. <br>**w/out
  atrs**: formal representation of the tag (without attributes), with some boundary conditions. <br>**ws**:
  whether whitespace is allowed within the tag proper (not its content); none of the forms `</>`, `</t>`,
  and, trivially, `/` allow whitespace, so`</t >`, `< /t>` and `</ t>` will all lead to errors. This rule
  can probably be relaxed in the future. <br>**open**: whether tag is opening a region. <br>**close**:
  whether tag closes a region. <br>**schematic**: see below. <br>**pg_tag**: for internal reference.
* In the **sample** column, `t` represents the tag name, `ooo` some content outside of the tag, and `iii`
  some content inside of the tag (the content that is marked up by the tag in question)
* In the **schematic** column, **L**: `<`, **R**: `>`, **S**: `/`, **T**: tag name: the schematic can be
  used to uniquely identify each tag variant. To further clarify, these are prefixed with **O** for
  'opening' and / or **C** for 'closing' tag
* **1)**&nbsp;anonymous closing tag.<br>**2)**&nbsp;named closing tag (the only one allowed in HTML, XML).
  <br>**3)**&nbsp;only recognized when in a position symmetrical to an **O-LT** tag (as in, `ooo<t/iii/ooo`);
  otherwise, either silently ignored or leading to a warning or error, depending on configuration

## Links

* [Djot syntax](https://htmlpreview.github.io/?https://github.com/jgm/djot/blob/master/doc/syntax.html)
* [*The Double-E Infix Expression Parsing Method*](https://erikeidt.github.io/The-Double-E-Method)


## To Do

* **[–]** documentation
* **[–]** so many things
* **[–]** code regions: whether or not to render
  * observed behavior of [GutHub-flavored Markdown (GFM)](https://github.github.com/gfm/):
    * HTML **in HTML** code regions: <code>a<strong>b</strong></code>
      ([GFM](https://github.github.com/gfm/): **does** render)
    * HD **in HTML** code regions: <code>a**b**</code> ([GFM](https://github.github.com/gfm/): **does**
      render)
    * HTML **in HD** code regions: ```a<strong>b</strong>``` ([GFM](https://github.github.com/gfm/):
      **doesn't** render, shows markup)
    * HD **in HD** code regions: ```a**b**``` ([GFM](https://github.github.com/gfm/): **doesn't** render,
      shows markup)
  * behavior determined by region, not kind of markup used in region
  * HTML `<code>` spans in MD act as they do in plain HTML and do *not* block markup (must use `&entities;`
    to show literal `<`, `&..;`), but MD ```` ```code``` ```` spans *do* block markup (presumably w/out a
    way to activate markup)
    * so in order to get bold text in a code span, the only way is to use HTML `<code>` spans
  * probably best to conform to this to avoid surprising / confusing behavior
* **[–]** code spans: how to treat
  * multiple spaces
  * single newlines
  * multiple newlines
  * escaped newlines
* **[–]** implement notations to recognize global and local stop points:
  * a global stop point will cause document production to terminate
  * a local stop point will cause processing of the current source file
  * implement as an [XML Processing Instruction
    (XMLPI)](https://en.wikipedia.org/wiki/Processing_Instruction):
    * starts with `<?` (start of processing instruction, SOPI)
    * command, any non-WS until WS or EOPI is found: `/\S+(?=\s|\?>)/`
    * attributes (HTML attributes)
    * ends with `?>` (end of processing instruction, EOPI)
  * `<?stop?>`, interpreted as local stop when in an included / inserted file (subfiles), and as a global
    stop when found in main file
  * `<?stop-all?>` is explicitly global, can be used in subfiles
  * `<?stop?>` and `<?stop-all?>` are special in that they're scanned for independently from lexer, parser
    *before* those get to see the source
    * which means they can not be overriden by other HypeDown syntax, except when *any* of the letters is
      preceded by a slash or expressed as an XNCR
    * they have restricted syntax: no extra whitespace, no linebreaks, no attributes, no uppercase is
      allowed; they must appear as the exact sequences `<?stop?>` and `<?stop-all?>` (or `<?stop_all?>`)
      literally, on a single line of source text; the variant `<?stop_all?>` allows an underscore to prevent
      text editors from inserting a linebreak after the hyphen
    * thus, none of `\<?stop?>`, `<\?stop?>`, `<?st\op?>`, `<?st&#x6f;p?>`, `<?stop?&lt;` will cause a
      processing stop; rather, they will be processed like other source material (and may produce a literal
      text `<?stop?>` or `<?st&#x6f;p?>` or even be elided, depending on the environment within they appear,
      which might happen to be running text, a code span, or an HTML comment)
* **[–]** allow to provide custom XNCRs (`&bar;`, `&foo:bar;`)
  * **[–]** provide a set of standard XNCRs
  * **[–]** provide an XNCR that vanishes w/out replacement (similar to Unicode Zero Width Joiner, only has
    an effect on lexing / parsing)
* **[–]** implement processing chain like:
  * **1)**—preprocess `<?start?>`, `<?stop?>` XMLPIs; assume all documents start in active mode, can use
    `<?stop?>` near the top to add comments
    * this ensures only active portions of the source are processed by downstream lexers, parsers
  * **2)**—preprocess (and consolidate) newlines, indentations
    * these parbreaks are preliminary and may be overriden by some of the later processing steps
    * this ensures MD parbreaks (i.e. two or more consecutive blank lines) are seen by all downstream
      transforms and can not accidentally be skipped over by markup
    * **Note** that transforms for e.g. code *spans* must honor parbreaks while transforms for e.g. code
      *blocks* must 'undo' them (i.e. include literal newlines, stamp parbreak tokens)
  * **3)**—lexer
  * **4)**—parser





