"use client"

import type React from "react"

import { forwardRef, useState } from "react"
import { Input } from "@/components/ui/input"

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string
  onChange?: (value: string) => void
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(({ value = "", onChange, ...props }, ref) => {
  const [internalValue, setInternalValue] = useState(value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  return (
    <Input ref={ref} type="time" value={value || internalValue} onChange={handleChange} className="w-full" {...props} />
  )
})

TimeInput.displayName = "TimeInput"

