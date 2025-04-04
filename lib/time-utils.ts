// Parse a time string (HH:MM) to a Date object, assuming tomorrow if the time has passed today
export function parseTimeToDate(timeString: string): Date {
  const [hours, minutes] = timeString.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)

  // If the calculated date/time is earlier than the current date/time,
  // assume the user means this time tomorrow.
  if (date.getTime() < new Date().getTime()) {
    date.setDate(date.getDate() + 1)
  }

  return date
}

// Format a Date object to a time string (HH:MM)
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

// Add minutes to a Date object
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

// Calculate the difference between two times in minutes
export function getTimeDifferenceInMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000)
}

