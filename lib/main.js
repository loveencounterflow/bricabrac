(async function() {
  'use strict';
  var A_demo_dbay, A_prepare_arena, A_trash, COMMAND_PARSER, DBay, FSE, GUY, PATH, Pipeline, SQL, alert, debug, echo, get_cfg, get_pipeline, help, info, inspect, log, plain, praise, prepare_db, reverse, rpr, urge, warn, whisper;

  //===========================================================================================================
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('bricabrac'));

  ({rpr, inspect, echo, reverse, log} = GUY.trm);

  //...........................................................................................................
  FSE = require('fs-extra');

  PATH = require('node:path');

  A_trash = (require('trash')).default;

  ({DBay, SQL} = require('dbay'));

  COMMAND_PARSER = require('./command-parser');

  ({Pipeline} = require('moonriver'));

  //===========================================================================================================
  get_cfg = function() {
    var R, db_cfg;
    R = {};
    R.source_path = '../../hengist-NG/assets/bricabrac/interpolation-1';
    R.target_path = R.source_path.replace('/assets/', '/arena/');
    //.........................................................................................................
    R.source_path = PATH.resolve(PATH.join(__dirname, R.source_path));
    R.target_path = PATH.resolve(PATH.join(__dirname, R.target_path));
    //.........................................................................................................
    R.main_path = PATH.join(R.target_path, 'main.md');
    //.........................................................................................................
    db_cfg = {
      path: '/dev/shm/bricabrac.db'
    };
    //.........................................................................................................
    return R;
  };

  //===========================================================================================================
  A_prepare_arena = async function() {
    var cfg, message;
    cfg = get_cfg();
    //.........................................................................................................
    whisper('Ωbrbr___1', '—————————————————————————————————————————————————————————————————————');
    urge('Ωbrbr___2', `trashing: ${cfg.target_path}`);
    message = ((await A_trash(cfg.target_path))) != null ? "done" : "nothing to do";
    help('Ωbrbr___3', `trashing: ${message}`);
    whisper('Ωbrbr___4', '—————————————————————————————————————————————————————————————————————');
    urge('Ωbrbr___5', `copying from: ${cfg.source_path}`);
    urge('Ωbrbr___6', `copying   to: ${cfg.target_path}`);
    FSE.copySync(cfg.source_path, cfg.target_path, {
      overwrite: false,
      errorOnExist: true,
      dereference: true
    });
    help('Ωbrbr___7', "copying: done");
    whisper('Ωbrbr___8', '—————————————————————————————————————————————————————————————————————');
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================
  prepare_db = function() {
    var cfg, db;
    cfg = get_cfg();
    db = new DBay(cfg.db_cfg);
    //.........................................................................................................
    db(SQL`drop table if exists sources;`);
    db(SQL`drop table if exists lines;`);
    db(SQL`create table sources (
id          integer not null,
path        text    not null
);`);
    db(SQL`create table lines (
source      integer not null,
lnr         integer not null,
line        text    not null,
foreign key ( source ) references sources ( id ),
primary key ( source, lnr )
);`);
    //.........................................................................................................
    return db;
  };

  //===========================================================================================================
  A_demo_dbay = async function() {
    var cfg, db;
    await A_prepare_arena();
    cfg = get_cfg();
    db = prepare_db();
    //.........................................................................................................
    debug('Ωbrbr___9', get_pipeline(db));
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================
  get_pipeline = function(db) {
    var P, cfg, collector, p;
    cfg = get_cfg();
    //.........................................................................................................
    P = {
      //.......................................................................................................
      $db_insert_source: function() {
        return ({source_path}, send) => {
          var source_id;
          source_id = 1;
          return send({source_id, source_path});
        };
      },
      //.......................................................................................................
      $walk_lines_with_positions: function() {
        return ({source_id, source_path}, send) => {
          var eol, line, lnr, x;
          for (x of GUY.fs.walk_lines_with_positions(source_path)) {
            ({lnr, line, eol} = x);
            send({source_id, lnr, line, eol});
          }
          return null;
        };
      },
      //.......................................................................................................
      $parse_command: function() {
        return (d, send) => {
          var groups, pattern_name;
          ({pattern_name, groups} = COMMAND_PARSER.match_line(d.line));
          if (groups != null) {
            if (pattern_name === 'generic') {
              null;
            } else {
              d.dsc = groups;
            }
          }
          // debug 'Ωbrbr__10', lnr, pattern_name, { groups.groups..., } if groups?
          return send(d);
        };
      },
      //.......................................................................................................
      $show: function() {
        return (d) => {
          var startstop;
          whisper('Ωbrbr__11', d.source_id, d.lnr, d.line);
          if (d.dsc != null) {
            debug('Ωbrbr___9', rpr(d.dsc.slash));
            startstop = d.dsc.slash === '' ? 'start' : 'stop';
            help('Ωbrbr__12', d.dsc.prefix, startstop, d.dsc.command, d.dsc.position, d.dsc.p1, d.dsc.suffix);
          }
          return null;
        };
      }
    };
    //.........................................................................................................
    collector = [];
    p = new Pipeline();
    p.push([
      {
        source_path: cfg.main_path
      }
    ]);
    p.push(P.$db_insert_source());
    p.push(P.$walk_lines_with_positions());
    p.push(P.$parse_command());
    p.push(P.$show());
    // p.push ( d, send ) -> collector.push d #; help collector
    p.run();
    //.........................................................................................................
    return collector;
  };

  //===========================================================================================================
  if (module === require.main) {
    await (async() => {
      await A_demo_dbay();
      return null;
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map