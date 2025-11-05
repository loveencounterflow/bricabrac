

# Bric-A-Brac

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Bric-A-Brac](#bric-a-brac)
  - [To Do](#to-do)
    - [Major Tasks / Outline](#major-tasks--outline)
    - [Operational Principles](#operational-principles)
    - [Other](#other)
    - [Treatment of Slashes](#treatment-of-slashes)
  - [Scratchpad](#scratchpad)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Bric-A-Brac


compose files by including other files


## To Do

### Major Tasks / Outline

* **`[—]`** parse CoffeeScript or JavaScript sources to find all `require()` calls with static, literal
  argument:
  * calls with one static, literal path argument can (potentially) be resolved; when the path is non-local,
    it can either be a `node:` internal (in which case note is taken that the module is not suitable for
    browser usage) or a general name that should be resolvable using the npm registry (in which case a
    dependency entry should be added to `package.json` in case it's not already there)
    * **Note** in the case that non-local, non-NodeJS `require()` calls are found, the source file *must* be
      part of a npm-compatible modukle in the sense that it has a discoverable `package.json`; the exact
      name used in the `require()` call must also be a key of the `dependencies` object in that file; key
      and value will be used to formulate a dependency for the target; in case the key in the *target*
      dependencies is already present, the origin's value (i.e. the origin's SemVer declaration) *must* be
      compatible with the target's value (using `( require 'semver' ).satisfies( ... )`)
  * *all* other uses of `require()` (e.g. `require 'my' + 'package'` and anything more complicated) generate
    warnings

* **`[—]`** transform `bric-a-brac.json` to `_bric-a-brac.compiled.json`:
  * apply templates to get default values for cache locations &c
  * resolve all key/value pairs of `strings` recursively
  * resolve all keys of `strings` contained in mapping values (non-recursively)
  * resolve symbolic and relative paths (turn them into non-symbolic absolute paths) such as
    `file:///path/to/file`, `~/path/to/file`, `./path/to/file`, `../../path/to/file`


### Operational Principles

* In the configuration file, `/path/to/app/bric-a-brac.json` (typically next to `/path/to/app/package.json`,
  `/path/to/app/node_modules/` and `/path/to/app/.git/`), we configure *mappings* from **targets** in the
  form of (local) file system (FS) paths to (remote or local) **sources** in the form of URLs and FS paths.

> * **targets** -> **destinations**
> * **sources** -> **origins**


* Relative paths in `require()` calls in a given module `/path/to/app/src/frobulator.coffee` are of course
  resolved relative to the containing folder, i.e. `/path/to/app/src/`. Targets in `bric-a-brac.json` should
  likewise be given as relative paths, but those will be resolved relative to *their* containing folder,
  i.e. `/path/to/app/`. This means that in order to procure a source file
  `/path/to/app/src/frob-helpers.coffee`, a mapping like `{ "./src/frob-helpers.coffee":
  "https://github.com/...", }` should be set up, while in `src/frobulator.coffee` one will write `require
  './frob-helpers` to load that module. Observe that we're omitting the file extension; since each source
  file `src/${name}.coffee` will (at least in the software that I write) be transpiled into a JS target file
  `lib/${name}.js`, `require './frob-helpers` resolves ultimately to `/path/to/app/lib/frob-helpers.js`.


```
https://raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/2980e28985fe7b96772a7213a2cd9ae3f263177a/src/jetstream.brics.coffee
https://raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/2980e28985fe7b96772a7213a2cd9ae3f263177a/lib/jetstream.brics.js
file:///path/to/app/bricabrac/https/raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/2980e28985fe7b96772a7213a2cd9ae3f263177a/src/jetstream.brics.coffee
file:///path/to/app/bricabrac/https/raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/2980e28985fe7b96772a7213a2cd9ae3f263177a/lib/jetstream.brics.js
```

* **`origin`**: URL of file (repo) origin
* **`destination`**: path to destination
* **`cfg_path`**:
* **`lockfile_path`**: where file IDs are kept
* **`method`**:
  * `'single'`: (default) retrieves as single file (with its remote path mirrored) using `wget`:

  ```bash
  wget                        \
    --tries=inf               \
    --continue                \
    --recursive               \
    --directory-prefix https  \
    "https://raw.githubusercontent.com/$user_name/$project_name/$branch_ref/path/to/file.ext"
  ```

  * `'git'`: for local git repos
  * `'github'`: for remote git repos hosted on github.com
* **`cache_path`**: where `git clone` goes to
* **`keep_cache`**: `true`/`false`, whether to keep cached mirror
* **`branch_ref`**: when method is `'github'`, something like `'refs/heads/main'` or commit ID (can be partial; at least 4, 7 more common and may be necessary)
* **`presets`**: redundant where identical with file extension (e.g. `presets: 'coffee'` entails `finalize: 'touch $destination`)
* **`finalize`**: shell command to run after files have been mirrored to destination

```

`
https://raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/    refs/heads/main/                             lib/jetstreams/main.js
https://raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/    62aa04542e807863b3f402cb10656051db1a988a/    lib/jetstreams/main.js
|--------------------------------|
                                 |-----------------|
                                                   |-------------------|
                                                                       |-------------------------------------------------|
                                                                                                                         |-----------------------|
domain                            user_name         repo_name          branch_ref                                        file_path


# the same file in ordinary view:

https://github.com/               loveencounterflow/bricabrac-sfmodules/    blob/main/                                   lib/jetstreams/main.js


```



### Other


* **`[—]`** MVP:
  * **`[—]`** there is a `bricabrac.json` file with the following structure:
    * an object with a single key `mappings`
        * extensibility: in addition to `mappings`, optional other keys can be added:
          * `strings` is an object whose keys are string constants and whose values are replacements; values
            themselves can contain keys of `strings` that will be matched recursively, as shown below;
            circular mappings are forbidden and will cause an error
    * `mappings` is an object whose
      * **keys are local target paths** (absolute paths or paths relative to the project folder),
        * **Note**: **must validate paths**: must be inside target project file system tree, must not be
          inside `.git`(?) or `node_modules`(?) (or at least prohibit those locations by default?)
      * values are URLs that typically refer to single files.
        * extensibility:
          * instead of string values, optional objects can be used; in that case, the string value becomes
            value of entry with key `location`
          * <del>another key `prefer` can be added; where present, first the value of `prefer` is tested, if
            it cannot be resolved, then `location` is used</del>
          * <ins>The `prefer` key should be viewed as strictly being there for local development only; as
            such, its presence and/or usage should also be restricted to the machine where development takes
            place. It would be cumbersome to elide and re-insert `prefer` keys each time a
            `bric-a-brac.json` file is staged and committed</ins>
          * an override file `.bric-a-brac.overrides.json` that should be added to `.gitignore` may contain
            any settings that are valid on the local machine
          * figure out how to test installation and package correctness both *with* and *without*
            `.bric-a-brac.overrides.json` being read; one option would be to temporarily rename the file to,
            say, `.DONT-USE.bric-a-brac.overrides.json`, also registered to get `.gitignore`d.
      * **Limitations**:
        * since keys are local target paths, they **do not coincide with strings to be used to load / import
          / require the data**
        * since local target paths are object keys, they must be unique; on a basic level that means that
          each Bric-A-Brac mapping will create one distinct file somewhere in the target tree; however, one
          can imagine an extension syntax like `path/to/file.coffee#1`, `path/to/file.coffee#2`,
          `path/to/file.coffee#3`, where an ordering and uniqueness is achieved.—*Counterargument*: both too
          complicated and too limited; rather, use 'insertion tags' (arbitrary regular expressions for
          insertion markers compliant with arbitrary formats) to pull content into target files; in that
          case, what should the keys look like?
    * resolution:
      * URL is resolved (e.g. using `fetch()`)
      * when

```json
{
  "mappings": {
    "src/bricabrac-capture-output.coffee": "https://raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/refs/heads/main/src/unstable-capture-output.coffee"
  }
}
```


```json
{
  "strings": {
    "$gh$": "https://raw.githubusercontent.com",
    "%flow%:": "$gh$/loveencounterflow/",
    ":sfmodules:": "%flow%:/bricabrac-sfmodules/refs/heads/main/src"
    },
  "mappings": {
    "src/bricabrac-capture-output.coffee": ":sfmodules:unstable-capture-output.coffee"
  }
}
```

------------------------------------------------

```json
{
  "strings": {
    "::gh::": "https://raw.githubusercontent.com",
    "::bb-2025-10-02::": "c117f41b7723ffe6e912351ff583d3a60f110ba2"
    },
  "mappings": {
    "src/bricabrac-capture-output.coffee": "::gh::/loveencounterflow/bricabrac-sfmodules/::bb-2025-10-02::/src/unstable-capture-output.coffee"
  }
}
```

Note that GitHub allows to shorten commit IDs; these settings are equivalent to the ones above:

```json
{
  "strings": {
    "::gh::": "https://raw.githubusercontent.com",
    "::bb-2025-10-02::": "c117"
    },
  "mappings": {
    "src/bricabrac-capture-output.coffee": "::gh::/loveencounterflow/bricabrac-sfmodules/::bb-2025-10-02::/src/unstable-capture-output.coffee"
  }
}
```

```json
// in `bric-a-brac.json`:
{
  "strings": {
    "::gh::": "https://raw.githubusercontent.com",
    "::bb-2025-10-02::": "c117",
    "::local::": "~/jzr/"
    },
  "mappings": {
    "src/bricabrac-capture-output.coffee": "::gh::/loveencounterflow/bricabrac-sfmodules/::bb-2025-10-02::/src/unstable-capture-output.coffee"
  }
}

// in `.bric-a-brac.overrides.json`:
{
  "mappings": {
    "src/bricabrac-capture-output.coffee": "::gh::/loveencounterflow/bricabrac-sfmodules/::bb-2025-10-02::/src/unstable-capture-output.coffee"
  }
}
```

### Treatment of Slashes

Slashes are not treated specially. In order to avoid `paths/with//reduplicated//slashes`, it is good
practice to define match keys that start and end with as many slashes as the replacement values; observe how
when when one does that, all values read naturally:

```json
{ "strings": {
  "/(user)/":     "/Alice/",
  "(schema)//":   "https://",
  "(server)/":    "(schema)//example.com/",
  "(folder)":     "(server)/(user)/data",
  "(file)":       "(folder)/file.txt"
} }
```

The expanded version of the above strings catalog has all the right slashes in the right places:

```json
{ "strings": {
  "/(user)/":     "/Alice/",
  "(schema)//":   "https://",
  "(server)/":    "https://example.com/",
  "(folder)":     "https://example.com/Alice/data",
  "(file)":       "https://example.com/Alice/data/file.txt"
} }
```

## Scratchpad

* **`[—]`** refer to git `head` of repo:
  * concrete: `https://raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/refs/heads/main/lib/unstable-capture-output.js`
  * symbolic: `github:`

  `https://raw.githubusercontent.com/<user>/<repo>/<branch>/<path/to/file>`
            `https://esm.sh/gh/<user>/<repo>@<version>/<path>`
  `https://cdn.jsdelivr.net/gh/<user>/<repo>@<version>/<file>`


<!--   * Deno lets you define aliases, you can invent your own `gh://` scheme locally:

    ```json
    { "imports": { "gh:": "https://raw.githubusercontent.com/" } }
    ```
    Then in code: `import { serve } from "gh:denoland/deno_std/main/http/server.ts";`
 -->

* **`[—]`** it's conceivable that when mapping a specific set of lines from a source file that all other
  lines should be replaced by `\n` so linecounts are preserved
