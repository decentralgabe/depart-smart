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
  dataSource?: string;
  departureTimeOptions: Array<{
    departureTime: string;
    arrivalTime: string;
    durationInTraffic: number;
    trafficCondition: string;
    distanceInMeters?: number;
  }>;
};

const formSchema = z.object({
  originAddress: z.string().min(5, "Origin address must be at least 5 characters"),
  destinationAddress: z.string().min(5, "Destination address must be at least 5 characters"),
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
    mode: "onBlur"
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    setResult(null)
    setFormErrors(null)
    
    try {
      const resultData = await calculateOptimalDepartureTime(
        values.originAddress,
        values.destinationAddress,
        values.earliestDeparture,
        values.latestArrival
      )
      
      if (!resultData) {
        throw new Error("Failed to calculate route. Please check your addresses and try again.")
      }
      
      setResult(resultData)

      // Request notification permission if not already granted/denied
      try {
        if (typeof window !== 'undefined' && Notification.permission !== "granted" && Notification.permission !== "denied") {
          await Notification.requestPermission();
        }
      } catch (permissionError) {
        // Silently fail if notification permission request fails
      }

      toast({
        title: "Commute analysis complete",
        description: "We've calculated your optimal departure time",
      })
    } catch (error: any) {
      let errorMessage = error.message || "Failed to calculate route. Please check your addresses and try again."
      
      // Check for timestamp error
      if (typeof errorMessage === 'string' && errorMessage.includes("Timestamp must be set to a future time")) {
        errorMessage = "The earliest departure time must be in the future. Please select a later time."
        form.setFocus("earliestDeparture")
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
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Commute Details</CardTitle>
          <CardDescription>Enter your commute information to find the optimal departure time</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {formErrors && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
                  {formErrors}
                </div>
              )}
              <FormField
                control={form.control}
                name="originAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin Address</FormLabel>
                    <FormControl>
                      <AddressInput
                        {...field}
                        onChange={(value: string) => field.onChange(value)}
                        placeholder="123 Origin Street, City"
                        icon={<Home className="h-4 w-4 text-muted-foreground" />}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destinationAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Address</FormLabel>
                    <FormControl>
                      <AddressInput
                        {...field}
                        onChange={(value: string) => field.onChange(value)}
                        placeholder="456 Destination Avenue, City"
                        icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="earliestDeparture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Earliest Departure</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <TimeInput {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>The earliest you can leave your origin location</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="latestArrival"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latest Arrival</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <TimeInput {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>The latest you can arrive at your destination</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Calculating..." : "Calculate Optimal Departure Time"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div>
        {result ? (
          <ErrorBoundary fallbackMessage="An error occurred while displaying the commute results.">
            <CommuteResult result={result} />
          </ErrorBoundary>
        ) : (
          <Card className="h-full flex items-center justify-center p-6 border-dashed">
            <div className="text-center text-muted-foreground">
              <p>Enter your commute details and click calculate to see the optimal departure time</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

