"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Bell, Clock, Car, MapPin, Navigation } from "lucide-react"
import { parseTimeToDate } from "@/lib/time-utils"
import { Badge } from "@/components/ui/badge"

interface CommuteResultProps {
  result: {
    optimalDepartureTime: string
    estimatedArrivalTime: string
    durationInTraffic: number
    trafficCondition: string
    distanceInMeters?: number
    dataSource?: string
    departureTimeOptions: Array<{
      departureTime: string
      arrivalTime: string
      durationInTraffic: number
      trafficCondition: string
      distanceInMeters?: number
    }>
  }
}

export function CommuteResult({ result }: CommuteResultProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [notificationSent, setNotificationSent] = useState(false)

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Check if notifications are supported and permission is granted
  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (!("Notification" in window)) {
        return
      }

      if (Notification.permission === "granted") {
        setNotificationsEnabled(true)
      }
    }

    checkNotificationPermission()
  }, [])

  // Send notification when it's time to leave
  useEffect(() => {
    if (notificationsEnabled && !notificationSent) {
      const optimalDepartureDate = parseTimeToDate(result.optimalDepartureTime)
      const timeUntilDeparture = optimalDepartureDate.getTime() - currentTime.getTime()

      // If it's within 15 minutes of optimal departure time, send notification
      if (timeUntilDeparture > 0 && timeUntilDeparture <= 15 * 60 * 1000) {
        new Notification("Time to leave for work!", {
          body: `Your optimal departure time is ${result.optimalDepartureTime}. Leave now to arrive by ${result.estimatedArrivalTime}.`,
          icon: "/favicon.ico",
        })
        setNotificationSent(true)
      }
    }
  }, [currentTime, notificationsEnabled, notificationSent, result])

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications")
      return
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true)
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setNotificationsEnabled(true)
      }
    }
  }

  // Calculate traffic intensity (0-100)
  const trafficIntensity = (() => {
    switch (result.trafficCondition) {
      case "Light":
        return 25
      case "Moderate":
        return 50
      case "Heavy":
        return 75
      case "Very Heavy":
        return 90
      default:
        return 50
    }
  })()

  // Format duration in minutes
  const durationInMinutes = Math.round(result.durationInTraffic / 60)

  // Format distance in miles
  const formatDistance = (meters?: number) => {
    if (!meters) return "N/A"
    const miles = meters / 1609.34 // Convert meters to miles
    return `${miles.toFixed(1)} miles` // Format output with "miles"
  }

  // Get traffic color based on condition
  const getTrafficColor = (condition: string) => {
    switch (condition) {
      case "Light":
        return "text-green-500"
      case "Moderate":
        return "text-yellow-500"
      case "Heavy":
        return "text-orange-500"
      case "Very Heavy":
        return "text-red-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <Card className="border border-transparent bg-gradient-to-br from-accent to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/5 opacity-20"></div>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Optimal Commute Time</CardTitle>
          <CardDescription>
            Based on {result.dataSource === "google_maps" ? "real-time" : "simulated"} traffic data
          </CardDescription>
        </div>
        {result.dataSource && (
          <Badge
            variant={result.dataSource === "google_maps" ? "default" : "outline"}
            className={
              result.dataSource === "google_maps"
                ? "bg-green-600 hover:bg-green-700"
                : "border-yellow-600 text-yellow-600"
            }
          >
            {result.dataSource === "google_maps" ? "Google Maps Data" : "Simulated Data"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Optimal Departure</span>
            </div>
            <span className="text-xl font-bold">{result.optimalDepartureTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Estimated Arrival</span>
            </div>
            <span className="text-xl font-bold">{result.estimatedArrivalTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium">Travel Time</span>
            </div>
            <span className="text-xl font-bold">{durationInMinutes} minutes</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Distance</span>
            </div>
            <span className="text-xl font-bold">{formatDistance(result.distanceInMeters)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Traffic Conditions</span>
            <span className={`font-medium ${getTrafficColor(result.trafficCondition)}`}>{result.trafficCondition}</span>
          </div>
          <Progress
            value={trafficIntensity}
            className="h-2"
            indicatorClassName={`bg-gradient-to-r ${
              trafficIntensity < 30
                ? "from-green-500 to-green-400"
                : trafficIntensity < 60
                  ? "from-yellow-500 to-yellow-400"
                  : "from-red-500 to-red-400"
            }`}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Alternative Departure Times</h3>
          <div className="grid gap-2">
            {result.departureTimeOptions.slice(0, 3).map((option, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-accent/50 rounded-md text-sm border border-accent/80"
              >
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Leave at {option.departureTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>Arrive by {option.arrivalTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!notificationsEnabled && (
          <Button
            onClick={enableNotifications}
            className="w-full flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Bell className="h-4 w-4" />
            Enable Departure Notifications
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

