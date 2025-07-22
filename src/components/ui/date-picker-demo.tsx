"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker, DateInput, DateRangePicker } from "./date-picker"
import { AdvancedDatePicker, AdvancedDateRangePicker, TimePicker } from "./advanced-date-picker"

export function DatePickerDemo() {
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedDateString, setSelectedDateString] = useState("")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [advancedDate, setAdvancedDate] = useState<Date | null>(null)
  const [advancedDateRange, setAdvancedDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">日付選択コンポーネント デモ</h1>
        <p className="text-gray-600">様々な日付選択コンポーネントの使用例</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 基本的な日付選択（react-day-picker使用） */}
        <Card>
          <CardHeader>
            <CardTitle>基本的な日付選択</CardTitle>
            <CardDescription>react-day-pickerを使用したポップオーバー型</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="日付を選択してください"
            />
            <div className="text-sm text-gray-600">
              選択された日付: {selectedDate ? selectedDate.toLocaleDateString('ja-JP') : '未選択'}
            </div>
          </CardContent>
        </Card>

        {/* シンプルな日付入力（HTML input使用） */}
        <Card>
          <CardHeader>
            <CardTitle>シンプルな日付入力</CardTitle>
            <CardDescription>HTML input[type="date"]を使用（モバイル対応）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DateInput
              label="生年月日"
              value={selectedDateString}
              onChange={setSelectedDateString}
              required={true}
              max={new Date().toISOString().split('T')[0]}
            />
            <div className="text-sm text-gray-600">
              選択された日付: {selectedDateString || '未選択'}
            </div>
          </CardContent>
        </Card>

        {/* 日付範囲選択（react-day-picker使用） */}
        <Card>
          <CardHeader>
            <CardTitle>日付範囲選択</CardTitle>
            <CardDescription>react-day-pickerを使用した範囲選択</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onSelect={setDateRange}
              placeholder="日付範囲を選択してください"
            />
            <div className="text-sm text-gray-600">
              選択された範囲: {
                dateRange.from && dateRange.to 
                  ? `${dateRange.from.toLocaleDateString('ja-JP')} - ${dateRange.to.toLocaleDateString('ja-JP')}`
                  : '未選択'
              }
            </div>
          </CardContent>
        </Card>

        {/* 高度な日付選択（react-datepicker使用） */}
        <Card>
          <CardHeader>
            <CardTitle>高度な日付選択</CardTitle>
            <CardDescription>react-datepickerを使用したカスタマイズ可能な選択</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdvancedDatePicker
              selected={advancedDate || undefined}
              onChange={setAdvancedDate}
              placeholder="高度な日付選択"
              showTimeSelect={true}
              timeIntervals={30}
            />
            <div className="text-sm text-gray-600">
              選択された日時: {advancedDate ? advancedDate.toLocaleString('ja-JP') : '未選択'}
            </div>
          </CardContent>
        </Card>

        {/* 高度な日付範囲選択（react-datepicker使用） */}
        <Card>
          <CardHeader>
            <CardTitle>高度な日付範囲選択</CardTitle>
            <CardDescription>react-datepickerを使用した範囲選択</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdvancedDateRangePicker
              startDate={advancedDateRange[0] || undefined}
              endDate={advancedDateRange[1] || undefined}
              onChange={setAdvancedDateRange}
              placeholder="高度な日付範囲選択"
            />
            <div className="text-sm text-gray-600">
              選択された範囲: {
                advancedDateRange[0] && advancedDateRange[1]
                  ? `${advancedDateRange[0].toLocaleDateString('ja-JP')} - ${advancedDateRange[1].toLocaleDateString('ja-JP')}`
                  : '未選択'
              }
            </div>
          </CardContent>
        </Card>

        {/* 時間選択 */}
        <Card>
          <CardHeader>
            <CardTitle>時間選択</CardTitle>
            <CardDescription>時間のみを選択するコンポーネント</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TimePicker
              selected={selectedTime || undefined}
              onChange={setSelectedTime}
              placeholder="時間を選択"
              timeIntervals={15}
            />
            <div className="text-sm text-gray-600">
              選択された時間: {selectedTime ? selectedTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '未選択'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 使用例の説明 */}
      <Card>
        <CardHeader>
          <CardTitle>各コンポーネントの特徴</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">DatePicker（react-day-picker）</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 軽量でカスタマイズ可能</li>
                <li>• ポップオーバー型のUI</li>
                <li>• 既存のUIコンポーネントと統一感</li>
                <li>• 日本語対応</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">DateInput（HTML input）</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• ネイティブの日付選択UI</li>
                <li>• モバイルでの使いやすさ</li>
                <li>• 軽量で高速</li>
                <li>• アクセシビリティが高い</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">AdvancedDatePicker（react-datepicker）</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 豊富なカスタマイズオプション</li>
                <li>• 時間選択も可能</li>
                <li>• 高度なフィルタリング機能</li>
                <li>• 日本語対応</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">使用場面の推奨</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• フォーム入力: DateInput</li>
                <li>• ダッシュボード: DatePicker</li>
                <li>• 高度な機能: AdvancedDatePicker</li>
                <li>• 時間選択: TimePicker</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 