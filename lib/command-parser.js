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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NvbW1hbmQtcGFyc2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQTtFQUFBO0FBQUEsTUFBQSxHQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsU0FBQSxFQUFBLEdBQUEsRUFBQSxVQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQTs7O0VBR0EsR0FBQSxHQUE0QixPQUFBLENBQVEsS0FBUjs7RUFDNUIsQ0FBQSxDQUFFLEtBQUYsRUFDRSxLQURGLEVBRUUsSUFGRixFQUdFLElBSEYsRUFJRSxLQUpGLEVBS0UsTUFMRixFQU1FLElBTkYsRUFPRSxJQVBGLEVBUUUsT0FSRixDQUFBLEdBUTRCLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBUixDQUFvQixXQUFwQixDQVI1Qjs7RUFTQSxDQUFBLENBQUUsR0FBRixFQUNFLE9BREYsRUFFRSxJQUZGLEVBR0UsT0FIRixFQUlFLEdBSkYsQ0FBQSxHQUk0QixHQUFHLENBQUMsR0FKaEMsRUFiQTs7O0VBcUJBLFNBQUEsR0FDRTtJQUFBLFFBQUEsRUFDRTtNQUFBLGNBQUEsRUFBZ0IsdVBBQWhCO01Bc0JBLE9BQUEsRUFBUyxvUEF0QlQ7TUE0Q0EsT0FBQSxFQUFTO0lBNUNUO0VBREYsRUF0QkY7OztFQXNFQSxVQUFBLEdBQWEsUUFBQSxDQUFFLElBQUYsQ0FBQTtBQUNiLFFBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUE7SUFBRSxJQUFPLENBQUUsT0FBTyxJQUFULENBQUEsS0FBbUIsUUFBMUI7TUFDRSxNQUFNLElBQUksS0FBSixDQUFVLENBQUEsdUNBQUEsQ0FBQSxDQUEwQyxHQUFBLENBQUksSUFBSixDQUExQyxDQUFBLENBQVYsRUFEUjs7QUFFQTtJQUFBLEtBQUEsa0JBQUE7O01BQ0UsSUFBRyxxQ0FBSDtRQUNFLE1BQUEsR0FBUyxNQUFNLENBQUMsV0FBUDs7QUFBcUI7QUFBQTtVQUFBLEtBQUEsU0FBQTs7eUJBQUEsQ0FBRSxDQUFGLGNBQU8sSUFBSSxJQUFYO1VBQUEsQ0FBQTs7WUFBckI7QUFDVCxlQUFPLENBQUUsV0FBRixFQUFlLEdBQUEsTUFBZixFQUZUOztJQURGO0FBSUEsV0FBTztFQVBJLEVBdEViOzs7RUFnRkEsTUFBTSxDQUFDLE9BQVAsR0FBaUIsQ0FBRSxVQUFGLEVBQWMsU0FBZDtBQWhGakIiLCJzb3VyY2VzQ29udGVudCI6WyJcbid1c2Ugc3RyaWN0J1xuXG4jPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbkdVWSAgICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICdndXknXG57IGFsZXJ0XG4gIGRlYnVnXG4gIGhlbHBcbiAgaW5mb1xuICBwbGFpblxuICBwcmFpc2VcbiAgdXJnZVxuICB3YXJuXG4gIHdoaXNwZXIgfSAgICAgICAgICAgICAgID0gR1VZLnRybS5nZXRfbG9nZ2VycyAnYnJpY2FicmFjJ1xueyBycHJcbiAgaW5zcGVjdFxuICBlY2hvXG4gIHJldmVyc2VcbiAgbG9nICAgICB9ICAgICAgICAgICAgICAgPSBHVVkudHJtXG5cblxuIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5pbnRlcm5hbHMgPVxuICBwYXR0ZXJuczpcbiAgICBpbnNlcnRfcmVwbGFjZTogLy8vIF5cbiAgICAgICg/PGNtZF9wcmVmaXg+IC4qPyApXG4gICAgICA8XG4gICAgICA8XG4gICAgICA8XG4gICAgICAoPzxjbWRfc2xhc2g+IFxcLz8gKVxuICAgICAgKD88Y21kX25hbWU+IGluc2VydCB8IHJlcGxhY2UtYWJvdmUgfCByZXBsYWNlLWJlbG93IClcbiAgICAgIFxceDIwK1xuICAgICAgKHNyY1xccyo9XFxzKik/KD88Y21kX3AxPlxuICAgICAgICAoPzpcbiAgICAgICAgICAoPzogJyAoPzogXFxcXCcgfCBbXiAnIF0gICkrICcgKSB8XG4gICAgICAgICAgKD86IFwiICg/OiBcXFxcXCIgfCBbXiBcIiBdICApKyBcIiApIHxcbiAgICAgICAgICAoPzogXFwkIFthLXpBLVowLTldKyAgICAgICAgICApICMgaW5zZXJ0IEpTIGlkZW50aWZpZXIgcGF0dGVyblxuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgPlxuICAgICAgKD88Y21kX3VzZXJfZW9pPiBbXiA+IF0qIClcbiAgICAgID5cbiAgICAgICg/PGNtZF9zeXN0ZW1fZW9pPiBbXiA+IF0qIClcbiAgICAgID5cbiAgICAgICg/PGNtZF9zdWZmaXg+IC4qPyApXG4gICAgICAkIC8vL1xuICAgIHB1Ymxpc2g6IC8vLyBeXG4gICAgICAoPzxjbWRfcHJlZml4PiAuKj8gKVxuICAgICAgPFxuICAgICAgPFxuICAgICAgPFxuICAgICAgKD88Y21kX3NsYXNoPiBcXC8/IClcbiAgICAgICg/PGNtZF9uYW1lPiBwdWJsaXNoIClcbiAgICAgIFxceDIwK1xuICAgICAgKCAoPzxjbWRfZGlzcG9zaXRpb24+ICAgb25lICAgfCBlbmNsb3NlZCAgKSBcXHgyMCsgKT9cbiAgICAgIChhc1xccyo9XFxzKik/KD88Y21kX3AxPlxuICAgICAgICAoPzpcbiAgICAgICAgICAoPzogJyBcXCMgKD86IFxcXFwnIHwgW14gJyBdICApKyAnICkgfFxuICAgICAgICAgICg/OiBcIiBcXCMgKD86IFxcXFxcIiB8IFteIFwiIF0gICkrIFwiIClcbiAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgID5cbiAgICAgICg/PGNtZF91c2VyX2VvaT4gW14gPiBdKiApXG4gICAgICA+XG4gICAgICAoPzxjbWRfc3lzdGVtX2VvaT4gW14gPiBdKiApXG4gICAgICA+XG4gICAgICAoPzxjbWRfc3VmZml4PiAuKj8gKVxuICAgICAgJCAvLy9cbiAgICBzaW1pbGFyOiAvLy8gXiAoPzxjbWRfcHJlZml4PiAuKj8gKSA8PDwgW14+XSogPltePl0qPltePl0qPiAoPzxjbWRfc3VmZml4PiAuKj8gKSAkIC8vL1xuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbm1hdGNoX2xpbmUgPSAoIGxpbmUgKSAtPlxuICB1bmxlc3MgKCB0eXBlb2YgbGluZSApIGlzICdzdHJpbmcnXG4gICAgdGhyb3cgbmV3IEVycm9yIFwizqljbWRwcnNfMSBleHBlY3RlZCBhIGxpbmUgb2YgdGV4dCwgZ290ICN7cnByIGxpbmV9XCJcbiAgZm9yIGNtZF9wYXR0ZXJuLCBwYXR0ZXJuIG9mIGludGVybmFscy5wYXR0ZXJuc1xuICAgIGlmICggbWF0Y2ggPSBsaW5lLm1hdGNoIHBhdHRlcm4gKT9cbiAgICAgIGdyb3VwcyA9IE9iamVjdC5mcm9tRW50cmllcyAoIFsgaywgKCB2ID8gbnVsbCApLCBdIGZvciBrLCB2IG9mIG1hdGNoLmdyb3VwcyApXG4gICAgICByZXR1cm4geyBjbWRfcGF0dGVybiwgZ3JvdXBzLi4uLCB9XG4gIHJldHVybiBudWxsXG5cbiM9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxubW9kdWxlLmV4cG9ydHMgPSB7IG1hdGNoX2xpbmUsIGludGVybmFscywgfVxuIl19
//# sourceURL=../src/command-parser.coffee