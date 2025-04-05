// Parse a time string (HH:MM) to a Date object, assuming tomorrow if the time has passed today
// Returns null if the input string is not in the expected format.
export function parseTimeToDate(timeString: string | null | undefined): Date | null {
  if (!timeString || !/^\d{1,2}:\d{2}$/.test(timeString)) {
    return null;
  }
  
  try {
    const [hours, minutes] = timeString.split(":").map(Number);
    
    // Basic validation for hours and minutes
    if (isNaN(hours) || hours < 0 || hours > 23 || isNaN(minutes) || minutes < 0 || minutes > 59) {
      return null;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    // If the calculated date/time is earlier than the current date/time,
    // assume the user means this time tomorrow.
    if (date.getTime() < new Date().getTime()) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  } catch (error) {
    return null;
  }
}

// Format a Date object to a 12-hour time string (hh:mm A)
// Returns a fallback string if the input Date is invalid.
export function formatTime(date: Date | null): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "--:-- --";
  }
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = (hours % 12) === 0 ? 12 : hours % 12;
  return `${formattedHours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}

// Format a Date object to a 24-hour time string (HH:MM) suitable for <input type="time">
export function formatTimeForInput(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Parse a 12-hour time string (hh:mm A) to a Date object
export function parse12HourTimeToDate(timeString: string): Date | null {
  const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let [, hoursStr, minutesStr, ampm] = match;
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (ampm.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Convert a 12-hour time string (hh:mm A) to 24-hour (HH:MM)
export function convertTo24Hour(timeString12hr: string): string | null {
  const date = parse12HourTimeToDate(timeString12hr);
  if (!date) return null;
  return formatTimeForInput(date);
}

// Add minutes to a Date object
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

// Calculate the difference between two times in minutes
export function getTimeDifferenceInMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

// Get the current time rounded up to the nearest 15-minute interval in the future
export function getNearestFuture15Min(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const minutesToAdd = 15 - (minutes % 15);
  
  // Add the calculated minutes plus a small buffer (1 sec) to ensure it's always in the future
  const futureTime = new Date(now.getTime() + minutesToAdd * 60000 + 1000); 

  return formatTimeForInput(futureTime);
}

// Get the default arrival time (current time + 1 hour, rounded up to nearest 15 min)
export function getDefaultArrivalTime(): string {
  const now = new Date();
  // Add 1 hour
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const minutes = oneHourLater.getMinutes();
  const minutesToAdd = (15 - (minutes % 15)) % 15; // Round up to nearest 15, handle 0 case

  // Calculate the final default arrival time
  const defaultArrival = new Date(oneHourLater.getTime() + minutesToAdd * 60000);

  return formatTimeForInput(defaultArrival);
}

