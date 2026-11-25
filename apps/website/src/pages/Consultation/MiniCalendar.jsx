import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DAYS, MONTHS } from "./Consultationconstants";

export default function MiniCalendar({
  selected,
  onSelect,
  blockedDates = [],
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const canGoPrev =
    new Date(year, month - 1, 1) >=
    new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext =
    new Date(year, month + 1, 1) <=
    new Date(today.getFullYear(), today.getMonth() + 3, 1);

  return (
    <div className="w-full select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary/40 text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="font-heading font-bold text-primary text-sm">
          {MONTHS[month]} {year}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          disabled={!canGoNext}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary/40 text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-body font-semibold text-black/30 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const cellDate = new Date(year, month, day);
          const dateStr = cellDate.toISOString().split("T")[0];
          const isPast = cellDate < today;
          const isTooFar = cellDate > maxDate;
          const isSunday = cellDate.getDay() === 0;
          const isBlocked = blockedDates.includes(dateStr);
          const isDisabled = isPast || isTooFar || isSunday || isBlocked;

          const isSelected =
            selected &&
            selected.getDate() === day &&
            selected.getMonth() === month &&
            selected.getFullYear() === year;

          const isToday = cellDate.getTime() === today.getTime();

          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(new Date(year, month, day))}
              className={`relative mx-auto w-8 h-8 rounded-full flex items-center justify-center text-xs font-body font-medium transition-all duration-150
                ${isDisabled ? "text-black/20 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected ? "bg-primary text-white shadow-md shadow-primary/30 scale-110 font-bold" : ""}
                ${isToday && !isSelected ? "ring-1 ring-primary/50 text-primary font-bold" : ""}
                ${!isSelected && !isDisabled ? "text-black/70" : ""}
                ${isBlocked && !isPast ? "bg-red-50 text-red-300" : ""}`}
            >
              {day}
              {isToday && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
