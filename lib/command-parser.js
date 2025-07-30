(function() {
  'use strict';
  var GUY, alert, debug, echo, help, info, inspect, internals, log, match_line, plain, praise, reverse, rpr, urge, warn, whisper;

  //===========================================================================================================
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('bricabrac'));

  ({rpr, inspect, echo, reverse, log} = GUY.trm);

  //===========================================================================================================
  internals = {
    patterns: {
      insert_replace: /^(?<prefix>.*?)<<<(?<slash>\/?)(?<command>insert|replace)\x20+((?<position>below|above)\x20+)?(src\s*=\s*)?(?<p1>(?:(?:'(?:\\'|[^'])+')|(?:"(?:\\"|[^"])+")|(?:\$[a-zA-Z0-9]+)))>(?<user_eoi>[^>]*)>(?<system_eoi>[^>]*)>(?<suffix>.*?)$/, // insert JS identifier pattern
      publish: /^(?<prefix>.*?)<<<(?<slash>\/?)(?<command>publish)\x20+((?<disposition>one|enclosed)\x20+)?((?<position>below|above)\x20+)?(as\s*=\s*)?(?<p1>(?:(?:'\#(?:\\'|[^'])+')|(?:"\#(?:\\"|[^"])+")))>(?<user_eoi>[^>]*)>(?<system_eoi>[^>]*)>(?<suffix>.*?)$/,
      generic: /^(?<prefix>.*?)<<<(?<slash>\/?)(?<p1>.*?)>(?<user_eoi>[^>]*)>(?<system_eoi>[^>]*)>(?<suffix>.*?)$/
    }
  };

  //-----------------------------------------------------------------------------------------------------------
  match_line = function(line) {
    var groups, k, match, pattern, pattern_name, ref, v;
    if ((typeof line) !== 'string') {
      throw new Error(`Ωcmdprs_1 expected a line of text, got ${rpr(line)}`);
    }
    ref = internals.patterns;
    for (pattern_name in ref) {
      pattern = ref[pattern_name];
      if ((match = line.match(pattern)) != null) {
        groups = Object.fromEntries((function() {
          var ref1, results;
          ref1 = match.groups;
          results = [];
          for (k in ref1) {
            v = ref1[k];
            results.push([k, v != null ? v : null]);
          }
          return results;
        })());
        return {pattern_name, groups};
      }
    }
    return {
      pattern_name: null,
      groups: null
    };
  };

  //===========================================================================================================
  module.exports = {match_line, internals};

}).call(this);

//# sourceMappingURL=command-parser.js.map