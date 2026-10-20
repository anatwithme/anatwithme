# Room scheduling requirements

Requirements note for issue #102, under parent issue #101. It does not add storage, admin inputs, or student display. Those belong to #103, #104, and #105.

Reviewed against team `main` at `3853143` (merge of pull request #100). Issues #101 and #102 have no sponsor comments. This file separates three kinds of statement:

- **Confirmed requirements** come from the acceptance criteria already written on #101.
- **Confirmed current behavior** is what `main` does today.
- **Proposed rules** are a suggested contract for later issues. They are not sponsor decisions. Open pull requests #155 and #156 already use the same field names; the proposal keeps those names so later work does not invent a second shape.

## Confirmed requirements

From #101, the feature is done only when all of the following are true:

- An administrator can assign a meeting room to a group with a valid start and a valid end.
- That assignment is saved and can be read back.
- A student can see the scheduling information for the room assigned to their group.
- An invalid date/time range is handled, not stored as a successful assignment.
- Room management that already works on `main` still works.
- The new behavior is tested.
- Defects and limitations that remain are written down for the sponsor.

#101 does not choose column names, whether the range is required, how overlaps work, or which time zone to use. Those choices are proposed below and listed again under [Sponsor questions still open](#sponsor-questions-still-open).

## Confirmed current behavior

Room inventory and a group's weekly meeting are separate. No table stores the calendar dates during which a group holds a room.

### What is stored

| Table | Fields that matter | Meaning |
| --- | --- | --- |
| `public.room` | `building`, `room_number`, `group_capacity` | A physical room. Capacity is how many groups may share it in one weekly slot. The assigner treats a null or non-positive capacity as 4. |
| `public.room_day` | `room_id`, `day` | Weekdays the room can be used. `0` is Monday through `4` is Friday. Unique per room and day. |
| `public."group"` | `preference`, `day_of_week`, `meet_start_time`, `meet_end_time`, `room_id`, `room_overbooked` | The weekly meeting. `preference` is `in_person` or `online`. `day_of_week` is `0`–`6`. Meeting times are `time` values, not dates. |

There is no `assignment_start` or `assignment_end` column on `main`.

The database does not force `room_id` to be null for online groups. The write paths do: online groups skip assignment, and an edit that sets preference to online stores `room_id` null and `room_overbooked` false.

### How a room is chosen

`assignRoomsToGroups` in `lib/room-assignment.ts` places in-person groups only. Online groups are skipped and keep a null room.

A slot is `(dayOfWeek, meetStartTime)`. Rooms whose `room_day` includes that weekday contribute `group_capacity` seats (4 when capacity is missing or not positive). Existing in-person groups on that same weekday and start time already occupy seats. Groups are placed in input order into free seats. Further groups are overflow.

- Manual create (`createManualGroup`) calls the assigner with overflow disabled. A full slot leaves `room_id` null and `room_overbooked` false. The admin does not pick a room on create.
- Manual edit can pass a `roomId`. The room must exist and include that weekday. If groups already in that slot, plus this group, exceed capacity, the save still happens and `room_overbooked` is true. With no `roomId`, edit uses the same automatic assigner as create, still with overflow disabled.
- Matching uses the same slot key. It marks `room_overbooked` only when the caller passes `overrideRoomCapacity`.

`loadExistingRoomUsage` does not count groups whose `day_of_week` is outside `0`–`4`, and it does not look at calendar dates. Two groups that meet at the same weekly time conflict even when they would fall in different parts of the semester.

### How it is shown

- Admins, Groups page: in-person groups show `building room_number`, or "No room assigned". Online groups show "Online group". The weekly line is the day plus the start and end clock times.
- Admins, Rooms page: inventory only (building, number, capacity, weekdays). It does not assign a room to a group.
- Students, Group page: Location is `building room_number`, or "To be announced" when no room is joined. Online groups show Format "Online" instead of a location. An overbooked in-person group shows a capacity-override note. The calendar download places the weekly meeting in `America/New_York` and repeats it until the latest enabled agenda `end_date`. It does not read a room-assignment range, because none is stored.

## Proposed rules

Not confirmed by the sponsor. Use these only as the working contract for #103, #104, and #105 until the sponsor answers the questions at the end. If an answer disagrees with this section, the sponsor answer wins.

### Fields

Add two nullable timestamps on `public."group"`:

| Column | Type | Null | Who sets it |
| --- | --- | --- | --- |
| `assignment_start` | `timestamptz` | yes | Admin, in-person groups only |
| `assignment_end` | `timestamptz` | yes | Admin, in-person groups only |

These would be the calendar bounds of the room assignment. They would not replace `day_of_week`, `meet_start_time`, or `meet_end_time`.

- Store UTC timestamps.
- Interpret admin input and student display in `America/New_York`, the zone the calendar download already uses.
- Treat `datetime-local` values as wall times in that zone, not as the browser's zone.
- Online groups store both columns as null.
- Switching a group from in-person to online clears both columns and still clears `room_id`, which the edit path already does.
- Existing rows stay valid with both columns null.

Do not add these columns to `room` or `room_day`. The range belongs to the group's assignment, not to the room's weekly availability.

### Validation

The server (#103) would enforce these rules. The admin form (#104) would show the same failures before submit.

1. An in-person group may omit the range. Both columns null means "no assignment dates," which matches today's behavior.
2. Setting only one of `assignment_start` or `assignment_end` is invalid. Message: "Please enter both assignment dates."
3. `assignment_end` must be strictly after `assignment_start`. Message: "Assignment end must be after assignment start."
4. Unparseable values are invalid. Do not save a partial update.
5. Online groups cannot store a range. Clear any submitted dates.
6. A range does not require a room, and a room does not require a range. An in-person group may save a range while `room_id` is still null.

Messages 2 and 3 match the checks already written on the edit form in pull request #155. That pull request does not persist them.

### Overlap

Keep the current weekly slot key: same `room_id`, same `day_of_week`, same `meet_start_time`.

Also treat two groups as sharing capacity only when their date ranges overlap.

- Ranges overlap when each starts before the other ends. Touching endpoints (`end` equal to the other `start`) do not overlap.
- A null range overlaps every range, including another null range. Legacy rows then keep today's capacity behavior.
- Disjoint ranges on the same weekly slot do not count against each other.
- Capacity and `room_overbooked` use that filtered count. Do not change the numeric capacity rule or the `room_day` weekday check.

Manual create would still not let the admin pick a room. Automatic assignment would use this overlap rule once dates exist. Manual edit with an explicit room would use it when setting `room_overbooked`.

### Handoff to later issues

**#103 Backend.** Add the two columns. Accept them on manual create and manual edit, and persist them only after the validation above. Clear them for online groups. Return them on the group reads that already load `room_id`, meeting times, and room building/number for admins and for the signed-in student's group. Count a group in `loadExistingRoomUsage`, and in matching, only when its range overlaps the candidate. Reject invalid ranges with the messages above and do not write the group row. Leave the weekly seat math in `assignRoomsToGroups` as it is; filter usage before calling it, or filter inside the helper. `test-room-assignment.ts` must still pass, with null ranges standing in for today's dateless usage. Do not change `createRoom`, `updateRoom`, or `deleteRoom`.

**#104 Admin interface.** #104's acceptance criteria require that an administrator can enter a range, save it, and later view and edit it. The proposal is to do that with "Assignment start" and "Assignment end" `datetime-local` inputs on both create and edit, shown only for in-person groups, prepopulated in `America/New_York` on edit. Pull request #155 adds the inputs on edit only, and the server does not read them yet.

**#105 Student display.** For an in-person group with both timestamps saved, show "Room assignment period" with both instants in `America/New_York` (month, day, year, hour, minute). Those instants are the saved values, not a recomputed weekly meeting. If either timestamp is missing, show nothing for the period and leave the location line, including "To be announced" and the overbooked note, unchanged. Online groups do not show the period. Pull request #156 already hides the block when either value is missing, and it currently passes `undefined` until #103 returns the columns.

**#106 Testing.** Out of scope for #102. Cover admin create and edit of a valid range, both invalid cases, reload after save, student display matching the saved instants, legacy null ranges, disjoint ranges, and overlapping ranges. File defects as new issues.

## Sponsor questions still open

No comment on #101 or #102 records a sponsor decision. These are not resolved:

1. Are assignment dates optional for in-person groups, or required for every new in-person assignment? Proposal: optional. #101 says an administrator can assign a range. It does not say every group must have one.
2. Does a null range conflict with every dated assignment in that weekly slot? Proposal: yes, so current capacity checks stay the same for rows that have no dates.
3. Is the end instant exclusive? Proposal: yes. Equal endpoints do not overlap, and the end must be strictly later than the start.
4. Is `America/New_York` the zone for entry and display? Proposal: yes, because the calendar download already uses it. #101 does not name a zone.
5. Should the calendar download stop repeating at `assignment_end` instead of the latest agenda `end_date`? Proposal: no. #101 does not ask for that change.

Later issues should keep this section until the sponsor answers. A sponsor answer replaces the matching proposed rule.
