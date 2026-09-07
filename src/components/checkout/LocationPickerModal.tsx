import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Check, Crosshair } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

// Fix Leaflet default icon asset paths in Vite bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (locationData: { address: string; lat: number; lng: number }) => void;
}

export function LocationPickerModal({
  open,
  onOpenChange,
  initialLat,
  initialLng,
  onConfirm,
}: LocationPickerModalProps) {
  const { language } = useI18n();
  const ar = language === "ar";

  // Default Cairo coordinates if none provided
  const defaultLat = initialLat || 30.0444;
  const defaultLng = initialLng || 31.2357;

  const [lat, setLat] = useState<number>(defaultLat);
  const [lng, setLng] = useState<number>(defaultLng);
  const [address, setAddress] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Sync state if initial props change
  useEffect(() => {
    if (initialLat && initialLng) {
      setLat(initialLat);
      setLng(initialLng);
    }
  }, [initialLat, initialLng]);

  // Reverse Geocoding function using Nominatim OpenStreetMap API
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=${ar ? "ar" : "en"}`
      );
      if (!response.ok) throw new Error("Network error");
      const data = await response.json();

      if (data && (data.display_name || data.address)) {
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.street || "";
        const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || "";
        const city = addr.city || addr.town || addr.governorate || addr.state || "";

        let formatted = [road, suburb, city].filter(Boolean).join("، ");
        if (!formatted.trim()) {
          formatted = data.display_name || "";
        }
        setAddress(formatted);
      }
    } catch (err) {
      console.warn("Reverse geocoding error:", err);
      // Fallback: keep existing address or leave empty for user to edit manually
    } finally {
      setIsGeocoding(false);
    }
  };

  // Initialize Leaflet map when modal opens
  useEffect(() => {
    if (!open) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const currentLat = lat;
    const currentLng = lng;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([currentLat, currentLng], 14);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap",
        }).addTo(map);

        const marker = L.marker([currentLat, currentLng], { draggable: true }).addTo(map);

        marker.on("dragend", (e: any) => {
          const position = e.target.getLatLng();
          setLat(position.lat);
          setLng(position.lng);
          reverseGeocode(position.lat, position.lng);
        });

        map.on("click", (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          setLat(e.latlng.lat);
          setLng(e.latlng.lng);
          reverseGeocode(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        // Perform initial reverse geocode
        reverseGeocode(currentLat, currentLng);
      } else {
        mapInstanceRef.current.setView([currentLat, currentLng], 14);
        markerRef.current?.setLatLng([currentLat, currentLng]);
        mapInstanceRef.current.invalidateSize();
      }

      // Always auto-detect location when opening modal
      setTimeout(() => {
        handleRecenterLocation();
      }, 250);
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [open]);

  // Handle re-geolocating current browser position inside map modal
  const handleRecenterLocation = () => {
    if (!navigator.geolocation) {
      toast.error(ar ? "المتصفح لا يدعم تحديد الموقع" : "Geolocation is not supported by your browser");
      return;
    }
    setIsGeocoding(true);
    let resolved = false;

    const onSuccess = (latitude: number, longitude: number) => {
      if (resolved) return;
      resolved = true;
      setLat(latitude);
      setLng(longitude);
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([latitude, longitude], 15);
        markerRef.current.setLatLng([latitude, longitude]);
      }
      reverseGeocode(latitude, longitude);
    };

    const onError = () => {
      if (resolved) return;
      resolved = true;
      setIsGeocoding(false);
      toast.info(
        ar
          ? "تعذر الحصول على موقعك الحالي تلقائياً. يمكنك تحريك العلامة يدويًا."
          : "Could not auto-detect location. You can drag the marker manually."
      );
    };

    // Strategy: First try fast low-accuracy (returns in ~50ms on Laptops/PCs via Wi-Fi/IP)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSuccess(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("Low accuracy geolocation failed, trying high accuracy...", err);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            onSuccess(pos.coords.latitude, pos.coords.longitude);
          },
          (highErr) => {
            console.warn("High accuracy geolocation failed:", highErr);
            onError();
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
    );
  };

  const handleConfirm = () => {
    onConfirm({
      address: address.trim(),
      lat,
      lng,
    });
    onOpenChange(false);
    toast.success(ar ? "📍 تم تحديد موقعك بنجاح!" : "📍 Location confirmed successfully!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] rounded-2xl p-4 sm:p-6" dir={ar ? "rtl" : "ltr"}>
        <DialogHeader className="text-start">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            {ar ? "تحديد موقع التسليم على الخريطة" : "Set Delivery Location"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {ar
              ? "يمكنك تحريك الدبوس أو الضغط على زر تحديد موقعك التلقائي أدناه."
              : "Drag the marker or use the auto-detect button below."}
          </DialogDescription>
        </DialogHeader>

        {/* Map Container */}
        <div className="relative my-2 rounded-xl overflow-hidden border border-border shadow-inner">
          <div ref={mapContainerRef} className="w-full h-64 sm:h-80 z-0 bg-secondary/30" />

          {/* Prominent Overlay Recenter Button */}
          <button
            type="button"
            onClick={handleRecenterLocation}
            disabled={isGeocoding}
            className="absolute top-3 start-3 z-[500] bg-primary text-primary-foreground font-bold px-3 py-2 rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center gap-2 text-xs border border-white/20 cursor-pointer active:scale-95"
            title={ar ? "تحديد موقعي الحالي" : "Detect my position"}
          >
            <Crosshair className={`w-4 h-4 ${isGeocoding ? "animate-spin" : ""}`} />
            <span>{ar ? "📍 موقعي الحالي" : "My Location"}</span>
          </button>
        </div>

        {/* Big Dedicated Auto-Locate Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleRecenterLocation}
          disabled={isGeocoding}
          className="w-full text-xs font-bold py-2.5 h-auto flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-dashed border-primary/40 rounded-xl transition-all"
        >
          {isGeocoding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>{ar ? "جاري جلب موقعك..." : "Detecting position..."}</span>
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4 text-primary" />
              <span>{ar ? "🎯 تحديد موقعي الحالي تلقائياً على الخريطة" : "🎯 Auto-Detect My Current Location"}</span>
            </>
          )}
        </Button>

        {/* Extracted Address Info & Manual Input */}
        <div className="space-y-1.5 bg-secondary/40 p-3 rounded-xl border border-border/60">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>{ar ? "العنوان المتوقع من الخريطة:" : "Address from map:"}</span>
            {isGeocoding && (
              <span className="flex items-center gap-1 text-[11px] text-primary">
                <Loader2 className="w-3 h-3 animate-spin" />
                {ar ? "جاري تحويل الإحداثيات..." : "Geocoding..."}
              </span>
            )}
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={ar ? "أدخل أو عدّل العنوان هنا..." : "Edit or enter address here..."}
            className="w-full text-xs rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs py-2.5"
          >
            {ar ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto bg-primary text-primary-foreground text-xs font-bold py-2.5 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {ar ? "تأكيد واستخدام هذا العنوان" : "Confirm & Use Location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
