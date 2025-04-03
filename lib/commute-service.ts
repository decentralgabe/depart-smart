"use server"

import { parseTimeToDate, formatTime, addMinutes } from "./time-utils"

// This function calculates the optimal departure time based on the given constraints
export async function calculateOptimalDepartureTime(
  homeAddress: string,
  workAddress: string,
  earliestDeparture: string,
  latestArrival: string,
  homePlaceId?: string,
  workPlaceId?: string,
) {
  try {
    // Validate addresses by geocoding them (if we don't have place IDs)
    if (!homePlaceId || !workPlaceId) {
      const [homeGeocode, workGeocode] = await Promise.all([geocodeAddress(homeAddress), geocodeAddress(workAddress)])

      if (!homeGeocode || !workGeocode) {
        throw new Error("Failed to geocode one or both addresses. Please check and try again.")
      }
    }

    // Parse time strings to Date objects
    const earliestDepartureDate = parseTimeToDate(earliestDeparture)
    const latestArrivalDate = parseTimeToDate(latestArrival)

    // Calculate the time window in minutes
    const timeWindowInMinutes = (latestArrivalDate.getTime() - earliestDepartureDate.getTime()) / (60 * 1000)

    if (timeWindowInMinutes <= 0) {
      throw new Error("Latest arrival time must be after earliest departure time")
    }

    // Generate departure time options at 15-minute intervals
    const departureTimeOptions = []
    let currentDepartureTime = new Date(earliestDepartureDate)

    // Limit the number of API calls to avoid rate limiting
    const maxApiCalls = Math.min(Math.ceil(timeWindowInMinutes / 15), 12) // Max 12 calls (3 hours)
    let apiCallCount = 0

    while (currentDepartureTime <= latestArrivalDate && apiCallCount < maxApiCalls) {
      try {
        const routeInfo = await estimateTravelTime(homeAddress, workAddress, currentDepartureTime)

        // Calculate estimated arrival time
        const arrivalTime = new Date(currentDepartureTime.getTime() + routeInfo.durationInSeconds * 1000)

        // Only include options that arrive before the latest arrival time
        if (arrivalTime <= latestArrivalDate) {
          departureTimeOptions.push({
            departureTime: formatTime(currentDepartureTime),
            arrivalTime: formatTime(arrivalTime),
            durationInTraffic: routeInfo.durationInSeconds,
            trafficCondition: mapTrafficCondition(routeInfo.trafficCondition),
            distanceInMeters: routeInfo.distanceInMeters,
          })
        }
      } catch (error) {
        console.error("Error estimating travel time for departure at", formatTime(currentDepartureTime), error)
        // Continue with the next time slot even if this one fails
      }

      // Move to next 15-minute interval
      currentDepartureTime = addMinutes(currentDepartureTime, 15)
      apiCallCount++
    }

    // If we couldn't get any valid options, fall back to simulated data
    if (departureTimeOptions.length === 0) {
      return generateSimulatedResults(earliestDepartureDate, latestArrivalDate)
    }

    // Find the optimal departure time (the one with the shortest travel time)
    const optimalOption = departureTimeOptions.reduce(
      (best, current) => (current.durationInTraffic < best.durationInTraffic ? current : best),
      departureTimeOptions[0],
    )

    return {
      optimalDepartureTime: optimalOption.departureTime,
      estimatedArrivalTime: optimalOption.arrivalTime,
      durationInTraffic: optimalOption.durationInTraffic,
      trafficCondition: optimalOption.trafficCondition,
      distanceInMeters: optimalOption.distanceInMeters,
      departureTimeOptions: departureTimeOptions.sort(
        (a, b) => parseTimeToDate(a.departureTime).getTime() - parseTimeToDate(b.departureTime).getTime(),
      ),
      dataSource: "google_maps",
    }
  } catch (error) {
    console.error("Error calculating optimal departure time:", error)

    // Fall back to simulated data if there's an error
    try {
      const earliestDepartureDate = parseTimeToDate(earliestDeparture)
      const latestArrivalDate = parseTimeToDate(latestArrival)

      return generateSimulatedResults(earliestDepartureDate, latestArrivalDate)
    } catch (fallbackError) {
      console.error("Error generating fallback results:", fallbackError)
      throw error // Throw the original error if fallback also fails
    }
  }
}

