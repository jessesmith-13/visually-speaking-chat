import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Video,
  MapPin,
} from "lucide-react";
import { useApp } from "@/app/hooks";
import { toast } from "sonner";

export function CreateEventRoute() {
  const navigate = useNavigate();
  const { addEvent, user } = useApp();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: "",
    time: "",
    duration: "",
    price: "",
    capacity: "",
    imageUrl: "",
    eventType: "virtual" as "virtual" | "in-person",
    venueName: "",
    venueAddress: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.date || !formData.time) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Combine date and time
    const dateTime = new Date(`${formData.date}T${formData.time}`);

    // Create new event
    const newEvent = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      date: dateTime,
      duration: parseInt(formData.duration) || 90,
      price: parseFloat(formData.price) || 0,
      capacity: parseInt(formData.capacity) || 50,
      attendees: 0,
      imageUrl:
        formData.imageUrl ||
        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
      status: "upcoming" as const,
      createdBy: user?.id || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      eventType: formData.eventType,
      venueName: formData.venueName,
      venueAddress: formData.venueAddress,
    };

    try {
      await addEvent(newEvent);
      toast.success("Event created successfully!");

      // Reset form
      setFormData({
        name: "",
        description: "",
        date: "",
        time: "",
        duration: "",
        price: "",
        capacity: "",
        imageUrl: "",
        eventType: "virtual",
        venueName: "",
        venueAddress: "",
      });

      // Navigate to events page after a short delay
      setTimeout(() => {
        navigate("/events");
      }, 1500);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create event. Please try again.";
      console.error("Failed to create event:", error);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/events")}
            className="mb-4"
          >
            <ArrowLeft className="size-4 mr-2" />
            Back to Events
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Create New Event
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Fill in the details to create a new Visually Speaking event
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Friday Night Connections"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what makes this event special..."
                  rows={4}
                  required
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    Date *
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-2">
                    <Clock className="size-4" />
                    Time *
                  </Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Duration, Price, Capacity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="flex items-center gap-2">
                    <Clock className="size-4" />
                    Duration (min)
                  </Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="90"
                    min="15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="flex items-center gap-2">
                    <DollarSign className="size-4" />
                    Price ($)
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="15.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity" className="flex items-center gap-2">
                    <Users className="size-4" />
                    Capacity
                  </Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={handleChange}
                    placeholder="50"
                    min="1"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://images.unsplash.com/..."
                />
                <p className="text-sm text-gray-500">
                  Enter an image URL or leave blank for a default image
                </p>
              </div>

              {/* Event Type */}
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <input
                      id="virtual"
                      type="radio"
                      name="eventType"
                      value="virtual"
                      checked={formData.eventType === "virtual"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <Video className="size-4" />
                    Virtual
                  </div>
                  <div className="flex items-center">
                    <input
                      id="in-person"
                      type="radio"
                      name="eventType"
                      value="in-person"
                      checked={formData.eventType === "in-person"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <MapPin className="size-4" />
                    In-Person
                  </div>
                </div>
              </div>

              {/* Venue Name and Address */}
              {formData.eventType === "in-person" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="venueName">Venue Name</Label>
                    <Input
                      id="venueName"
                      name="venueName"
                      value={formData.venueName}
                      onChange={handleChange}
                      placeholder="e.g., The Grand Ballroom"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="venueAddress">Venue Address</Label>
                    <Input
                      id="venueAddress"
                      name="venueAddress"
                      value={formData.venueAddress}
                      onChange={handleChange}
                      placeholder="e.g., 123 Main St, Anytown, USA"
                    />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/events")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create Event
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
