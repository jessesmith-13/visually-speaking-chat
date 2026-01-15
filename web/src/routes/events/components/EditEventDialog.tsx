import { useState, useEffect } from 'react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Label } from '@/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { updateEvent } from '@/features/events/api';
import { toast } from 'sonner';

interface Event {
  id: string;
  name: string;
  description: string;
  date: string | Date;
  duration: number;
  price: number;
  capacity: number;
  imageUrl?: string;
}

interface EditEventDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: () => void;
}

interface EditForm {
  name: string;
  description: string;
  date: string;
  duration: number;
  price: number;
  capacity: number;
  imageUrl: string;
}

export function EditEventDialog({ event, open, onOpenChange, onEventUpdated }: EditEventDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    description: '',
    date: '',
    duration: 0,
    price: 0,
    capacity: 0,
    imageUrl: '',
  });

  // Initialize form when dialog opens or event changes
  useEffect(() => {
    if (open && event) {
      setEditForm({
        name: event.name,
        description: event.description,
        date: new Date(event.date).toISOString().slice(0, 16), // Format for datetime-local input
        duration: event.duration,
        price: event.price,
        capacity: event.capacity,
        imageUrl: event.imageUrl || '',
      });
    }
  }, [open, event]);

  const handleUpdate = async () => {
    if (!editForm.name.trim()) {
      toast.error('Please enter an event name');
      return;
    }
    
    if (!editForm.description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    if (!editForm.date) {
      toast.error('Please select a date');
      return;
    }
    
    if (editForm.duration <= 0) {
      toast.error('Duration must be greater than 0');
      return;
    }
    
    if (editForm.price < 0) {
      toast.error('Price cannot be negative');
      return;
    }
    
    if (editForm.capacity <= 0) {
      toast.error('Capacity must be greater than 0');
      return;
    }
    
    setIsUpdating(true);
    
    try {
      console.log('✏️ Updating event via Edge Function...');
      
      await updateEvent(event.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        date: new Date(editForm.date),
        duration: editForm.duration,
        price: editForm.price,
        capacity: editForm.capacity,
        imageUrl: editForm.imageUrl.trim() || undefined,
      });
      
      console.log('✅ Event updated successfully');
      
      toast.success('Event updated successfully!');
      
      // Close dialog and notify parent
      onOpenChange(false);
      onEventUpdated();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
      console.error('Error updating event:', error);
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update the details for "{event.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Event Name</Label>
            <Input 
              id="edit-name"
              placeholder="e.g., ASL Meetup Night" 
              value={editForm.name} 
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea 
              id="edit-description"
              placeholder="Enter event description..." 
              value={editForm.description} 
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-date">Date and Time</Label>
            <Input 
              id="edit-date"
              type="datetime-local" 
              value={editForm.date} 
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration (minutes)</Label>
              <Input 
                id="edit-duration"
                type="number" 
                min="1"
                value={editForm.duration} 
                onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price ($)</Label>
              <Input 
                id="edit-price"
                type="number" 
                min="0"
                step="0.01"
                value={editForm.price} 
                onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-capacity">Capacity</Label>
            <Input 
              id="edit-capacity"
              type="number" 
              min="1"
              value={editForm.capacity} 
              onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-image">Image URL (optional)</Label>
            <Input 
              id="edit-image"
              placeholder="https://example.com/image.jpg" 
              value={editForm.imageUrl} 
              onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}