// Generate simulated results as a fallback
function generateSimulatedResults(earliestDepartureDate: Date, latestArrivalDate: Date) {
  const departureTimeOptions = []
  let currentDepartureTime = new Date(earliestDepartureDate)

  while (currentDepartureTime <= latestArrivalDate) {
    const durationInTraffic = simulateTravelTime(currentDepartureTime)

    // Calculate estimated arrival time
    const arrivalTime = new Date(currentDepartureTime.getTime() + durationInTraffic * 1000)

    // Only include options that arrive before the latest arrival time
    if (arrivalTime <= latestArrivalDate) {
      departureTimeOptions.push({
        departureTime: formatTime(currentDepartureTime),
        arrivalTime: formatTime(arrivalTime),
        durationInTraffic,
        trafficCondition: getTrafficCondition(durationInTraffic),
        distanceInMeters: 10000, // Placeholder distance (10 km)
      })
    }

    // Move to next 15-minute interval
    currentDepartureTime = addMinutes(currentDepartureTime, 15)
  }

  // Find the optimal departure time (the one with the shortest travel time)
  const optimalOption = departureTimeOptions.reduce(
    (best, current) => (current.durationInTraffic < best.durationInTraffic ? current : best),
    departureTimeOptions[0] || { durationInTraffic: Number.POSITIVE_INFINITY },
  )

  // If no valid options were found
  if (!optimalOption || optimalOption.durationInTraffic === Number.POSITIVE_INFINITY) {
    throw new Error("No valid departure times found within the given constraints")
  }

  return {
    optimalDepartureTime: optimalOption.departureTime,
    estimatedArrivalTime: optimalOption.arrivalTime,
    durationInTraffic: optimalOption.durationInTraffic,
    trafficCondition: optimalOption.trafficCondition,
    distanceInMeters: optimalOption.distanceInMeters,
    departureTimeOptions: departureTimeOptions.sort(
      (a, b) => parseTimeToDate(a.departureTime).getTime() - parseTimeToDate(b.departureTime).getTime(),
    ),
    dataSource: "simulated", // Indicate this is simulated data
  }
}

// Geocode an address to validate it and get coordinates
async function geocodeAddress(address: string) {
  try {
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Geocoding error:", errorData)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Error geocoding address:", error)
    return null
  }
}

// This function estimates travel time between two addresses at a specific departure time
// using the Google Maps Routes API
async function estimateTravelTime(
  origin: string,
  destination: string,
  departureTime: Date,
): Promise<{
  durationInSeconds: number
  distanceInMeters: number
  trafficCondition: string
}> {
  try {
    // Format the departure time as an RFC 3339 timestamp
    const departureTimeString = departureTime.toISOString()

    // Call our API route that interfaces with Google Maps Routes API
    const response = await fetch("/api/routes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin,
        destination,
        departureTime: departureTimeString,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Routes API error:", errorData)
      throw new Error("Failed to get route information")
    }

    return await response.json()
  } catch (error) {
    console.error("Error estimating travel time:", error)
    throw error
  }
}

// Map Google Maps traffic condition to our app's traffic condition format
function mapTrafficCondition(googleTrafficCondition: string): string {
  switch (googleTrafficCondition) {
    case "LIGHT":
      return "Light"
    case "MODERATE":
      return "Moderate"
    case "HEAVY":
      return "Heavy"
    case "SEVERE":
    case "TRAFFIC_JAM":
      return "Very Heavy"
    default:
      return "Moderate" // Default to moderate if unknown
  }
}

// Fallback function to simulate travel time if the API call fails
function simulateTravelTime(departureTime: Date): number {
  const hour = departureTime.getHours()
  let baseDuration = 1800 // 30 minutes in seconds

  // Simulate morning rush hour (7-9 AM)
  if (hour >= 7 && hour < 9) {
    baseDuration *= 1.5 // 50% longer during morning rush hour
  }
  // Simulate evening rush hour (4-7 PM)
  else if (hour >= 16 && hour < 19) {
    baseDuration *= 1.7 // 70% longer during evening rush hour
  }
  // Simulate lighter traffic during mid-day
  else if (hour >= 10 && hour < 15) {
    baseDuration *= 0.9 // 10% shorter during mid-day
  }

  // Add some randomness to simulate traffic variations
  const randomFactor = 0.8 + Math.random() * 0.4 // Random factor between 0.8 and 1.2
  return Math.round(baseDuration * randomFactor)
}

// Helper function to determine traffic condition based on duration
function getTrafficCondition(durationInSeconds: number): string {
  // These thresholds would be calibrated based on historical data
  if (durationInSeconds < 1500) return "Light"
  if (durationInSeconds < 2100) return "Moderate"
  if (durationInSeconds < 2700) return "Heavy"
  return "Very Heavy"
}

