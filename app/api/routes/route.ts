import { type NextRequest, NextResponse } from "next/server"

// Google Maps Routes API endpoint
const ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, departureTime } = await request.json()

    if (!origin || !destination || !departureTime) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
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
        "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.travelAdvisory",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Google Maps API error:", errorData)
      return NextResponse.json({ error: "Failed to fetch route data from Google Maps" }, { status: response.status })
    }

    const data = await response.json()

    // Extract the relevant information from the response
    const route = data.routes?.[0]
    if (!route) {
      return NextResponse.json({ error: "No route found" }, { status: 404 })
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

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in routes API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

