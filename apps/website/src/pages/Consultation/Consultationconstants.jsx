import { Phone, Video, MapPin, MessageCircle } from "lucide-react";

export const MODE_ICONS = {
  audio: <Phone size={13} />,
  video: <Video size={13} />,
  in_person: <MapPin size={13} />,
  message: <img src="/logo/whatsapp-logo.webp" alt="" className="w-3.5 h-3.5 object-contain" />,
};

export const MODE_LABELS = {
  audio: "Voice Call",
  video: "Video Call",
  in_person: "In-Person",
  message: "WhatsApp Message",
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
