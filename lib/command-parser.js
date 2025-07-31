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
      insert_replace: /^(?<cmd_prefix>.*?)<<<(?<cmd_slash>\/?)(?<cmd_name>insert|replace-above|replace-below)\x20+(src\s*=\s*)?(?<cmd_p1>(?:(?:'(?:\\'|[^'])+')|(?:"(?:\\"|[^"])+")|(?:\$[a-zA-Z0-9]+)))>(?<cmd_user_eoi>[^>]*)>(?<cmd_system_eoi>[^>]*)>(?<cmd_suffix>.*?)$/, // insert JS identifier pattern
      publish: /^(?<cmd_prefix>.*?)<<<(?<cmd_slash>\/?)(?<cmd_name>publish)\x20+((?<cmd_disposition>one|enclosed)\x20+)?(as\s*=\s*)?(?<cmd_p1>(?:(?:'\#(?:\\'|[^'])+')|(?:"\#(?:\\"|[^"])+")))>(?<cmd_user_eoi>[^>]*)>(?<cmd_system_eoi>[^>]*)>(?<cmd_suffix>.*?)$/,
      similar: /^(?<cmd_prefix>.*?)<<<[^>]*>[^>]*>[^>]*>(?<cmd_suffix>.*?)$/
    }
  };

  //-----------------------------------------------------------------------------------------------------------
  match_line = function(line) {
    var cmd_pattern, groups, k, match, pattern, ref, v;
    if ((typeof line) !== 'string') {
      throw new Error(`Ωcmdprs_1 expected a line of text, got ${rpr(line)}`);
    }
    ref = internals.patterns;
    for (cmd_pattern in ref) {
      pattern = ref[cmd_pattern];
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
        return {cmd_pattern, ...groups};
      }
    }
    return null;
  };

  //===========================================================================================================
  module.exports = {match_line, internals};

}).call(this);

//# sourceMappingURL=command-parser.js.map