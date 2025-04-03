"use client"

import type React from "react"
import { forwardRef } from "react"
import { Input } from "@/components/ui/input"

// Use the standard Input props type, as we are just wrapping it
type TimeInputProps = React.InputHTMLAttributes<HTMLInputElement>

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>((props, ref) => {
  return (
    // Pass all props directly to the Input component
    // Set type="time" and add default className
    <Input ref={ref} type="time" className="w-full" {...props} />
  )
})

TimeInput.displayName = "TimeInput"

