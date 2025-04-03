"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import React from "react"

// Add Google Maps type declarations
declare global {
  interface Window {
    google: any
  }
  // Add type declaration for the web component
  namespace JSX {
    interface IntrinsicElements {
      "gmp-place-autocomplete": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        placeholder?: string;
        "request-language"?: string;
        "request-region"?: string;
        "country-codes"?: string;
        "location-bias"?: string;
        "location-restriction"?: string;
        types?: string;
        value?: string;
        disabled?: boolean;
        "data-value"?: string;
        style?: React.CSSProperties;
      };
    }
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
  const [placesLoaded, setPlacesLoaded] = useState(false)
  const autocompleteRef = useRef<HTMLElement>(null)
  const isHandlingPlaceSelect = useRef(false)
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true only on the client side after mount
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Use google.maps.importLibrary to dynamically load the places library
  useEffect(() => {
    if (!isClient) return

    async function loadPlacesLibrary() {
      try {
        setIsLoading(true)
        // Use the importLibrary function provided by the bootstrap loader
        await window.google.maps.importLibrary('places')
        setPlacesLoaded(true)
      } catch (error) {
        console.error('Error loading Places library:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (window.google?.maps?.importLibrary) {
      loadPlacesLibrary()
    } else {
      // In case the bootstrap script hasn't fully initialized yet
      const checkForGoogleMaps = setInterval(() => {
        if (window.google?.maps?.importLibrary) {
          clearInterval(checkForGoogleMaps)
          loadPlacesLibrary()
        }
      }, 100)
      
      // Clear interval if component unmounts
      return () => clearInterval(checkForGoogleMaps)
    }
  }, [isClient])

  // Initialize event listener for the web component
  useEffect(() => {
    // Only run listener logic on the client when Places library is loaded
    if (!isClient || !placesLoaded || !autocompleteRef.current) return

    const autocompleteElement = autocompleteRef.current

    const handlePlaceSelect = async (event: Event) => {
      // Type assertion for the custom event
      const customEvent = event as CustomEvent<{ place: any }>
      if (!customEvent.detail || !customEvent.detail.place) return

      const place = customEvent.detail.place
      
      // Use Place V1 fields 
      const address = place.formattedAddress ?? place.displayName ?? ''
      const placeId = place.id ?? undefined

      if (address) {
        isHandlingPlaceSelect.current = true
        onChange(address, placeId)
        
        // Force update the HTML input value inside the web component
        try {
          // Find the input element inside the web component
          const inputElement = autocompleteElement.querySelector('input') as HTMLInputElement
          if (inputElement) {
            // Set the value and dispatch multiple events to ensure form controllers detect the change
            inputElement.value = address
            
            // Create and dispatch events to notify all form controllers
            const inputEvent = new Event('input', { bubbles: true, cancelable: true })
            const changeEvent = new Event('change', { bubbles: true, cancelable: true })
            const blurEvent = new Event('blur', { bubbles: true, cancelable: true })
            
            inputElement.dispatchEvent(inputEvent)
            inputElement.dispatchEvent(changeEvent)
            inputElement.dispatchEvent(blurEvent)
            
            // Also call the onBlur handler if provided
            if (onBlur) {
              onBlur(blurEvent as unknown as React.FocusEvent<HTMLInputElement>)
            }
          }
        } catch (e) {
          console.error("Failed to update input element:", e)
        }
        
        // Reset the flag after a short delay to allow React state updates
        setTimeout(() => {
          isHandlingPlaceSelect.current = false
        }, 100) // Longer timeout to ensure all state updates have happened
      }
    }

    autocompleteElement.addEventListener('gmp-placeselect' as any, handlePlaceSelect)

    // Cleanup
    return () => {
      autocompleteElement.removeEventListener('gmp-placeselect' as any, handlePlaceSelect)
    }
  }, [isClient, placesLoaded, onChange, onBlur])

  // Add effect to sync the input value when the prop value changes
  useEffect(() => {
    if (!isClient || !placesLoaded || !autocompleteRef.current || value === '') return
    
    try {
      // Find the input element inside the web component
      const inputElement = autocompleteRef.current.querySelector('input') as HTMLInputElement
      if (inputElement && inputElement.value !== value) {
        // Update the input value to match the form state
        inputElement.value = value
      }
    } catch (e) {
      console.error("Failed to sync input value:", e)
    }
  }, [isClient, placesLoaded, value])

  // Handle potential input changes if needed
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHandlingPlaceSelect.current) {
      // Only update if we're not in the middle of a place selection
      onChange(e.target.value, undefined)
    }
  }

  // Add a manual blur handler
  const handleManualBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      onBlur(e)
    }
  }

  // Static placeholder to render during SSR and initial client render
  const StaticPlaceholder = (
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
  );

  // Only render the dynamic part on the client after mount
  if (!isClient) {
    return StaticPlaceholder;
  }

  // Client-side rendering logic
  return (
    <div className={`relative ${className || ''}`}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          {icon}
        </div>
      )}
      {placesLoaded ? (
        // Use React.createElement to create the custom element to avoid TypeScript errors
        React.createElement('gmp-place-autocomplete', {
          ref: autocompleteRef,
          placeholder: placeholder,
          "country-codes": "us",
          className: `w-full p-2 border rounded-md bg-background text-foreground ${icon ? "pl-10" : ""}`,
          disabled: disabled,
          "data-value": value,
          style: {
            backgroundColor: "hsl(var(--input))",
            color: "hsl(var(--foreground))",
            borderColor: "hsl(var(--input))",
            borderRadius: "var(--radius)",
            borderWidth: "1px",
            paddingLeft: icon ? "2.5rem" : "0.75rem",
            height: "2.5rem",
            boxSizing: "border-box",
          }
        })
      ) : (
        <div 
          className={`w-full p-2 border rounded-md bg-muted flex items-center ${icon ? "pl-10" : ""}`}
          style={{ 
              height: "2.5rem", 
              borderColor: "hsl(var(--input))",
              backgroundColor: "hsl(var(--input))", 
          }}
        >
          <span className="text-muted-foreground">{placeholder ?? "Loading..."}</span>
        </div>
      )}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
} 