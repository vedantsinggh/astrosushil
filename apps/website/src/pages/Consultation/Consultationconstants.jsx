import { Phone, Video, MapPin } from "lucide-react";

export const MODE_ICONS = {
  audio: <Phone size={13} />,
  video: <Video size={13} />,
  in_person: <MapPin size={13} />,
};

export const MODE_LABELS = {
  audio: "Voice Call",
  video: "Video Call",
  in_person: "In-Person",
};

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** ₹ formatted amount */
export function fmt(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}
