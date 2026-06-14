import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X } from "lucide-react";

type Props = {
  onScan: (code: string) => void;
  onClose: () => void;
  /** When true: camera stays open after each scan, cooldown prevents duplicate reads */
  continuous?: boolean;
};

export function QRScanner({ onScan, onClose, continuous = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const cooldownRef = useRef(false);  // prevents duplicate reads of same label
  const [error, setError] = useState("");
  const [lastScanned, setLastScanned] = useState("");  // shows brief confirmation

  useEffect(() => {
    let active = true;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        tick();
      })
      .catch(() => setError("Camera not available. Allow camera permission and try again."));

    function tick() {
      if (!active || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA && !cooldownRef.current) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            if (continuous) {
              // Continuous mode: call onScan, show brief confirmation, resume after 1.5s
              cooldownRef.current = true;
              setLastScanned(code.data);
              onScan(code.data);
              setTimeout(() => {
                cooldownRef.current = false;
                setLastScanned("");
              }, 1500);
            } else {
              // Single mode: stop and close
              onScan(code.data);
              return;
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan, continuous]);

  // Continuous mode: render ONLY the camera feed — no overlay, no close button
  // The parent (ContinuousScanScreen) owns the full-screen layout and close logic
  if (continuous) {
    return (
      <div className="w-full bg-black">
        {error ? (
          <div className="mx-4 my-4 bg-terra-50 rounded-xl p-4 text-sm text-terra-700">{error}</div>
        ) : (
          <div className="relative">
            <video ref={videoRef} className="w-full" playsInline muted />
            {/* Scan frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-44 h-44 border-2 rounded-xl transition-all duration-300 ${
                lastScanned ? "border-green-400 bg-green-400/10" : "border-white/80"
              }`}>
                <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg ${lastScanned ? "border-green-400" : "border-brand-400"}`} />
                <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg ${lastScanned ? "border-green-400" : "border-brand-400"}`} />
                <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg ${lastScanned ? "border-green-400" : "border-brand-400"}`} />
                <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg ${lastScanned ? "border-green-400" : "border-brand-400"}`} />
                {lastScanned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-green-500 rounded-full p-2">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-2 left-0 right-0 text-center">
              {lastScanned
                ? <span className="text-green-400 font-bold text-sm">✓ Added!</span>
                : <span className="text-white/60 text-xs">Point camera at label QR code</span>
              }
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Single-scan mode: full-screen overlay with its own close button
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      <div className="relative w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-white font-semibold">
            {continuous ? "Scan Items / స్కాన్ చేయండి" : "Scan QR Code / QR కోడ్ స్కాన్ చేయి"}
          </p>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error ? (
          <div className="mx-4 bg-terra-50 rounded-xl p-4 text-sm text-terra-700">{error}</div>
        ) : (
          <div className="relative mx-4">
            <video ref={videoRef} className="w-full rounded-2xl" playsInline muted />
            {/* Scan frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-48 h-48 border-2 rounded-xl transition-all duration-300 ${
                lastScanned ? "border-green-400 bg-green-400/10" : "border-white/80"
              }`}>
                <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg ${lastScanned ? "border-green-400" : "border-brand-400"}`}></div>
                <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg ${lastScanned ? "border-green-400" : "border-brand-400"}`}></div>
                <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg ${lastScanned ? "border-green-400" : "border-brand-400"}`}></div>
                <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg ${lastScanned ? "border-green-400" : "border-brand-400"}`}></div>
                {lastScanned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-green-500 rounded-full p-2">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
        <p className="text-center text-xs mt-3 px-4">
          {lastScanned
            ? <span className="text-green-400 font-semibold">✓ Added!</span>
            : <span className="text-white/60">Point camera at label QR code</span>
          }
        </p>
      </div>
    </div>
  );
}
