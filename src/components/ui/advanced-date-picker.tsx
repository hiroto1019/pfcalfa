"use client"

import * as React from "react"
import DatePicker from "react-datepicker"
import { ja } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import "react-datepicker/dist/react-datepicker.css"

interface AdvancedDatePickerProps {
  selected?: Date
  onChange?: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showTimeSelect?: boolean
  showTimeSelectOnly?: boolean
  timeIntervals?: number
  dateFormat?: string
  minDate?: Date
  maxDate?: Date
  label?: string
  required?: boolean
  inline?: boolean
  popperPlacement?: string
}

export function AdvancedDatePicker({
  selected,
  onChange,
  placeholder = "日付を選択",
  disabled = false,
  className,
  showTimeSelect = false,
  showTimeSelectOnly = false,
  timeIntervals = 15,
  dateFormat,
  minDate,
  maxDate,
  label,
  required = false,
  inline = false,
  popperPlacement = "bottom-start"
}: AdvancedDatePickerProps) {
  // デフォルトの日付フォーマットを設定
  const defaultDateFormat = showTimeSelect 
    ? "yyyy年MM月dd日 HH:mm"
    : showTimeSelectOnly
    ? "HH:mm"
    : "yyyy年MM月dd日"

  const finalDateFormat = dateFormat || defaultDateFormat

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <DatePicker
          selected={selected}
          onChange={onChange}
          placeholderText={placeholder}
          disabled={disabled}
          showTimeSelect={showTimeSelect}
          showTimeSelectOnly={showTimeSelectOnly}
          timeIntervals={timeIntervals}
          dateFormat={finalDateFormat}
          locale={ja}
          minDate={minDate}
          maxDate={maxDate}
          inline={inline}
          popperPlacement={popperPlacement as any}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
          }) => (
            <div className="flex items-center justify-between p-2 border-b">
              <button
                onClick={decreaseMonth}
                disabled={prevMonthButtonDisabled}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                ←
              </button>
              <span className="font-semibold">
                {date.getFullYear()}年{date.getMonth() + 1}月
              </span>
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
        {!inline && (
          <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        )}
      </div>
    </div>
  )
}

// 日付範囲選択コンポーネント
interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onChange?: (dates: [Date | null, Date | null]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
  label?: string
  required?: boolean
}

export function AdvancedDateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "日付範囲を選択",
  disabled = false,
  className,
  minDate,
  maxDate,
  label,
  required = false
}: DateRangePickerProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <DatePicker
          selectsRange={true}
          startDate={startDate}
          endDate={endDate}
          onChange={onChange}
          placeholderText={placeholder}
          disabled={disabled}
          dateFormat="yyyy年MM月dd日"
          locale={ja}
          minDate={minDate}
          maxDate={maxDate}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "mobile-input-fix",
            className
          )}
          // カスタムスタイル
          calendarClassName="shadow-lg border border-gray-200 rounded-lg"
          dayClassName={date => {
            if (!date) return ""
            const today = new Date()
            const isToday = date.toDateString() === today.toDateString()
            return isToday ? "bg-blue-100 text-blue-900 font-semibold" : ""
          }}
        />
        <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

// 時間選択専用コンポーネント
interface TimePickerProps {
  selected?: Date
  onChange?: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  timeIntervals?: number
  minTime?: Date
  maxTime?: Date
  label?: string
  required?: boolean
}

export function TimePicker({
  selected,
  onChange,
  placeholder = "時間を選択",
  disabled = false,
  className,
  timeIntervals = 15,
  minTime,
  maxTime,
  label,
  required = false
}: TimePickerProps) {
  return (
    <AdvancedDatePicker
      selected={selected}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      showTimeSelect={true}
      showTimeSelectOnly={true}
      timeIntervals={timeIntervals}
      dateFormat="HH:mm"
      label={label}
      required={required}
    />
  )
} 