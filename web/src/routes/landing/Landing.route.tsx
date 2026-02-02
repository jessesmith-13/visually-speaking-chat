import { Video, Users, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

export function LandingRoute() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Live Video Matchups: Your Next Signing Friend Awaits!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Meet random people through live video matchups in a fun,
            low-pressure space. Chat, sign in ASL, and connect with people from
            all over — enjoy spontaneous conversations, and have fun. 🤟✨
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/events")}>
              Browse Events
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">
          Why Visually Speaking?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Video className="size-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold">Video-Only</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Crystal clear video streaming optimized for sign language
                  communication
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Users className="size-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold">Random Matching</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Meet new people at every event through our smart pairing
                  system
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Shield className="size-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold">Safe & Secure</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ticketed events ensure a safe, moderated environment for
                  everyone
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Zap className="size-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold">Easy to Use</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Purchase a ticket, join the event, and start connecting
                  instantly
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 bg-gray-50 dark:bg-gray-900/50">
        <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">
          How It Works
        </h2>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="font-semibold mb-2 dark:text-white">
              Choose an Event
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Browse our upcoming events and select one that fits your schedule
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="font-semibold mb-2 dark:text-white">
              Purchase a Ticket
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Secure your spot with a simple one-time payment
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="font-semibold mb-2 dark:text-white">
              Start Connecting
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Join the event and get randomly paired with others to chat
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 dark:text-white">
            Ready to Connect?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Join our growing community and make meaningful connections today
          </p>
          <Button size="lg" onClick={() => navigate("/events")}>
            View Upcoming Events
          </Button>
        </div>
      </section>
    </div>
  );
}
