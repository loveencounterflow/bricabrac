(async function() {
  'use strict';
  var GUY, alert, debug, demo, echo, help, info, inspect, log, plain, praise, reverse, rpr, urge, warn, whisper;

  //===========================================================================================================
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('bricabrac'));

  ({rpr, inspect, echo, reverse, log} = GUY.trm);

  //===========================================================================================================
  demo = async function() {
    var FSE, PATH, cfg, message, trash_async;
    FSE = require('fs-extra');
    PATH = require('node:path');
    trash_async = (require('trash')).default;
    //.........................................................................................................
    cfg = {};
    cfg.source_path = '../../hengist-NG/assets/bricabrac/interpolation-1';
    cfg.target_path = cfg.source_path.replace('/assets/', '/arena/');
    //.........................................................................................................
    cfg.source_path = PATH.resolve(PATH.join(__dirname, cfg.source_path));
    cfg.target_path = PATH.resolve(PATH.join(__dirname, cfg.target_path));
    //.........................................................................................................
    whisper('Ω___1', '—————————————————————————————————————————————————————————————————————');
    urge('Ω___2', `trashing: ${cfg.target_path}`);
    message = ((await trash_async(cfg.target_path))) != null ? "done" : "nothing to do";
    help('Ω___3', `trashing: ${message}`);
    whisper('Ω___4', '—————————————————————————————————————————————————————————————————————');
    urge('Ω___5', `copying from: ${cfg.source_path}`);
    urge('Ω___6', `copying   to: ${cfg.target_path}`);
    FSE.copySync(cfg.source_path, cfg.target_path, {
      overwrite: false,
      errorOnExist: true,
      dereference: true
    });
    help('Ω___7', "copying: done");
    whisper('Ω___8', '—————————————————————————————————————————————————————————————————————');
    return null;
  };

  //===========================================================================================================
  if (module === require.main) {
    await (async() => {
      await demo();
      return null;
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map