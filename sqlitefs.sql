
/*
CREATE TABLE sqlitefs_data(
    file_id int,
    block_num int,
    data blob,
  foreign key (file_id) references sqlitefs_metadata(id) on delete cascade,
  primary key (file_id, block_num) )

CREATE TABLE sqlitefs_dentry(
    parent_id int,
    child_id int,
    file_type int,
    name text,
  foreign key (parent_id) references sqlitefs_metadata(id) on delete cascade,
  foreign key (child_id) references sqlitefs_metadata(id) on delete cascade,
  primary key (parent_id, name) )

CREATE TABLE sqlitefs_metadata(
  id integer primary key,
  size int default 0 not null,
  atime text,atime_nsec int,
  mtime text,mtime_nsec int,
  ctime text,ctime_nsec int,
  crtime text,crtime_nsec int,
  kind int,mode int,
  nlink int default 0 not null,
  uid int default 0,
  gid int default 0,
  rdev int default 0,
  flags int default 0 )

CREATE TABLE sqlitefs_xattr(
    file_id int,
    name text,
    value text,
  foreign key (file_id) references sqlitefs_metadata(id) on delete cascade,
  primary key (file_id, name) )
*/

-- ---------------------------------------------------------------------------------------------------------
create table if not exists fs_object_types (
    kind integer unique not null,
    name text unique,
  primary key ( kind )
);

-- .........................................................................................................
insert into fs_object_types ( kind, name ) values
  ( 0x1000, 'namedpipe'   ),
  ( 0x2000, 'chrdevice'   ),
  ( 0x4000, 'folder'      ),
  ( 0x6000, 'blockdevice' ),
  ( 0x8000, 'file'        ),
  ( 0xa000, 'symlink'     ),
  ( 0xc000, 'socket'      )
  on conflict ( kind ) do nothing;

-- ---------------------------------------------------------------------------------------------------------
create table if not exists protocol_prefixes (
    protocol  text unique not null,
    prefix    text unique not null,
  primary key ( protocol )
);

-- .........................................................................................................
insert into protocol_prefixes ( protocol, prefix ) values
  ( 'https',  'https://'  ),
  ( 'http',   'http://'   ),
  ( 'file',   'file://'   )
  on conflict ( prefix ) do nothing;

-- ---------------------------------------------------------------------------------------------------------
-- drop view paths;
create view if not exists paths as with recursive
  path_tree( parent_id, file_id, file_type, name, path ) as (
    -- .....................................................................................................
    -- Base case: top-level entries (parent_id NULL or 0, depending on your schema)
    select
        parent_id     as parent_id,
        child_id      as file_id,
        file_type     as file_type,
        name          as name,
        '/' || name   as path
      from sqlitefs_dentry
      where parent_id is 1 and name not in ( '.', '..' )
    -- .....................................................................................................
    union all
    -- .....................................................................................................
    -- Recursive case: append child names to their parent paths
    select
        d.parent_id             as parent_id,
        d.child_id              as file_id,
        d.file_type             as file_type,
        d.name                  as name,
        p.path || '/' || d.name as path
      from sqlitefs_dentry  as d
      join path_tree        as p on d.parent_id = p.file_id
      where d.name not in ('.', '..') )
-- .........................................................................................................
select
    q.file_id   as file_id,
    q.parent_id as parent_id,
    e.name      as type,
    q.name      as name,
    q.path      as path
  from path_tree as q
  left join fs_object_types as e on ( q.file_type = e.kind );

-- ---------------------------------------------------------------------------------------------------------
-- drop view cids;
create table if not exists cids (
    file_id     integer unique not null,
    cid         text,
  foreign key ( file_id ) references sqlitefs_metadata( id ) on delete cascade,
  primary key ( file_id ) );


