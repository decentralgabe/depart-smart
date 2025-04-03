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

    // If we couldn't get any valid options, throw an error
    if (departureTimeOptions.length === 0) {
      throw new Error("Could not calculate any valid departure times. Please check your addresses and try again.")
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
    // Re-throw the error instead of falling back to simulated data
    throw error
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
      throw new Error("Failed to get route information from Google Maps API")
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

