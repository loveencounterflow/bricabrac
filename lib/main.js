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
cmd_position            text    not null,
cmd_p1                  text    not null,
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
    debug('Ωbrbr___9', get_pipeline(db));
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================
  get_pipeline = function(db) {
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
    insert_cmd = SQL`insert into cmds ( source_id, line_nr, cmd_name, cmd_position, cmd_p1 )
  values ( $source_id, $line_nr, $cmd_name, $cmd_position, $cmd_p1 );`;
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
          debug('Ωbrbr__10', line);
          db.alt(insert_line, line);
          return send(line);
        };
      },
      //.......................................................................................................
      $parse_cmd: function() {
        return (d, send) => {
          var groups, pattern_name;
          ({pattern_name, groups} = COMMAND_PARSER.match_line(d.line_text));
          if (groups != null) {
            if (pattern_name === 'generic') {
              null;
            } else {
              d.dsc = groups;
            }
          }
          // debug 'Ωbrbr__11', lnr, pattern_name, { groups.groups..., } if groups?
          return send(d);
        };
      },
      //.......................................................................................................
      $insert_cmd: function() {
        return (d, send) => {
          var cmd_name, cmd_p1, cmd_position, dsc, line_nr, source_id;
          if (d.dsc == null) {
            return send(d);
          }
          ({source_id, line_nr, dsc} = d);
          ({cmd_name, cmd_position, cmd_p1} = dsc);
          /* TAINT this shoud be done by type handling, casting */
          if (cmd_position == null) {
            cmd_position = 'below';
          }
          db.alt(insert_cmd, {source_id, line_nr, cmd_name, cmd_position, cmd_p1});
          return send(d);
        };
      },
      //.......................................................................................................
      $show: function() {
        return (d) => {
          var startstop;
          whisper('Ωbrbr__12', d.source_id, d.line_nr, d.line_text);
          if (d.dsc != null) {
            debug('Ωbrbr__13', rpr(d.dsc.slash));
            startstop = d.dsc.slash === '' ? 'start' : 'stop';
            help('Ωbrbr__14', d.dsc.prefix, startstop, d.dsc.command, d.dsc.position, d.dsc.p1, d.dsc.suffix);
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
    for (row of db(SQL`select * from sources;`)) {
      urge('Ωbrbr__15', row);
    }
    for (row of db(SQL`select * from lines limit 10;`)) {
      help('Ωbrbr__16', row);
    }
    for (row of db(SQL`select * from cmds;`)) {
      info('Ωbrbr__16', row);
    }
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