"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Clock, Home, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { TimeInput } from "@/components/ui/time-input"
import AddressInput from "@/components/address-input"
import { useToast } from "@/hooks/use-toast"
import { calculateOptimalDepartureTime } from "@/lib/commute-service"
import { CommuteResult } from "@/components/commute-result"
import { getNearestFuture15Min, getDefaultArrivalTime } from "@/lib/time-utils"
import ErrorBoundary from "./error-boundary"

// Define result type to match the CommuteResultProps
type CommuteResultType = {
  optimalDepartureTime: string;
  estimatedArrivalTime: string;
  durationInTraffic: number;
  trafficCondition: string;
  distanceInMeters?: number;
  departureTimeOptions: Array<{
    departureTime: string;
    arrivalTime: string;
    durationInTraffic: number;
    trafficCondition: string;
    distanceInMeters?: number;
  }>;
};

const formSchema = z.object({
  originAddress: z.string().min(1, "Origin address is required"),
  destinationAddress: z.string().min(1, "Destination address is required"),
  earliestDeparture: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time (HH:MM)")
    .refine((val) => {
      const now = new Date();
      const [hours, minutes] = val.split(':').map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(hours, minutes, 0, 0);
      
      // Allow a small buffer (1 minute) to account for submission delay
      return selectedTime.getTime() > now.getTime() - 60000; 
    }, {
      message: "Earliest departure time must be in the future",
    }),
  latestArrival: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time (HH:MM)"),
}).refine(
  (data) => {
    // Convert time strings to minutes for comparison
    const [earlyHours, earlyMinutes] = data.earliestDeparture.split(':').map(Number);
    const [lateHours, lateMinutes] = data.latestArrival.split(':').map(Number);
    
    const earlyTotalMinutes = earlyHours * 60 + earlyMinutes;
    const lateTotalMinutes = lateHours * 60 + lateMinutes;
    
    // Ensure latest arrival is after earliest departure
    return lateTotalMinutes > earlyTotalMinutes;
  },
  {
    message: "Latest arrival time must be after earliest departure time",
    path: ["latestArrival"],
  }
);

