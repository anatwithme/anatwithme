"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { 
  fromZonedTime,
  formatInTimeZone,
  toZonedTime,
 } from "date-fns-tz";

const TIME_ZONE = "America/New_York";

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsEasternDateTime(date: Date) {
  return formatInTimeZone(date, TIME_ZONE, "yyyyMMdd'T'HHmmss");
}

function formatIcsUntilDate(dateString: string) {
  const easternEndOfDay = `${dateString}T23:59:59`;

  const endOfDayUtc = fromZonedTime(easternEndOfDay, "America/New_York");

  return endOfDayUtc
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function formatIcsUtcDateTime(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function getNextMeetingDate(dayOfWeek: number, timeString: string) {
  const now = new Date();
  const easternNow = toZonedTime(now, TIME_ZONE);

  // Database uses Monday = 0, JS uses Sunday = 0
  const targetJsDay = (dayOfWeek + 1) % 7;

  const [hour, minute] = timeString.split(":").map(Number);

  const meeting = new Date(easternNow);
  meeting.setHours(hour, minute, 0, 0);

  let daysUntil = (targetJsDay - easternNow.getDay() + 7) % 7;

  if (daysUntil === 0 && meeting <= easternNow) {
    daysUntil = 7;
  }

  meeting.setDate(meeting.getDate() + daysUntil);

  const meetingString = [
    meeting.getFullYear(),
    String(meeting.getMonth() + 1).padStart(2, "0"),
    String(meeting.getDate()).padStart(2, "0"),
  ].join("-") + `T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

  return fromZonedTime(meetingString, TIME_ZONE);
}

function getMeetingEndDate(start: Date, endTimeString: string) {
  const meetingDate = formatInTimeZone(start, TIME_ZONE, "yyyy-MM-dd");

  const [hour, minute] = endTimeString.split(":").map(Number);

  return fromZonedTime(
    `${meetingDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
    TIME_ZONE,
  );
}

export async function generateGroupCalendarEvent() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("member_of")
    .select("group_id")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error("You are not currently assigned to a group.");
  }

  const { data: group, error: groupError } = await supabase
    .from("group")
    .select(`
      id,
      day_of_week,
      meet_start_time,
      meet_end_time,
      preference,
      room (
          building,
          room_number
      )
    `)
    .eq("id", membership.group_id)
    .single();

  if (groupError || !group) {
    throw new Error("Unable to load your group.");
  }

  const { data: finalAgenda, error: agendaError } = await supabase
    .from("agenda")
    .select("end_date")
    .eq("enabled", true)
    .not("end_date", "is", null)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (agendaError) {
    console.error("[Group Calendar] Error fetching final agenda.", agendaError);
    throw new Error("Error fetching semester end date.");
  }

  const start = getNextMeetingDate(
    group.day_of_week,
    group.meet_start_time,
  );

  const end = getMeetingEndDate(start, group.meet_end_time);

  if (!finalAgenda?.end_date) {
    throw new Error("No enabled agenda with an end date was found.");
  }

  const semesterEnd = fromZonedTime(`${finalAgenda.end_date}T23:59:59`, TIME_ZONE);

  if (start > semesterEnd) {
    throw new Error("There are no remaining group review sessions before the final agenda week ends.");
  }

  const room = Array.isArray(group.room) ? group.room[0] : group.room;

  const location = 
    group.preference === "online"
      ? "Online"
      : room
        ? `${room.building} ${room.room_number}`
        : "To be announced";

  const uid = `${group.id}-${user.id}@anatwithme`;

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//AnatWithMe//Group Meeting//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtcDateTime(new Date())}`,
    `DTSTART;TZID=America/New_York:${formatIcsEasternDateTime(start)}`,
    `DTEND;TZID=America/New_York:${formatIcsEasternDateTime(end)}`,
    `RRULE:FREQ=WEEKLY;UNTIL=${formatIcsUntilDate(finalAgenda.end_date)}`,
    `SUMMARY:${escapeIcsText("AnatWithMe Group Review Session")}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText("Weekly anatomy study group review session.")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    filename: "anatwithme-group-meeting.ics",
    content: calendar,
  };
}