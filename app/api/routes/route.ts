import { type NextRequest, NextResponse } from "next/server"

// Google Maps Routes API endpoint
const ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, departureTime } = await request.json()

    if (!origin || !destination || !departureTime) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log(`Routes API called with: origin=${origin}, destination=${destination}, departureTime=${departureTime}`)

    // Verify API key is available
    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key is missing")
      return NextResponse.json({ error: "Configuration error: Server API key is missing" }, { status: 500 })
    }

    // Format the request body for the Google Maps Routes API
    const requestBody = {
      origin: {
        address: origin,
      },
      destination: {
        address: destination,
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      departureTime: departureTime,
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      },
      languageCode: "en-US",
      units: "IMPERIAL",
    }

    // Call the Google Maps Routes API with the correct field mask
    const response = await fetch(ROUTES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.travelAdvisory",
      },
      body: JSON.stringify(requestBody),
    })

    // If response is not okay, handle error more precisely
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { text: errorText };
      }
      
      console.error("Google Maps API error:", {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      return NextResponse.json({ 
        error: `Failed to fetch route data: ${response.status} ${response.statusText}`,
        details: errorData
      }, { status: response.status })
    }

    const data = await response.json()

    // Extract the relevant information from the response
    const route = data.routes?.[0]
    if (!route) {
      console.error("No route found in Google Maps API response:", data)
      return NextResponse.json({ error: "No route found between these locations" }, { status: 404 })
    }

    if (!route.duration) {
      console.error("No duration data in route:", route)
      return NextResponse.json({ error: "Route data is incomplete" }, { status: 500 })
    }

    // Parse duration string (format: "1234s") to get seconds
    const durationInSeconds = Number.parseInt(route.duration.substring(0, route.duration.length - 1))

    // Determine traffic condition based on travel advisory
    let trafficCondition = "UNKNOWN"
    if (route.travelAdvisory) {
      // Check if there are traffic reasons in the travel advisory
      const hasTrafficDelays = route.travelAdvisory.speedReadingIntervals?.some(
        (interval: any) => interval.speed === "SLOW" || interval.speed === "TRAFFIC_JAM",
      )

      if (hasTrafficDelays) {
        trafficCondition = "HEAVY"
      } else {
        trafficCondition = "LIGHT"
      }
    }

    // Format the response
    const result = {
      durationInSeconds,
      distanceInMeters: route.distanceMeters,
      trafficCondition,
    }

    console.log(`Successfully calculated route: ${origin} to ${destination}, duration: ${durationInSeconds}s`)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in routes API:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

