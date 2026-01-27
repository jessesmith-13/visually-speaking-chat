import { useState } from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Upload, Link as LinkIcon, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ImageUploadProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

export function ImageUpload({
  label = "Image",
  value,
  onChange,
  onUploadStart,
  onUploadEnd,
}: ImageUploadProps) {
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    onUploadStart?.();

    try {
      // Create unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `event-images/${fileName}`;

      console.log("📤 Uploading file:", filePath);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message || "Upload failed");
      }

      console.log("✅ Upload successful:", data);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(filePath);

      console.log("🔗 Public URL:", publicUrl);

      onChange(publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload image";
      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      onUploadEnd?.();
    }
  };

  const handleClearImage = () => {
    onChange("");
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* Method Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={uploadMethod === "url" ? "default" : "outline"}
          size="sm"
          onClick={() => setUploadMethod("url")}
          className="flex-1"
        >
          <LinkIcon className="size-4 mr-2" />
          URL
        </Button>
        <Button
          type="button"
          variant={uploadMethod === "file" ? "default" : "outline"}
          size="sm"
          onClick={() => setUploadMethod("file")}
          className="flex-1"
        >
          <Upload className="size-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* URL Input */}
      {uploadMethod === "url" && (
        <div className="space-y-2">
          <Input
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            Enter an image URL or leave blank for a default image
          </p>
        </div>
      )}

      {/* File Upload */}
      {uploadMethod === "file" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="flex-1"
            />
            {value && !isUploading && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleClearImage}
                title="Clear image"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          {isUploading && (
            <p className="text-sm text-blue-600">Uploading image...</p>
          )}
          <p className="text-sm text-gray-500">
            Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
          </p>
        </div>
      )}

      {/* Preview */}
      {value && !isUploading && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Preview:</p>
          <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
