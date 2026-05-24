import React, { useState, useEffect } from 'react';

interface SafeNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  placeholder?: string;
  step?: string;
}

export default function SafeNumberInput({
  value,
  onChange,
  placeholder = "",
  step = "0.1",
  className = "",
  ...props
}: SafeNumberInputProps) {
  // Local string state to keep user keystrokes intact (e.g. "1.", "0.0", "", "-")
  const [localValue, setLocalValue] = useState<string>(
    value === null || value === undefined ? '' : String(value)
  );
  const [isFocused, setIsFocused] = useState(false);

  // Sync state with props when value changes from outside (only if not focused)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value === null || value === undefined ? '' : String(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setLocalValue(rawVal);

    if (rawVal === '') {
      onChange(null);
    } else {
      const parsed = parseFloat(rawVal);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // Force format on blur to ensure they see the finalized visual representation
    setLocalValue(value === null || value === undefined ? '' : String(value));
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <input
      {...props}
      type="number"
      step={step}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
}
