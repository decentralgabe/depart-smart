"use client"

import { useEffect, useState, lazy, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Bell, Clock, Car, MapPin, Navigation } from "lucide-react"
import { parseTimeToDate, formatTime } from "@/lib/time-utils"

interface CommuteResultProps {
  result: {
    optimalDepartureTime: string
    estimatedArrivalTime: string
    durationInTraffic: number
    trafficCondition: string
    distanceInMeters?: number
    departureTimeOptions: Array<{
      departureTime: string
      arrivalTime: string
      durationInTraffic: number
      trafficCondition: string
      distanceInMeters?: number
    }>
  }
}

// Extract Alternative Times to a separate component for better code splitting
const AlternativeTimes = ({ options }: { options: CommuteResultProps['result']['departureTimeOptions'] }) => (
  <div className="grid gap-2">
    {options.slice(0, 3).map((option, index) => (
      <div
        key={index}
        className="flex justify-between items-center p-2 bg-accent/50 rounded-md text-sm border border-accent/80"
      >
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" width={16} height={16} aria-hidden="true" />
          <span>Leave at {formatTime(parseTimeToDate(option.departureTime))}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4" width={16} height={16} aria-hidden="true" />
          <span>Arrive by {formatTime(parseTimeToDate(option.arrivalTime))}</span>
        </div>
      </div>
    ))}
  </div>
);

export function CommuteResult({ result }: CommuteResultProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [notificationSent, setNotificationSent] = useState(false)
  const [notificationsSupported, setNotificationsSupported] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Check if notifications are supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsSupported(true)
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true)
      }
    }
  }, [])

  // Send notification when it's time to leave
  useEffect(() => {
    if (!notificationsEnabled || notificationSent) return;
    
    const optimalDepartureDate = parseTimeToDate(result.optimalDepartureTime)
    const estimatedArrivalDate = parseTimeToDate(result.estimatedArrivalTime)
    
    if (!optimalDepartureDate || !estimatedArrivalDate) return;
    
    const timeUntilDeparture = optimalDepartureDate.getTime() - currentTime.getTime()

    // If it's within 15 minutes of optimal departure time, send notification
    if (timeUntilDeparture > 0 && timeUntilDeparture <= 15 * 60 * 1000) {
      try {
        new Notification("Time to leave for your destination!", {
          body: `Your optimal departure time is ${formatTime(optimalDepartureDate)}. Leave now to arrive by ${formatTime(estimatedArrivalDate)}.`, 
          icon: "/favicon.ico",
        })
        setNotificationSent(true)
      } catch (error) {
        // Silent fail if notification creation fails
      }
    }
  }, [currentTime, notificationsEnabled, notificationSent, result])

  const enableNotifications = async () => {
    if (!notificationsSupported) {
      alert("This browser does not support desktop notifications")
      return
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true)
    } else if (Notification.permission !== "denied") {
      try {
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          setNotificationsEnabled(true)
        }
      } catch (error) {
        // Silent fail if permission request fails
      }
    }
  }

  // Calculate traffic intensity (0-100)
  const trafficIntensity = (() => {
    switch (result.trafficCondition) {
      case "Light": return 25
      case "Moderate": return 50
      case "Heavy": return 75
      case "Very Heavy": return 90
      default: return 50
    }
  })()

  // Format duration in minutes
  const durationInMinutes = Math.round(result.durationInTraffic / 60)

  // Format distance in miles
  const formatDistance = (meters?: number) => {
    if (!meters) return "N/A"
    const miles = meters / 1609.34
    return `${miles.toFixed(1)} miles`
  }

  // Get traffic color based on condition
  const getTrafficColor = (condition: string) => {
    switch (condition) {
      case "Light": return "text-green-500"
      case "Moderate": return "text-yellow-500"
      case "Heavy": return "text-orange-500"
      case "Very Heavy": return "text-red-500"
      default: return "text-muted-foreground"
    }
  }

  // Load alternative times when user scrolls to that section
  useEffect(() => {
    const handleScroll = () => {
      if (!showAlternatives && window.scrollY > 200) {
        setShowAlternatives(true)
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showAlternatives]);

  return (
    <Card className="border border-transparent bg-gradient-to-br from-accent to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/5 opacity-20"></div>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Optimal Commute Time</CardTitle>
          <CardDescription>
            Based on real-time traffic data
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" width={20} height={20} aria-hidden="true" />
              <span className="text-sm font-medium">Optimal Departure</span>
            </div>
            <span className="text-xl font-bold">{formatTime(parseTimeToDate(result.optimalDepartureTime))}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" width={20} height={20} aria-hidden="true" />
              <span className="text-sm font-medium">Estimated Arrival</span>
            </div>
            <span className="text-xl font-bold">{formatTime(parseTimeToDate(result.estimatedArrivalTime))}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-orange-500" width={20} height={20} aria-hidden="true" />
              <span className="text-sm font-medium">Travel Time</span>
            </div>
            <span className="text-xl font-bold">{durationInMinutes} minutes</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-purple-500" width={20} height={20} aria-hidden="true" />
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
            aria-label="Traffic intensity"
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
          {showAlternatives ? <AlternativeTimes options={result.departureTimeOptions} /> : (
            <div className="h-[88px] flex items-center justify-center">
              <div className="animate-pulse bg-accent/30 rounded-md w-full h-20"></div>
            </div>
          )}
        </div>

        {notificationsSupported && !notificationsEnabled && (
          <Button
            onClick={enableNotifications}
            className="w-full flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            type="button"
          >
            <Bell className="h-4 w-4" width={16} height={16} aria-hidden="true" />
            Enable Departure Notifications
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