export default function CommuteOptimizer() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CommuteResultType | null>(null)
  const { toast } = useToast()
  const [formErrors, setFormErrors] = useState<string | null>(null)
  
  const defaultDepartureTime = useRef(getNearestFuture15Min())
  const defaultArrivalTime = useRef(getDefaultArrivalTime())

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      originAddress: "",
      destinationAddress: "",
      earliestDeparture: defaultDepartureTime.current,
      latestArrival: defaultArrivalTime.current,
    },
    mode: "onSubmit", // Changed from onBlur to onSubmit to prevent validation on initial load
  })

  // Validate and format address string to ensure it's properly formatted
  const validateAddress = (address: string): string => {
    if (!address || typeof address !== 'string') return '';
    // Remove any extra whitespace and ensure proper formatting
    return address.trim();
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    setResult(null)
    setFormErrors(null)
    
    // Remove focus from input fields to hide mobile keyboard
    if (typeof window !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Validate addresses before submission
    const originAddress = validateAddress(values.originAddress);
    const destinationAddress = validateAddress(values.destinationAddress);
    
    // Check if addresses are valid
    if (!originAddress) {
      setFormErrors("Please enter a valid origin address");
      setLoading(false);
      return;
    }
    
    if (!destinationAddress) {
      setFormErrors("Please enter a valid destination address");
      setLoading(false);
      return;
    }
    
    try {
      const resultData = await calculateOptimalDepartureTime(
        originAddress,
        destinationAddress,
        values.earliestDeparture,
        values.latestArrival
      )
      
      if (!resultData) {
        throw new Error("Failed to calculate route. Please check your addresses and try again.")
      }
      
      setResult(resultData)

      // Request notification permission if not already granted/denied
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && 
            Notification.permission !== "granted" && Notification.permission !== "denied") {
          await Notification.requestPermission();
        }
      } catch (permissionError) {
        // Silently fail if notification permission request fails
      }

      toast({
        title: "Commute analysis complete",
        description: "We've calculated your optimal departure time",
      })
      
      // Smoothly scroll to results on mobile
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        const resultElement = document.querySelector('[data-commute-result]');
        if (resultElement) {
          setTimeout(() => {
            resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    } catch (error: any) {
      let errorMessage = error.message || "Failed to calculate route. Please check your addresses and try again."
      
      // Check for timestamp error
      if (typeof errorMessage === 'string' && errorMessage.includes("Timestamp must be set to a future time")) {
        errorMessage = "The earliest departure time must be in the future. Please select a later time."
        form.setFocus("earliestDeparture")
      }
      
      // Check for common route errors
      if (typeof errorMessage === 'string' && errorMessage.includes("No route found between these locations")) {
        errorMessage = "No driving route found between these locations. Please check your addresses and try again."
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      
      setFormErrors(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <Card className="border-0 bg-gradient-to-br from-purple-900/30 to-indigo-900/10 backdrop-blur-sm overflow-hidden rounded-xl shadow-xl relative border border-white/10">
        {/* Card decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl transform -translate-x-10 translate-y-10"></div>
        
        <CardHeader className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
            <div className="text-xs font-medium text-purple-400 uppercase tracking-wider">Journey Planner</div>
          </div>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-300">
            Commute Details
          </CardTitle>
          <CardDescription className="text-gray-400">
            Enter your commute information to find the optimal departure time
          </CardDescription>
        </CardHeader>
        
        <CardContent className="relative z-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {formErrors && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-sm p-4 rounded-lg mb-4 backdrop-blur-sm shadow-lg">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>{formErrors}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="originAddress"
                  render={({ field }) => (
                    <FormItem className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-white/10 transition-all hover:bg-white/10">
                      <FormLabel className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Home className="h-4 w-4 text-purple-400" />
                        Origin Address
                      </FormLabel>
                      <FormControl>
                        <AddressInput
                          {...field}
                          onChange={(value: string) => field.onChange(value)}
                          placeholder="123 Origin Street, City"
                          icon={<Home className="h-4 w-4 text-muted-foreground" />}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="destinationAddress"
                  render={({ field }) => (
                    <FormItem className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-white/10 transition-all hover:bg-white/10">
                      <FormLabel className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-indigo-400" />
                        Destination Address
                      </FormLabel>
                      <FormControl>
                        <AddressInput
                          {...field}
                          onChange={(value: string) => field.onChange(value)}
                          placeholder="456 Destination Avenue, City"
                          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="relative">
                <Separator className="my-4 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs py-1 px-3 rounded-full">
                  Time Settings
                </div>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="earliestDeparture"
                  render={({ field }) => (
                    <FormItem className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-white/10 transition-all hover:bg-white/10">
                      <FormLabel className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-400" />
                        Earliest Departure
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2 relative">
                          <Clock className="h-4 w-4 text-purple-400" />
                          <TimeInput {...field} />
                        </div>
                      </FormControl>
                      <FormDescription className="text-gray-500 text-xs">
                        The earliest you can leave your origin
                      </FormDescription>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="latestArrival"
                  render={({ field }) => (
                    <FormItem className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-white/10 transition-all hover:bg-white/10">
                      <FormLabel className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-400" />
                        Latest Arrival
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-indigo-400" />
                          <TimeInput {...field} />
                        </div>
                      </FormControl>
                      <FormDescription className="text-gray-500 text-xs">
                        The latest you can arrive at your destination
                      </FormDescription>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                className={`w-full mt-6 relative overflow-hidden group ${loading ? 'opacity-80 cursor-not-allowed' : 'hover:shadow-glow'}`}
                disabled={loading}
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-500 group-hover:to-indigo-500 transition-all"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                      </svg>
                      Calculate Optimal Time
                    </>
                  )}
                </span>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div>
        {result ? (
          <ErrorBoundary fallbackMessage="An error occurred while displaying the commute results.">
            <div data-commute-result className="transform transition-all duration-500 hover:scale-[1.02]">
              <CommuteResult result={result} />
            </div>
          </ErrorBoundary>
        ) : (
          <Card className="h-full flex flex-col items-center justify-center p-6 border-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/10 backdrop-blur-sm overflow-hidden rounded-xl shadow-xl relative border border-white/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl transform -translate-x-10 translate-y-10"></div>
            
            <div className="text-center relative z-10 max-w-sm mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-200 mb-2">Time to Plan Your Trip</h3>
              <p className="text-gray-400 text-sm">
                Enter your commute details on the left to calculate the perfect departure time based on real-time traffic data.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

