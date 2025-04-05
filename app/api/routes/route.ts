import { type NextRequest, NextResponse } from "next/server"

// Google Maps Routes API endpoint
const ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, departureTime } = await request.json()

    // Better validation of required parameters
    if (!origin || typeof origin !== 'string' || origin.trim() === '') {
      return NextResponse.json({ error: "Origin address is missing or invalid" }, { status: 400 })
    }

    if (!destination || typeof destination !== 'string' || destination.trim() === '') {
      return NextResponse.json({ error: "Destination address is missing or invalid" }, { status: 400 })
    }

    if (!departureTime || typeof departureTime !== 'string') {
      return NextResponse.json({ error: "Departure time is missing or invalid" }, { status: 400 })
    }

    // Verify API key is available
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error: API key missing" }, { status: 500 })
    }

    // Format the request body for the Google Maps Routes API
    const requestBody = {
      origin: {
        address: origin.trim(),
      },
      destination: {
        address: destination.trim(),
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

    // If response is not okay, handle error
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { text: errorText };
      }
      
      // Check for specific error types from Google API
      const errorMessage = errorData?.error?.message || errorData?.text || `${response.status} ${response.statusText}`;
      
      // Handle common Google API errors
      if (errorMessage.includes('ZERO_RESULTS') || errorMessage.includes('NOT_FOUND')) {
        return NextResponse.json({ 
          error: "No route found between these locations. Please check the addresses and try again."
        }, { status: 404 });
      }
      
      if (errorMessage.includes('INVALID_REQUEST')) {
        return NextResponse.json({ 
          error: "Invalid request. Please verify the addresses are valid and try again."
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `Failed to fetch route data: ${response.status} ${response.statusText}`,
        details: errorData
      }, { status: response.status })
    }

    const data = await response.json()

    // Extract the relevant information from the response
    const route = data.routes?.[0]
    if (!route) {
      return NextResponse.json({ 
        error: "No driving route found between these locations. Please check your addresses and try again." 
      }, { status: 404 })
    }

    if (!route.duration) {
      return NextResponse.json({ error: "Route data is incomplete" }, { status: 500 })
    }

    // Parse duration string (format: "1234s") to get seconds
    const durationInSeconds = Number.parseInt(route.duration.substring(0, route.duration.length - 1))

    // Determine traffic condition based on travel advisory
    let trafficCondition = "MODERATE";  // Default to moderate
    
    if (route.travelAdvisory?.speedReadingIntervals) {
      const speedReadings = route.travelAdvisory.speedReadingIntervals;
      
      // Check for severe conditions (traffic jams)
      const hasSevereConditions = speedReadings.some(
        (interval: any) => interval.speed === "TRAFFIC_JAM"
      );
      
      if (hasSevereConditions) {
        trafficCondition = "SEVERE";
      } else {
        // Count slow segments
        const slowSegments = speedReadings.filter(
          (interval: any) => interval.speed === "SLOW"
        ).length;
        
        // Count total segments
        const totalSegments = speedReadings.length;
        
        if (totalSegments > 0) {
          const slowRatio = slowSegments / totalSegments;
          
          if (slowRatio > 0.5) {
            trafficCondition = "HEAVY";
          } else if (slowRatio > 0.2) {
            trafficCondition = "MODERATE";
          } else {
            trafficCondition = "LIGHT";
          }
        }
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
    console.error("Routes API error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

