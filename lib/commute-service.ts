"use server"

import { parseTimeToDate, formatTimeForInput, addMinutes, getTimeDifferenceInMinutes } from "../lib/time-utils"

// Constants
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

// This function calculates the optimal departure time based on the given constraints
export async function calculateOptimalDepartureTime(
  homeAddress: string,
  workAddress: string,
  earliestDeparture: string,
  latestArrival: string,
) {
  try {
    console.log("Starting calculation with inputs:", {
      homeAddress, workAddress, earliestDeparture, latestArrival,
    });

    // Parse time strings to Date objects
    const earliestDepartureDate = parseTimeToDate(earliestDeparture)
    const latestArrivalDate = parseTimeToDate(latestArrival)

    // Validate parsed dates immediately
    if (!earliestDepartureDate) {
      throw new Error(`Invalid earliest departure time format: ${earliestDeparture}. Please use HH:MM.`);
    }
    if (!latestArrivalDate) {
      throw new Error(`Invalid latest arrival time format: ${latestArrival}. Please use HH:MM.`);
    }

    // Ensure latest arrival is after earliest departure (comparison using getTime is safe now)
    if (latestArrivalDate.getTime() <= earliestDepartureDate.getTime()) {
      throw new Error("Latest arrival time must be after earliest departure time.");
    }

    // Check if the earliest departure time is in the future
    const now = new Date();
    // Allow a small buffer (1 minute) for processing time
    if (earliestDepartureDate.getTime() <= now.getTime() - 60000) { 
      throw new Error("Earliest departure time must be in the future.");
    }

    // Calculate the time window in minutes
    const timeWindowMinutes = getTimeDifferenceInMinutes(earliestDepartureDate, latestArrivalDate);

    // We still need some minimal window to calculate anything
    if (timeWindowMinutes < 15) { // Adjusted minimum, maybe even less is okay?
      throw new Error("The remaining time window until latest arrival is too short to calculate options.")
    }

    console.log(`Effective remaining time window is ${timeWindowMinutes} minutes`);

    // Generate departure time options at 15-minute intervals starting from the effective time
    const departureTimeOptions = []
    let currentDepartureTime = new Date(earliestDepartureDate) // Start from the effective time

    // Align currentDepartureTime to the next 15-minute interval if needed? 
    // Or maybe start exactly at effectiveStartTime?
    // For now, starting exactly at effectiveStartTime, API calls happen for this time + 15 min increments.

    // Limit the number of API calls based on the *remaining* window
    const maxApiCalls = Math.min(Math.ceil(timeWindowMinutes / 15), 12) // Max 12 calls (3 hours)
    let apiCallCount = 0;
    let apiCallErrors = 0;
    let lastError: Error | null = null;

    console.log(`Will make up to ${maxApiCalls} API calls`);

    while (currentDepartureTime <= latestArrivalDate && apiCallCount < maxApiCalls) {
      try {
        console.log(`Estimating travel time for departure at ${formatTimeForInput(currentDepartureTime)}`);
        const routeInfo = await estimateTravelTime(
          homeAddress, 
          workAddress,
          currentDepartureTime
        );

        // Calculate estimated arrival time
        const arrivalTime = new Date(currentDepartureTime.getTime() + routeInfo.durationInSeconds * 1000)

        // Only include options that arrive before the latest arrival time
        if (arrivalTime <= latestArrivalDate) {
          departureTimeOptions.push({
            departureTime: formatTimeForInput(currentDepartureTime),
            arrivalTime: formatTimeForInput(arrivalTime),
            durationInTraffic: routeInfo.durationInSeconds,
            trafficCondition: mapTrafficCondition(routeInfo.trafficCondition),
            distanceInMeters: routeInfo.distanceInMeters,
          })
          console.log(`Valid option found: Depart ${formatTimeForInput(currentDepartureTime)}, arrive ${formatTimeForInput(arrivalTime)}`);
        } else {
          console.log(`Option excluded - arrival time ${formatTimeForInput(arrivalTime)} is after latest allowed arrival ${formatTimeForInput(latestArrivalDate)}`);
        }
      } catch (error) {
        console.error("Error estimating travel time for departure at", formatTimeForInput(currentDepartureTime), error);
        apiCallErrors++;
        lastError = error instanceof Error ? error : new Error(String(error));
        // Continue with the next time slot even if this one fails
      }

      // Move to next 15-minute interval
      currentDepartureTime = addMinutes(currentDepartureTime, 15)
      apiCallCount++
    }

    console.log(`Made ${apiCallCount} API calls with ${apiCallErrors} errors. Found ${departureTimeOptions.length} valid options.`);

    // If we couldn't get any valid options, throw an error with more details
    if (departureTimeOptions.length === 0) {
      if (apiCallErrors > 0) {
        const errorMessage = lastError 
          ? `Could not calculate valid departure times due to ${apiCallErrors} API errors. Last error: ${lastError.message}`
          : `Could not calculate valid departure times due to ${apiCallErrors} API errors. Please check your addresses and try again.`;
        throw new Error(errorMessage);
      }
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
      departureTimeOptions: departureTimeOptions.sort((a, b) => {
        const dateA = parseTimeToDate(a.departureTime);
        const dateB = parseTimeToDate(b.departureTime);

        // Handle null cases: nulls go to the end
        if (dateA === null && dateB === null) return 0; // Both invalid, treat as equal
        if (dateA === null) return 1; // Only A is invalid, A comes after B
        if (dateB === null) return -1; // Only B is invalid, B comes after A

        // Both are valid dates, compare by time
        return dateA.getTime() - dateB.getTime();
      }),
    }
  } catch (error) {
    console.error("Error calculating optimal departure time:", error)
    // Re-throw the error instead of falling back to simulated data
    throw error
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

    // Determine the base URL for the API call
    // Use NEXT_PUBLIC_APP_URL which should be set in your environment variables
    // Fallback to localhost for local development if not set
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const apiURL = `${baseURL}/api/routes`;

    // Call our API route that interfaces with Google Maps Routes API
    const response = await fetch(apiURL, {
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
      // Try to parse the JSON error body
      let errorData: any = { error: `HTTP error: ${response.status} ${response.statusText}` };
      try {
        errorData = await response.json();
      } catch (parseError) {
        // Ignore if parsing fails, use the default HTTP error message
        console.error("Failed to parse error response JSON:", parseError);
      }
      
      console.error("Routes API error:", errorData)
      
      // Extract the most specific error message available
      const specificMessage = errorData?.details?.error?.message // From Google Maps via our API
                             || errorData?.error                  // From our API route itself
                             || response.statusText;             // Fallback
                             
      // Include the status code for context if it's not already in the message
      const finalErrorMessage = specificMessage.includes(String(response.status)) 
        ? specificMessage 
        : `${specificMessage} (Status: ${response.status})`;
        
      throw new Error(`Failed to get route information: ${finalErrorMessage}`)
    }

    const data = await response.json()
    
    // Validate the response data
    if (!data || typeof data.durationInSeconds !== 'number' || !data.distanceInMeters) {
      console.error("Invalid route data received:", data)
      throw new Error("Received invalid data from routes API")
    }
    
    return data
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

