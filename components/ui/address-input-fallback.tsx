"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface AddressInputFallbackProps {
  value: string
  onChange: (value: string, placeId?: string) => void
  placeholder?: string
  className?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export function AddressInputFallback({
  value,
  onChange,
  placeholder,
  className,
  icon,
  disabled = false,
}: AddressInputFallbackProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const debouncedValue = useDebounce(value, 300)

  // Load Google Maps JavaScript API with Places library
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

  // Initialize autocomplete when script is loaded and input is available
  useEffect(() => {
    if (scriptLoaded && inputRef.current && !autocompleteRef.current) {
      const options = {
        componentRestrictions: { country: "us" }, // Restrict to a specific country if needed
        types: ["address"],
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options)

      // Add listener for place selection
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace()
        if (place && place.formatted_address) {
          onChange(place.formatted_address, place.place_id)
        }
      })
    }
  }, [scriptLoaded, onChange])

  // Update the input value when it changes externally
  useEffect(() => {
    if (inputRef.current && debouncedValue !== inputRef.current.value) {
      inputRef.current.value = debouncedValue
    }
  }, [debouncedValue])

  return (
    <div className={`relative ${className}`}>
      <Input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
        disabled={disabled || isLoading}
      />
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

