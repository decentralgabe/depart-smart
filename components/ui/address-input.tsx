"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

// Add Google Maps type declarations
declare global {
  interface Window {
    google: any
  }
}

interface AddressInputProps {
  value: string
  onChange: (value: string, placeId?: string) => void
  placeholder?: string
  className?: string
  icon?: React.ReactNode
  disabled?: boolean
  name?: string
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}

export function AddressInput({
  value,
  onChange,
  placeholder,
  className,
  icon,
  disabled = false,
  name,
  onBlur,
}: AddressInputProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadGoogleMapsScript = () => {
      if (window.google?.maps?.places) {
        setIsScriptLoaded(true)
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => setIsScriptLoaded(true)
      document.head.appendChild(script)
    }

    loadGoogleMapsScript()
  }, [])

  // Initialize autocomplete
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current) return

    try {
      // Initialize the autocomplete
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      })

      // Store the autocomplete instance
      autocompleteRef.current = autocomplete

      // Handle place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.formatted_address) {
          onChange(place.formatted_address, place.place_id)
        }
      })

      // Cleanup
      return () => {
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        }
      }
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error)
    }
  }, [isScriptLoaded, onChange])

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          {icon}
        </div>
      )}
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`w-full ${icon ? "pl-10" : ""} ${className || ""}`}
        disabled={disabled || isLoading}
        name={name}
        onBlur={onBlur}
        style={{
          backgroundColor: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          borderColor: "hsl(var(--input))",
        }}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
} 