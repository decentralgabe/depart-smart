import { type NextRequest, NextResponse } from "next/server"

// Google Maps Geocoding API endpoint
const GEOCODING_API_URL = "https://maps.googleapis.com/maps/api/geocode/json"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Missing address parameter" }, { status: 400 })
    }

    // Call the Google Maps Geocoding API
    const response = await fetch(
      `${GEOCODING_API_URL}?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
      { method: "GET" },
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Google Maps Geocoding API error:", errorData)
      return NextResponse.json({ error: "Failed to geocode address" }, { status: response.status })
    }

    const data = await response.json()

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return NextResponse.json({ error: "No results found for the provided address" }, { status: 404 })
    }

    // Extract the location information
    const result = data.results[0]
    const formattedAddress = result.formatted_address
    const location = result.geometry.location

    return NextResponse.json({
      formattedAddress,
      location,
    })
  } catch (error) {
    console.error("Error in geocoding API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

