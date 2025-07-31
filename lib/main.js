(async function() {
  'use strict';
  var A_demo_dbay, A_prepare_arena, A_trash, COMMAND_PARSER, DBay, FSE, GUY, PATH, Pipeline, SQL, alert, debug, echo, get_cfg, help, info, inspect, log, plain, praise, prepare_db, reverse, rpr, run_pipeline, urge, warn, whisper;

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
    db(SQL`drop table if exists cmds;`);
    db(SQL`create table sources (
source_id               integer not null,
source_path             text    not null,
unique ( source_path ),
primary key ( source_id ) ); `);
    db(SQL`create table lines (
source_id               integer not null,
line_nr                 integer not null,
line_text               text    not null,
foreign key ( source_id ) references sources,
primary key ( source_id, line_nr ) ); `);
    db(SQL`create table cmds (
source_id               integer not null,
line_nr                 integer not null,
cmd_name                text    not null,
cmd_p1                  text    not null,
-- cmd_extent indicates count of lines to be replaced plus one (including line with openening *and* line
-- with closing cmd, if any:
-- * positive for lines below,
-- * negatives above;
-- * zero indicates no insertion / replacement / export
-- * plus one means insert between cmd line and adjacent line below, *preserving* adjacent line
-- * plus two means replace open cmd line and one plain line
cmd_extent              integer not null default 0,
foreign key ( source_id, line_nr ) references lines,
primary key ( source_id, line_nr ) ); `);
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
    run_pipeline(db);
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================
  run_pipeline = function(db) {
    var P, cfg, collector, insert_cmd, insert_line, insert_source, p, row;
    cfg = get_cfg();
    //.........................................................................................................
    insert_source = SQL`insert into sources ( source_path )
  values ( $source_path )
  returning *;`;
    //.........................................................................................................
    insert_line = SQL`insert into lines ( source_id, line_nr, line_text )
  values ( $source_id, $line_nr, $line_text );`;
    //.........................................................................................................
    insert_cmd = SQL`insert into cmds ( source_id, line_nr, cmd_name, cmd_p1 )
  values ( $source_id, $line_nr, $cmd_name, $cmd_p1 );`;
    //.........................................................................................................
    P = {
      //.......................................................................................................
      $db_insert_source: function() {
        return ({source_path}, send) => {
          var source_id;
          // source_id = 1
          ({source_id} = db.alt.first_row(insert_source, {source_path}));
          return send({source_id, source_path});
        };
      },
      //.......................................................................................................
      $walk_lines_with_positions: function() {
        return ({source_id, source_path}, send) => {
          var eol, line_nr, line_text, x;
          for (x of GUY.fs.walk_lines_with_positions(source_path)) {
            ({
              lnr: line_nr,
              line: line_text,
              eol
            } = x);
            send({source_id, line_nr, line_text});
          }
          return null;
        };
      },
      //.......................................................................................................
      $insert_line: function() {
        return (line, send) => {
          // debug 'Ωbrbr___9', line
          db.alt(insert_line, line);
          return send(line);
        };
      },
      //.......................................................................................................
      $parse_cmd: function() {
        return (d, send) => {
          var match;
          if ((match = COMMAND_PARSER.match_line(d.line_text)) == null) {
            return send(d);
          }
          d = {...d, ...match};
          d.cmd_role = d.cmd_slash === '/' ? 'close' : 'open';
          if (d.cmd_disposition == null) {
            d.cmd_disposition = null;
          }
          return send(d);
        };
      },
      //.......................................................................................................
      $insert_cmd: function() {
        return (d, send) => {
          if (d.cmd_name == null) {
            return send(d);
          }
          db.alt(insert_cmd, d);
          return send(d);
        };
      },
      //.......................................................................................................
      $show: function() {
        return (d) => {
          var match;
          // whisper 'Ωbrbr__10', d.source_id, d.line_nr, d.line_text
          if ((match = d.line_text.match(COMMAND_PARSER.internals.patterns.similar)) != null) {
            debug('Ωbrbr__11', GUY.trm.white(GUY.trm.reverse(GUY.trm.bold(d.line_text))), {...match.groups});
          }
          if (d.cmd_name != null) {
            help('Ωbrbr__12', d.cmd_role, d.cmd_pattern, d.cmd_prefix, d.cmd_slash, d.cmd_name, d.cmd_disposition, d.cmd_p1, d.cmd_user_eoi, d.cmd_system_eoi, d.cmd_suffix);
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
    p.push(P.$insert_line());
    p.push(P.$parse_cmd());
    p.push(P.$insert_cmd());
    p.push(P.$show());
    // p.push ( d, send ) -> collector.push d #; help collector
    p.run();
    echo('—————————————————————————————————————————————————————————————————————');
    debug('Ωbrbr__13', "sources:");
    for (row of db(SQL`select * from sources;`)) {
      urge('Ωbrbr__14', row);
    }
    debug('Ωbrbr__15', "lines:");
    for (row of db(SQL`select * from lines limit 10;`)) {
      help('Ωbrbr__16', row);
    }
    debug('Ωbrbr__17', "cmds:");
    for (row of db(SQL`select * from cmds;`)) {
      info('Ωbrbr__18', row);
    }
    //.........................................................................................................
    return null;
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