
/*
CREATE TABLE data(
    file_id int,
    block_num int,
    data blob,
  foreign key (file_id) references metadata(id) on delete cascade,
  primary key (file_id, block_num) )

CREATE TABLE dentry(
    parent_id int,
    child_id int,
    file_type int,
    name text,
  foreign key (parent_id) references metadata(id) on delete cascade,
  foreign key (child_id) references metadata(id) on delete cascade,
  primary key (parent_id, name) )

CREATE TABLE metadata(
  id integer primary key,
  size int default 0 not null,
  atime text,atime_nsec int,
  mtime text,mtime_nsec int,
  ctime text,ctime_nsec int,
  crtime text,crtime_nsec int,
  kind int,
  mode int,
  nlink int default 0 not null,
  uid int default 0,
  gid int default 0,
  rdev int default 0,
  flags int default 0 )

CREATE TABLE xattr(
    file_id int,
    name text,
    value text,
  foreign key (file_id) references metadata(id) on delete cascade,
  primary key (file_id, name) )
*/

-- ---------------------------------------------------------------------------------------------------------
drop table if exists bb_fs_object_types;
create table if not exists bb_fs_object_types (
    kind integer unique not null,
    name text unique,
  primary key ( kind )
);

-- .........................................................................................................
insert into bb_fs_object_types ( kind, name ) values
-- -: normal file
-- d: directory
-- l: symbolic link
-- c character device
-- p pseudo-terminal
-- b for a block device
-- s for a socket
  ( 0x1000, 'namedpipe'   ),
  ( 0x2000, 'chrdevice'   ),
  ( 0x4000, 'folder'      ),
  ( 0x6000, 'blockdevice' ),
  ( 0x8000, 'file'        ),
  ( 0xa000, 'symlink'     ),
  ( 0xc000, 'socket'      )
  on conflict ( kind ) do nothing;

-- ---------------------------------------------------------------------------------------------------------
drop table if exists bb_protocol_prefixes;
create table if not exists bb_protocol_prefixes (
    protocol  text unique not null,
    prefix    text unique not null,
  primary key ( protocol )
);

-- .........................................................................................................
insert into bb_protocol_prefixes ( protocol, prefix ) values
  ( 'https',  'https://'  ),
  ( 'http',   'http://'   ),
  ( 'file',   'file://'   )
  on conflict ( prefix ) do nothing;

-- ---------------------------------------------------------------------------------------------------------
drop table if exists bb_cids;
create table if not exists bb_cids (
    file_id     integer unique not null,
    cid         text,
  foreign key ( file_id ) references metadata( id ) on delete cascade,
  primary key ( file_id ) );

-- ---------------------------------------------------------------------------------------------------------
drop view if exists bb_paths;
create view if not exists bb_paths as with recursive
  bb_path_tree( parent_id, file_id, file_type, name, path ) as (
    -- .....................................................................................................
    -- Base case: top-level entries (parent_id NULL or 0, depending on your schema)
    select
        parent_id     as parent_id,
        child_id      as file_id,
        file_type     as file_type,
        name          as name,
        '/' || name   as path
      from dentry
      where parent_id is 1 and name not in ( '.', '..' )
    -- .....................................................................................................
    union all
    -- .....................................................................................................
    -- Recursive case: append child names to their parent bb_paths
    select
        d.parent_id             as parent_id,
        d.child_id              as file_id,
        d.file_type             as file_type,
        d.name                  as name,
        p.path || '/' || d.name as path
      from dentry       as d
      join bb_path_tree as p on d.parent_id = p.file_id
      where d.name not in ('.', '..') )
-- .........................................................................................................
  select
      q.file_id   as file_id,
      q.parent_id as parent_id,
      e.name      as type,
      q.name      as name,
      q.path      as path
    from bb_path_tree as q
    left join bb_fs_object_types as e on ( q.file_type = e.kind );

-- ---------------------------------------------------------------------------------------------------------
drop view if exists bb_standard_modes;
create view if not exists bb_standard_modes as select
    y.file_id                               as file_id,
    ( y.mode & 0xfffffe00 ) | ( case y.type
      when 'folder' then 0x01fd
      when 'file'   then 0x01b4 end )       as open_mode,
    ( y.mode & 0xfffffe00 ) | ( case y.type
      when 'folder' then 0x016d
      when 'file'   then 0x0124 end )       as closed_mode
  from ( select
      p.file_id as file_id,
      m.mode    as mode,
      p.type    as type
    from      bb_paths  as p
    left join metadata  as m on ( p.file_id = m.id )
    where true
      -- and n.id > 1
      and p.type in ( 'folder', 'file' ) ) as y;

-- ---------------------------------------------------------------------------------------------------------
drop view if exists bb_list;
create view if not exists bb_list as select
    m.id                                as file_id,
    q.parent_id                         as parent_id,
    q.type                              as type,
    format( '0o%06.o', m.mode         ) as mode_o,
    format( '0o%06.o', s.open_mode    ) as open_mode_o,
    format( '0o%06.o', s.closed_mode  ) as closed_mode_o,
    q.name                              as name,
    q.path                              as path
  from      bb_paths          as q
  left join metadata          as m on ( q.file_id = m.id )
  left join bb_standard_modes as s using ( file_id )
  order by q.path;

-- ---------------------------------------------------------------------------------------------------------
drop table if exists bb_cids;
create table if not exists bb_cids (
    file_id     integer unique not null,
    cid         text,
  foreign key ( file_id ) references metadata( id ) on delete cascade,
  primary key ( file_id ) );

-- select * from bb_standard_modes;
-- select * from bb_list;
