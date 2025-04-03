"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface AddressInputProps {
  value: string
  onChange: (value: string, placeId?: string) => void
  placeholder?: string
  className?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export function AddressInput({ value, onChange, placeholder, className, icon, disabled = false }: AddressInputProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedValue = useDebounce(value, 300)

  // Load Google Maps JavaScript API with Places library using the recommended async pattern
  useEffect(() => {
    if (window.google?.maps?.places) {
      setScriptLoaded(true)
      return
    }

    const googleMapsScript = document.getElementById("google-maps-script") as HTMLScriptElement | null

    if (!googleMapsScript) {
      setIsLoading(true)
      const script = document.createElement("script")
      script.id = "google-maps-script"
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&callback=initAutocomplete`
      script.async = true
      script.defer = true

      // Define the callback function
      window.initAutocomplete = () => {
        setScriptLoaded(true)
        setIsLoading(false)
      }

      document.head.appendChild(script)
    } else {
      // Script already exists but hasn't loaded yet
      window.initAutocomplete = () => {
        setScriptLoaded(true)
        setIsLoading(false)
      }
    }

    return () => {
      // Clean up the global callback when component unmounts
      delete window.initAutocomplete
    }
  }, [])

  // Initialize PlaceAutocompleteElement when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !autocompleteRef.current) return

    try {
      // Clear any existing content
      autocompleteRef.current.innerHTML = ""

      // Create the PlaceAutocompleteElement with correct options
      const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
        types: ["address"],
        componentRestrictions: { country: "us" }, // Optional: restrict to a specific country
      })

      // Add the element to the DOM
      autocompleteRef.current.appendChild(autocompleteElement)

      // Listen for place selection events
      autocompleteElement.addEventListener("place_changed", (event: any) => {
        const place = event.place
        if (place) {
          // The structure of the place object is different in PlaceAutocompleteElement
          const formattedAddress = place.formattedAddress || place.name || value
          onChange(formattedAddress, place.id)
        }
      })

      // Set initial value if provided
      if (value) {
        const inputElement = autocompleteElement.querySelector("input")
        if (inputElement) {
          inputElement.value = value
        }
      }

      // Set placeholder if provided
      if (placeholder) {
        // Access the internal input element and set its placeholder
        const inputElement = autocompleteElement.querySelector("input")
        if (inputElement) {
          inputElement.placeholder = placeholder
        }
      }
    } catch (error) {
      console.error("Error initializing PlaceAutocompleteElement:", error)
      // Fallback to regular input if PlaceAutocompleteElement fails
      setScriptLoaded(false)
    }
  }, [scriptLoaded, onChange, value, placeholder])

  // Handle manual input changes if we're using a separate input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">{icon}</div>}

      {/* This div will contain the PlaceAutocompleteElement */}
      <div ref={autocompleteRef} className={`${icon ? "has-icon" : ""}`} style={{ minHeight: "40px" }} />

      {/* Fallback input for when the script is loading or if PlaceAutocompleteElement fails */}
      {!scriptLoaded && (
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`${icon ? "pl-10" : ""}`}
          disabled={disabled || isLoading}
        />
      )}

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

// Add the global type declaration for the callback
declare global {
  interface Window {
    initAutocomplete: () => void
    google: any
  }
}

