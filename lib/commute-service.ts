"use server"

import { parseTimeToDate, formatTime, addMinutes } from "./time-utils"

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

    const now = new Date();

    // 1. Check if the latest arrival time for today has already passed.
    if (latestArrivalDate <= now) {
      throw new Error("Latest arrival time has already passed for today. Please adjust your times for a future date if needed.");
    }
    
    // 2. Determine the effective start time: the later of earliest departure or now.
    const effectiveStartTime = new Date(Math.max(earliestDepartureDate.getTime(), now.getTime()));
    console.log(`Original earliest departure: ${formatTime(earliestDepartureDate)}, Current time: ${formatTime(now)}, Effective start time for checks: ${formatTime(effectiveStartTime)}`);

    // 3. Check if the effective start time is still before the latest arrival time.
    if (effectiveStartTime >= latestArrivalDate) {
      throw new Error("The current time is already past your latest arrival time for today. No departure options available.");
    }

    // Calculate the *remaining* time window in minutes from the effective start
    const timeWindowInMinutes = (latestArrivalDate.getTime() - effectiveStartTime.getTime()) / (60 * 1000)

    // We still need some minimal window to calculate anything
    if (timeWindowInMinutes < 15) { // Adjusted minimum, maybe even less is okay?
      throw new Error("The remaining time window until latest arrival is too short to calculate options.")
    }

    console.log(`Effective remaining time window is ${timeWindowInMinutes} minutes`);

    // Generate departure time options at 15-minute intervals starting from the effective time
    const departureTimeOptions = []
    let currentDepartureTime = new Date(effectiveStartTime) // Start from the effective time

    // Align currentDepartureTime to the next 15-minute interval if needed? 
    // Or maybe start exactly at effectiveStartTime?
    // For now, starting exactly at effectiveStartTime, API calls happen for this time + 15 min increments.

    // Limit the number of API calls based on the *remaining* window
    const maxApiCalls = Math.min(Math.ceil(timeWindowInMinutes / 15), 12) // Max 12 calls (3 hours)
    let apiCallCount = 0;
    let apiCallErrors = 0;
    let lastError: Error | null = null;

    console.log(`Will make up to ${maxApiCalls} API calls`);

    while (currentDepartureTime <= latestArrivalDate && apiCallCount < maxApiCalls) {
      try {
        console.log(`Estimating travel time for departure at ${formatTime(currentDepartureTime)}`);
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
            departureTime: formatTime(currentDepartureTime),
            arrivalTime: formatTime(arrivalTime),
            durationInTraffic: routeInfo.durationInSeconds,
            trafficCondition: mapTrafficCondition(routeInfo.trafficCondition),
            distanceInMeters: routeInfo.distanceInMeters,
          })
          console.log(`Valid option found: Depart ${formatTime(currentDepartureTime)}, arrive ${formatTime(arrivalTime)}`);
        } else {
          console.log(`Option excluded - arrival time ${formatTime(arrivalTime)} is after latest allowed arrival ${formatTime(latestArrivalDate)}`);
        }
      } catch (error) {
        console.error("Error estimating travel time for departure at", formatTime(currentDepartureTime), error);
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
      departureTimeOptions: departureTimeOptions.sort(
        (a, b) => parseTimeToDate(a.departureTime).getTime() - parseTimeToDate(b.departureTime).getTime()
      ),
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

