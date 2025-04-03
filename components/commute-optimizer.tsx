"use client"

import { useState, useEffect } from "react"
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
import { AddressInputFallback } from "@/components/ui/address-input-fallback"
import { useToast } from "@/hooks/use-toast"
import { calculateOptimalDepartureTime } from "@/lib/commute-service"
import { CommuteResult } from "@/components/commute-result"

const formSchema = z.object({
  homeAddress: z.string().min(5, "Home address must be at least 5 characters"),
  workAddress: z.string().min(5, "Work address must be at least 5 characters"),
  earliestDeparture: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time (HH:MM)"),
  latestArrival: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time (HH:MM)"),
})

export default function CommuteOptimizer() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()
  const [homePlaceId, setHomePlaceId] = useState<string | undefined>()
  const [workPlaceId, setWorkPlaceId] = useState<string | undefined>()
  const [useFallback, setUseFallback] = useState(false)

  // Check if we need to use the fallback
  useEffect(() => {
    // Try to detect if PlaceAutocompleteElement is available
    const checkPlaceAutocompleteElement = async () => {
      try {
        if (window.google?.maps?.places?.PlaceAutocompleteElement) {
          setUseFallback(false)
        } else {
          setUseFallback(true)
        }
      } catch (error) {
        console.error("Error checking PlaceAutocompleteElement:", error)
        setUseFallback(true)
      }
    }

    if (window.google?.maps?.places) {
      checkPlaceAutocompleteElement()
    } else {
      // Wait for the script to load
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          checkPlaceAutocompleteElement()
          clearInterval(checkInterval)
        }
      }, 500)

      // Clear interval after 10 seconds to prevent memory leaks
      setTimeout(() => clearInterval(checkInterval), 10000)
    }
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      homeAddress: "",
      workAddress: "",
      earliestDeparture: "08:30",
      latestArrival: "11:30",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      const result = await calculateOptimalDepartureTime(
        values.homeAddress,
        values.workAddress,
        values.earliestDeparture,
        values.latestArrival,
        homePlaceId,
        workPlaceId,
      )
      setResult(result)

      // Request notification permission
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission()
      }

      toast({
        title: "Commute analysis complete",
        description: "We've calculated your optimal departure time",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to calculate optimal departure time. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const AddressInputComponent = useFallback ? AddressInputFallback : AddressInput

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
              <FormField
                control={form.control}
                name="homeAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-4 w-4 text-muted-foreground" />
                        <AddressInputComponent
                          value={field.value}
                          onChange={(value, placeId) => {
                            field.onChange(value)
                            setHomePlaceId(placeId)
                          }}
                          placeholder="123 Home Street, City"
                          className="w-full"
                        />
                      </div>
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
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-4 w-4 text-muted-foreground" />
                        <AddressInputComponent
                          value={field.value}
                          onChange={(value, placeId) => {
                            field.onChange(value)
                            setWorkPlaceId(placeId)
                          }}
                          placeholder="456 Work Avenue, City"
                          className="w-full"
                        />
                      </div>
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Calculating..." : "Find Optimal Departure Time"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

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
    </div>
  )
}

