-- Meeting-room assignment bounds for a group.
-- Null on both columns means the group has no assignment dates.

alter table public."group"
  add column if not exists assignment_start timestamptz;

alter table public."group"
  add column if not exists assignment_end timestamptz;

alter table public."group"
  drop constraint if exists group_assignment_range_check;

alter table public."group"
  add constraint group_assignment_range_check check (
    (
      assignment_start is null
      and assignment_end is null
    )
    or (
      assignment_start is not null
      and assignment_end is not null
      and assignment_end > assignment_start
    )
  );

alter table public."group"
  drop constraint if exists group_online_assignment_clear_check;

alter table public."group"
  add constraint group_online_assignment_clear_check check (
    preference is distinct from 'online'
    or (
      assignment_start is null
      and assignment_end is null
    )
  );
