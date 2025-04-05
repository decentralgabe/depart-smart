"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Clock, Home, MapPin, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { TimeInput } from "@/components/ui/time-input"
import { AddressInput } from "@/components/ui/address-input"
import { useToast } from "@/hooks/use-toast"
import { calculateOptimalDepartureTime } from "@/lib/commute-service"
import { CommuteResult } from "@/components/commute-result"
import { getNearestFuture15Min, getDefaultArrivalTime } from "@/lib/time-utils"
import ErrorBoundary from "./error-boundary"

const formSchema = z.object({
  homeAddress: z.string().min(5, "Home address must be at least 5 characters"),
  workAddress: z.string().min(5, "Work address must be at least 5 characters"),
  earliestDeparture: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time (HH:MM)")
    .refine((val) => {
      const now = new Date();
      const [hours, minutes] = val.split(':').map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(hours, minutes, 0, 0);
      
      // Allow a small buffer (e.g., 1 minute) to account for submission delay
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
    path: ["latestArrival"], // Show error on the latestArrival field
  }
);

export default function CommuteOptimizer() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)
  const [formErrors, setFormErrors] = useState<string | null>(null)
  
  // Track place IDs separately from the form
  const homePlaceIdRef = useRef<string | undefined>(undefined)
  const workPlaceIdRef = useRef<string | undefined>(undefined)
  
  const defaultDepartureTimeRef = useRef(getNearestFuture15Min())
  const defaultArrivalTimeRef = useRef(getDefaultArrivalTime());
  
  useEffect(() => {
    console.log("CommuteOptimizer MOUNTED / isClient effect");
    setIsClient(true)
    return () => {
      console.log("CommuteOptimizer UNMOUNTING");
    };
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      homeAddress: "",
      workAddress: "",
      earliestDeparture: defaultDepartureTimeRef.current,
      latestArrival: defaultArrivalTimeRef.current,
    },
    mode: "onBlur"
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("onSubmit START");
    console.log("Form submitted with values:", values)
    
    // Validation is now handled by zodResolver via form.handleSubmit
    
    setLoading(true)
    setResult(null) // Clear previous results immediately
    setFormErrors(null)
    
    try {
      console.log("onSubmit: BEFORE await calculateOptimalDepartureTime");
      const resultData = await calculateOptimalDepartureTime(
        values.homeAddress,
        values.workAddress,
        values.earliestDeparture,
        values.latestArrival
      )
      console.log("onSubmit: AFTER await calculateOptimalDepartureTime", resultData);
      
      if (!resultData) {
        throw new Error("Failed to calculate route. Please check your addresses and try again.")
      }
      
      console.log("onSubmit: BEFORE setResult");
      setResult(resultData)
      console.log("onSubmit: AFTER setResult");

      try {
        if (typeof window !== 'undefined' && Notification.permission !== "granted" && Notification.permission !== "denied") {
          console.log("Requesting notification permission...");
          await Notification.requestPermission();
          console.log("Notification permission status:", Notification.permission);
        }
      } catch (permissionError) {
        console.error("Error requesting notification permission:", permissionError);
        // Optionally inform the user, but don't block showing results
        // toast({ title: "Could not enable notifications", variant: "warning" });
      }

      toast({
        title: "Commute analysis complete",
        description: "We've calculated your optimal departure time",
      })
    } catch (error: any) {
      console.error("Form submission error:", error)
      
      let errorMessage = error.message || "Failed to calculate route. Please check your addresses and try again."
      
      // Check for the specific timestamp error from the API
      if (typeof errorMessage === 'string' && errorMessage.includes("Timestamp must be set to a future time")) {
        errorMessage = "The earliest departure time must be in the future. Please select a later time."
        // Optionally focus the relevant field
        form.setFocus("earliestDeparture")
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      
      setFormErrors(errorMessage)
    } finally {
      console.log("onSubmit: FINALLY block");
      setLoading(false)
    }
    console.log("onSubmit END");
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
                name="homeAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home Address</FormLabel>
                    <FormControl>
                      <AddressInput
                        {...field}
                        onChange={(value) => field.onChange(value)}
                        placeholder="123 Home Street, City"
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
                name="workAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Address</FormLabel>
                    <FormControl>
                      <AddressInput
                        {...field}
                        onChange={(value) => field.onChange(value)}
                        placeholder="456 Work Avenue, City"
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
                      <FormDescription>The earliest you can leave home</FormDescription>
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
                      <FormDescription>The latest you can arrive at work</FormDescription>
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
                {loading ? "Calculating..." : "Find Optimal Departure Time"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <ErrorBoundary fallbackMessage="Please check the console for details.">
        {result ? (
          <CommuteResult result={result} />
        ) : (
          <Card className="flex flex-col justify-center items-center p-8 text-center border border-transparent bg-gradient-to-br from-accent to-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/5 opacity-20"></div>
            <Navigation className="h-12 w-12 text-muted-foreground mb-4 relative z-10" />
            <CardTitle className="mb-2 relative z-10">No Commute Data Yet</CardTitle>
            <CardDescription className="relative z-10">
              Fill out the form to calculate your optimal departure time based on traffic conditions
            </CardDescription>
          </Card>
        )}
      </ErrorBoundary>
    </div>
  )
}

