"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface DecimalInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  value: number | "";
  onChange: (value: number) => void;
}

function DecimalInput({ value, onChange, ...props }: DecimalInputProps) {
  const [localValue, setLocalValue] = React.useState<string>(
    value === "" || value === 0 ? "" : String(value)
  );

  // Sync from parent when the value changes externally
  const prevValueRef = React.useRef(value);
  React.useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      const newStr = value === "" || value === 0 ? "" : String(value);
      // Only update if the numeric values differ (preserve intermediate states like "5575.")
      if (Number(localValue) !== value || localValue === "") {
        setLocalValue(newStr);
      }
    }
  }, [value, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty, digits, and one decimal point
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      setLocalValue(raw);
      const num = Number(raw);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };

  const handleBlur = () => {
    // Normalize the display value on blur
    if (localValue === "" || localValue === ".") {
      setLocalValue("");
      onChange(0);
    } else {
      const num = Number(localValue);
      setLocalValue(num === 0 ? "" : String(num));
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}

export { DecimalInput };
