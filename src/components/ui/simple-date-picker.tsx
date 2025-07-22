"use client"

import * as React from "react"
import DatePicker from "react-datepicker"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import "react-datepicker/dist/react-datepicker.css"

interface SimpleDatePickerProps {
  value?: Date
  onChange?: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  allowFuture?: boolean
  maxYearOffset?: number
}

export function SimpleDatePicker({
  value,
  onChange,
  placeholder = "日付を選択",
  disabled = false,
  className,
  allowFuture = false,
  maxYearOffset = 100
}: SimpleDatePickerProps) {
  return (
    <DatePicker
      selected={value}
      onChange={onChange}
      placeholderText={placeholder}
      disabled={disabled}
      dateFormat="yyyy年MM月dd日"
      locale={ja}
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      yearDropdownItemNumber={maxYearOffset}
      scrollableYearDropdown
      className={cn(
        "flex h-10 w-full min-w-0 max-w-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "mobile-input-fix",
        className
      )}
      // カスタムスタイル
      calendarClassName="shadow-lg border border-gray-200 rounded-lg"
      dayClassName={date => {
        const today = new Date()
        const isToday = date && date.toDateString() === today.toDateString()
        return isToday ? "bg-blue-100 text-blue-900 font-semibold" : ""
      }}
      // カスタムヘッダー
      renderCustomHeader={({
        date,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
        changeYear,
        changeMonth,
      }) => (
        <div className="flex items-center justify-between p-2 border-b">
          <button
            onClick={decreaseMonth}
            disabled={prevMonthButtonDisabled}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <select
              value={date.getFullYear()}
              onChange={({ target: { value } }) => changeYear(Number(value))}
              className="text-sm border rounded px-1 py-0.5"
            >
              {Array.from({ length: maxYearOffset }, (_, i) => {
                const currentYear = new Date().getFullYear()
                const year = allowFuture ? currentYear + Math.floor(maxYearOffset / 2) - i : currentYear - i
                return year
              }).map(year => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
            <select
              value={date.getMonth()}
              onChange={({ target: { value } }) => changeMonth(Number(value))}
              className="text-sm border rounded px-1 py-0.5"
            >
              {Array.from({ length: 12 }, (_, i) => i).map(month => (
                <option key={month} value={month}>
                  {month + 1}月
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={increaseMonth}
            disabled={nextMonthButtonDisabled}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}
    />
  )
} 