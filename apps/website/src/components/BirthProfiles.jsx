import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Star, MapPin, X, UserRound } from "lucide-react";
import { useBirthProfileStore, hhmm } from "../store/useBirthProfileStore";
import { useAstrologyStore } from "../store/useAstrologyStore";

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-black/15 text-sm bg-white text-black outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15";

const GENDERS = [
  { value: "", label: "Select" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

/** Place search used by the profile form (same search as the kundli and report forms). */
function PlaceInput({ value, onPick, onType }) {
  const { getGeoDetails } = useAstrologyStore();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  const type = (e) => {
    const text = e.target.value;
    onType(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 2) return setItems([]);
    timer.current = setTimeout(async () => {
      const res = await getGeoDetails({ place: text.trim() });
      const list = res.success && Array.isArray(res.data) ? res.data : [];
      setItems(list);
      setOpen(list.length > 0);
    }, 400);
  };

  return (
    <div className="relative">
      <input className={inputCls} value={value} onChange={type} placeholder="Search city or place..." />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {items.map((item, i) => (
            <button
              type="button"
              key={i}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-black/5"
              onClick={() => {
                onPick(item);
                setOpen(false);
              }}
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-black/40" />
              {item.formattedAddress}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyForm = { id: null, name: "", gender: "", dateOfBirth: "", timeOfBirth: "", placeName: "", latitude: null, longitude: null, timezone: "", isSelf: false };

/** Add or edit one birth profile. */
export function BirthProfileForm({ initial, onClose, onSaved }) {
  const { saveProfile } = useBirthProfileStore();
  const [form, setForm] = useState({ ...emptyForm, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.dateOfBirth || !form.timeOfBirth) return toast.error("Name, date and time of birth are required");
    if (form.latitude === null || form.longitude === null || !form.timezone) return toast.error("Choose the place of birth from the list");
    setSaving(true);
    const body = {
      ...(form.id ? { id: form.id } : {}),
      name: form.name.trim(),
      gender: form.gender || null,
      dateOfBirth: form.dateOfBirth,
      timeOfBirth: `${hhmm(form.timeOfBirth)}:00`,
      placeName: form.placeName,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      timezone: form.timezone,
      isSelf: !!form.isSelf,
    };
    const res = await saveProfile(body);
    setSaving(false);
    if (!res.success) return toast.error(res.error);
    toast.success("Birth profile saved");
    onSaved?.(res.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg text-black">{form.id ? "Edit birth profile" : "Add birth profile"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-black/50 hover:text-black">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-black/60 sm:col-span-2">
            Full name
            <input className={inputCls} value={form.name} onChange={set("name")} maxLength={100} />
          </label>
          <label className="text-xs text-black/60">
            Date of birth
            <input type="date" className={inputCls} value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          </label>
          <label className="text-xs text-black/60">
            Time of birth
            <input type="time" className={inputCls} value={hhmm(form.timeOfBirth)} onChange={set("timeOfBirth")} />
          </label>
          <label className="text-xs text-black/60 sm:col-span-2">
            Place of birth
            <PlaceInput
              value={form.placeName}
              onType={(text) => setForm((p) => ({ ...p, placeName: text, latitude: null, longitude: null, timezone: "" }))}
              onPick={(item) =>
                setForm((p) => ({
                  ...p,
                  placeName: item.formattedAddress,
                  latitude: item.location.latitude,
                  longitude: item.location.longitude,
                  timezone: item.timezone,
                }))
              }
            />
          </label>
          <label className="text-xs text-black/60">
            Gender
            <select className={inputCls} value={form.gender || ""} onChange={set("gender")}>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-black">
            <input type="checkbox" checked={!!form.isSelf} onChange={set("isSelf")} />
            This is me
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-black/15 px-4 py-2 text-sm">
            Cancel
          </button>
          <button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * "My birth profiles" of the account page: the same profiles as in the mobile app.
 * `savedBirthDetails`: birth details an older website account kept on the account itself; they
 * prefill a new "Self" profile (the place has to be chosen from the list to get coordinates).
 */
export function BirthProfilesSection({ savedBirthDetails, accountName }) {
  const { profiles, loaded, fetchProfiles, deleteProfile, saveProfile } = useBirthProfileStore();
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const remove = async (p) => {
    if (!window.confirm(`Delete the birth profile of ${p.name}? Reports already made for it stay in your account.`)) return;
    const res = await deleteProfile(p.id);
    if (!res.success) toast.error(res.error);
  };

  const makeSelf = async (p) => {
    const res = await saveProfile({ id: p.id, isSelf: true });
    if (!res.success) toast.error(res.error);
  };

  const fromSaved = () =>
    setEditing({
      name: accountName || "",
      gender: savedBirthDetails?.gender || "",
      dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(savedBirthDetails?.dob || "") ? savedBirthDetails.dob : "",
      timeOfBirth: savedBirthDetails?.birthTime || "",
      placeName: savedBirthDetails?.birthPlace || "",
      isSelf: true,
    });

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg text-black">My birth profiles</h3>
          <p className="text-xs text-black/50">Used for your reports, kundli and consultations, on the website and in the app.</p>
        </div>
        <button onClick={() => setEditing({ isSelf: profiles.length === 0 })} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm text-white">
          <Plus size={15} /> Add
        </button>
      </div>

      {loaded && profiles.length === 0 && savedBirthDetails && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-black">
          You saved your birth details on your account earlier. Create your birth profile from them in one step.
          <button onClick={fromSaved} className="ml-2 font-medium text-primary underline">
            Create my profile
          </button>
        </div>
      )}

      {loaded && profiles.length === 0 && !savedBirthDetails && <p className="text-sm text-black/50">No birth profiles yet.</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-black">{p.name}</span>
                {p.isSelf && <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">ME</span>}
              </div>
              <div className="text-xs text-black/55">
                {p.dateOfBirth} · {hhmm(p.timeOfBirth)}
              </div>
              <div className="truncate text-xs text-black/55">{p.placeName || "—"}</div>
              {!p.isSelf && (
                <button onClick={() => makeSelf(p)} className="mt-1 flex items-center gap-1 text-xs text-primary">
                  <Star size={12} /> This is me
                </button>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(p)} aria-label="Edit" className="rounded-lg p-1.5 text-black/50 hover:bg-black/5">
                <Pencil size={15} />
              </button>
              <button onClick={() => remove(p)} aria-label="Delete" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && <BirthProfileForm initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/**
 * "Fill from a saved profile" for the report and booking forms. `onPick` gets the profile in
 * the form's own terms: { fullName, dob, timeOfBirth, birthPlace, latitude, longitude, gender }.
 */
export function SavedProfilePicker({ onPick, label = "Fill from a saved birth profile" }) {
  const { profiles, loaded, fetchProfiles } = useBirthProfileStore();

  useEffect(() => {
    if (!loaded) fetchProfiles();
  }, [loaded]);

  if (!profiles.length) return null;

  return (
    <label className="mb-3 block text-xs text-black/60">
      {label}
      <select
        className={inputCls}
        defaultValue=""
        onChange={(e) => {
          const p = profiles.find((x) => x.id === e.target.value);
          if (!p) return;
          onPick({
            id: p.id,
            fullName: p.name,
            dob: p.dateOfBirth,
            timeOfBirth: hhmm(p.timeOfBirth),
            birthPlace: p.placeName || "",
            latitude: String(p.latitude),
            longitude: String(p.longitude),
            gender: p.gender || "",
          });
        }}
      >
        <option value="">Choose a profile…</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.isSelf ? " (me)" : ""} — {p.dateOfBirth}
          </option>
        ))}
      </select>
    </label>
  );
}
