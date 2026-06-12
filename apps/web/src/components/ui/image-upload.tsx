import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";

type ImageUploadProps = {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
};

// Compress image to JPEG at max 1400px wide/tall, ~80% quality.
// Reduces a 5MB camera photo to ~200-400KB without visible quality loss.
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.80));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Compress regardless of size — camera photos from tablets can be 3-8MB
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } catch {
      alert("Could not process image. Please try a different photo.");
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-brand-200">
          <img src={value} alt="preview" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute right-1 top-1 rounded-full bg-white/80 p-0.5 text-terra-500 hover:bg-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-200 text-brand-400 hover:border-brand-400 hover:text-brand-600"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="mt-1 text-xs">Upload</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  );
}
