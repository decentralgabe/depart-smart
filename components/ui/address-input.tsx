"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import React from "react"
import { Input } from "@/components/ui/input"

// Add Google Maps type declarations
declare global {
  interface Window {
    google: any
  }
}

interface AddressInputProps {
  value: string
  onChange: (value: string) => void
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
  const [placesLoaded, setPlacesLoaded] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Input ref to attach the autocomplete
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Autocomplete instance
  const autocompleteRef = useRef<any>(null)
  
  // Client-side initialization
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load the Google Places library and initialize autocomplete
  useEffect(() => {
    if (!isClient || !inputRef.current) return
    
    async function initializeAutocomplete() {
      try {
        setIsLoading(true)
        
        // Load Places library if not already loaded
        if (!window.google?.maps?.places) {
          await window.google.maps.importLibrary('places')
        }
        
        // Create autocomplete instance
        const options = {
          componentRestrictions: { country: "us" },
          fields: ["formatted_address", "place_id", "geometry", "name"],
        }
        
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          options
        )
        
        // Add place_changed listener
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace()
          
          if (place && place.formatted_address) {
            console.log("Place selected:", place)
            
            onChange(place.formatted_address)
            
            // Trigger onBlur for validation
            if (onBlur && inputRef.current) {
              onBlur({
                target: inputRef.current,
                type: 'blur',
              } as any)
            }
          }
        })
        
        setPlacesLoaded(true)
      } catch (error) {
        console.error("Error initializing Places Autocomplete:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (window.google?.maps) {
      initializeAutocomplete()
    } else {
      // Check for Google Maps API in case it's still loading
      const checkForGoogleMaps = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkForGoogleMaps)
          initializeAutocomplete()
        }
      }, 100)
      
      // Clean up interval
      return () => clearInterval(checkForGoogleMaps)
    }
  }, [isClient, onChange, onBlur])
  
  // Clean up autocomplete when component unmounts
  useEffect(() => {
    return () => {
      if (autocompleteRef.current && window.google?.maps) {
        // Clean up listener if needed
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [])

  // Static placeholder for SSR
  if (!isClient) {
    return (
      <div className={`relative ${className || ''}`}>
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            {icon}
          </div>
        )}
        <div 
          className={`w-full p-2 border rounded-md bg-muted flex items-center ${icon ? "pl-10" : ""}`}
          style={{ 
            height: "2.5rem",
            borderColor: "hsl(var(--input))",
            backgroundColor: "hsl(var(--input))",
          }}
        >
          {/* Empty placeholder during SSR */}
        </div>
      </div>
    )
  }

  // Client-side rendering with a standard input field
  return (
    <div className={`relative ${className || ''}`}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          {icon}
        </div>
      )}
      
      <Input
        ref={inputRef}
        type="text"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className={`w-full ${icon ? "pl-10" : ""}`}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
} 