"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimePickerButtonProps {
  /** "HH:mm" or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show a "ล้าง" button that clears the value (for optional times). */
  clearable?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const QUICK_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string): { hour: number | null; minute: number | null } {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return { hour: null, minute: null };
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/**
 * Click-to-pick time: quick chips for the usual office hours, then an hour grid
 * and a 5-minute grid, so nobody has to type digits into a time input.
 */
export function TimePickerButton({
  value,
  onChange,
  placeholder = "เลือกเวลา",
  clearable = false,
}: TimePickerButtonProps) {
  const [open, setOpen] = useState(false);
  const { hour, minute } = parse(value);

  function pickHour(h: number) {
    onChange(`${pad(h)}:${pad(minute ?? 0)}`);
  }
  function pickMinute(m: number) {
    onChange(`${pad(hour ?? 9)}:${pad(m)}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal tabular-nums",
            !value && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-3" align="start">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TIMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors hover:bg-muted",
                  value === t && "border-primary bg-primary text-primary-foreground hover:bg-primary"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">ชั่วโมง</div>
            <div className="grid grid-cols-6 gap-1">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => pickHour(h)}
                  className={cn(
                    "h-8 rounded-md border text-sm tabular-nums transition-colors hover:bg-muted",
                    h === hour && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                    (h < 7 || h > 20) && h !== hour && "text-muted-foreground"
                  )}
                >
                  {pad(h)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">นาที</div>
            <div className="grid grid-cols-6 gap-1">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMinute(m)}
                  className={cn(
                    "h-8 rounded-md border text-sm tabular-nums transition-colors hover:bg-muted",
                    m === minute && hour !== null && "border-primary bg-primary text-primary-foreground hover:bg-primary"
                  )}
                >
                  :{pad(m)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm tabular-nums">
              {value ? `เลือก: ${value} น.` : "กดชั่วโมง แล้วกดนาที"}
            </span>
            <div className="flex gap-1">
              {clearable && value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  ล้าง
                </Button>
              )}
              <Button type="button" size="sm" onClick={() => setOpen(false)} disabled={!value}>
                ตกลง
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
