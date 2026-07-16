"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsLocalDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hour}${minute}${second}`;
}

function getNextMeetingDate(dayOfWeek: number, timeString: string,) {
  const now = new Date();

  // Database uses Monday = 0, JS uses Sunday = 0
  const targetJsDay = (dayOfWeek + 1) % 7;

  const [hour, minute] = timeString.split(":").map(Number);

  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);

  let daysUntil = (targetJsDay - now.getDay() + 7) % 7;

  if (daysUntil === 0 && result <= now) {
    daysUntil = 7;
  }

  result.setDate(result.getDate() + daysUntil);

  return result;
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

  const start = getNextMeetingDate(
    group.day_of_week,
    group.meet_start_time,
  );

  const end = new Date(start);
  const [endHour, endMinute] = group.meet_end_time
    .split(":")
    .map(Number);
  
  end.setHours(endHour, endMinute, 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
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
    `DTSTAMP:${formatIcsLocalDateTime(new Date())}`,
    `DTSTART;TZIOD=America/New_York:${formatIcsLocalDateTime(start)}`,
    `DTEND;TZID=America/New_York:${formatIcsLocalDateTime(end)}`,
    "RRULE:FREQ=WEEKLY",
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