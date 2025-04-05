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
  const [showAlternatives, setShowAlternatives] = useState(true)

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

  return (
    <Card className="border-0 bg-gradient-to-br from-indigo-900/30 to-purple-900/10 backdrop-blur-sm overflow-hidden rounded-xl shadow-xl relative border border-white/10">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/5 rounded-full blur-xl"></div>
      
      {/* Top texture */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600/50 via-indigo-500/50 to-blue-500/50"></div>
      
      <CardHeader className="relative z-10 pb-2">
        <div className="flex justify-between items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
              <div className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Result</div>
            </div>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">
              Optimal Travel Plan
            </CardTitle>
            <CardDescription className="text-gray-400">
              Based on real-time traffic analysis
            </CardDescription>
          </div>
          <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-lg p-2 backdrop-blur-sm border border-white/10">
            <Clock className="h-6 w-6 text-indigo-400" strokeWidth={1.5} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 relative z-10">
        {/* Main time values with vibrant gradients */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/20 backdrop-blur-sm rounded-xl p-4 border border-white/10 relative overflow-hidden group hover:from-indigo-800/40 hover:to-purple-800/20 transition-all">
            <div className="absolute inset-0 bg-grid-white/5 bg-grid-4 opacity-10"></div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-green-500/20 rounded-full blur-xl transform group-hover:scale-150 transition-transform"></div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-400" width={20} height={20} aria-hidden="true" />
              <span className="text-sm font-medium text-gray-300">Departure</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white tracking-tight">
              {formatTime(parseTimeToDate(result.optimalDepartureTime))}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/20 backdrop-blur-sm rounded-xl p-4 border border-white/10 relative overflow-hidden group hover:from-purple-800/40 hover:to-indigo-800/20 transition-all">
            <div className="absolute inset-0 bg-grid-white/5 bg-grid-4 opacity-10"></div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-blue-500/20 rounded-full blur-xl transform group-hover:scale-150 transition-transform"></div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" width={20} height={20} aria-hidden="true" />
              <span className="text-sm font-medium text-gray-300">Arrival</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white tracking-tight">
              {formatTime(parseTimeToDate(result.estimatedArrivalTime))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-900/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 relative overflow-hidden">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-orange-400" width={20} height={20} aria-hidden="true" />
              <span className="text-sm font-medium text-gray-300">Travel Time</span>
            </div>
            <div className="mt-2 text-xl font-bold text-white">
              {durationInMinutes} minutes
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 relative overflow-hidden">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-purple-400" width={20} height={20} aria-hidden="true" />
              <span className="text-sm font-medium text-gray-300">Distance</span>
            </div>
            <div className="mt-2 text-xl font-bold text-white">
              {formatDistance(result.distanceInMeters)}
            </div>
          </div>
        </div>

        {/* Traffic condition with more visual representation */}
        <div className="bg-gradient-to-br from-gray-900/70 to-gray-900/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 space-y-3">
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-300 font-medium">Traffic Conditions</span>
            <span className={`font-medium px-3 py-1 rounded-full text-xs ${
              result.trafficCondition === "Light" 
                ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                : result.trafficCondition === "Moderate"
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : result.trafficCondition === "Heavy" 
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}>
              {result.trafficCondition}
            </span>
          </div>
          
          <Progress
            value={trafficIntensity}
            className="h-2 bg-gray-800"
            aria-label="Traffic intensity"
            indicatorClassName={`bg-gradient-to-r ${
              trafficIntensity < 30
                ? "from-green-600 to-green-400"
                : trafficIntensity < 60
                  ? "from-yellow-600 to-yellow-400"
                  : "from-red-600 to-red-400"
            }`}
          />
        </div>

        {/* Alternative times with better visual separation */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            Alternative Departure Times
          </h3>
          
          {result.departureTimeOptions && result.departureTimeOptions.length > 0 ? (
            <div className="space-y-2">
              {result.departureTimeOptions.slice(0, 3).map((option, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gradient-to-r from-indigo-900/20 via-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-lg text-sm border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" width={16} height={16} aria-hidden="true" />
                    <span className="text-gray-300">Leave at <span className="text-white font-medium">{formatTime(parseTimeToDate(option.departureTime))}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-400" width={16} height={16} aria-hidden="true" />
                    <span className="text-gray-300">Arrive by <span className="text-white font-medium">{formatTime(parseTimeToDate(option.arrivalTime))}</span></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-indigo-900/20 border border-indigo-800/30 p-3 text-sm text-center text-gray-400">
              No alternative options available
            </div>
          )}
        </div>

        {notificationsSupported && !notificationsEnabled && (
          <Button
            onClick={enableNotifications}
            className="w-full relative overflow-hidden group"
            type="button"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:from-indigo-500 group-hover:to-purple-500 transition-all"></div>
            <span className="relative flex items-center justify-center gap-2">
              <Bell className="h-4 w-4" width={16} height={16} aria-hidden="true" />
              Enable Departure Notifications
            </span>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

