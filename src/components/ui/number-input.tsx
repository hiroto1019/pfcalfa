import * as React from "react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react";

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: number | null | string;
  onChange: (value: number | null | string) => void;
  placeholder?: string;
  className?: string;
  allowString?: boolean; // 文字列を許可するかどうか
}

function NumberInput({ 
  value, 
  onChange, 
  placeholder = "", 
  className, 
  onFocus,
  onBlur,
  allowString = false,
  ...props 
}: NumberInputProps) {
  const [internalValue, setInternalValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastExternalValue = useRef<number | null | string>(value);

  // 外部からの値の変更を監視
  useEffect(() => {
    if (!isFocused && value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      if (value === null || value === 0 || value === "") {
        setInternalValue("");
      } else {
        setInternalValue(value.toString());
      }
    }
  }, [value, isFocused]);

  // 初期値の設定
  useEffect(() => {
    if (value === null || value === 0 || value === "") {
      setInternalValue("");
    } else {
      setInternalValue(value.toString());
    }
    lastExternalValue.current = value;
  }, []);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // フォーカス時に全選択
    setTimeout(() => {
      e.target.select();
    }, 0);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    
    const trimmedValue = internalValue.trim();
    
    if (trimmedValue === "") {
      // 空の場合はnull
      onChange(null);
      setInternalValue("");
    } else {
      const numValue = parseFloat(trimmedValue);
      if (!isNaN(numValue) && isFinite(numValue)) {
        // 有効な数値の場合
        if (allowString) {
          onChange(trimmedValue); // 文字列として返す
        } else {
          onChange(numValue); // 数値として返す
        }
        setInternalValue(numValue.toString());
      } else {
        // 無効な値の場合は元の値に戻す
        if (value === null || value === 0 || value === "") {
          setInternalValue("");
        } else {
          setInternalValue(value.toString());
        }
      }
    }
    
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enterキーでフォーカスを外す
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="number"
      data-slot="number-input"
      value={internalValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { NumberInput } 