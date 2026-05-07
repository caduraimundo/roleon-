"use client";

import { useState, useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

import { events, type Event, type EventCategory } from "@/data/events";
import FilterBar, { type FilterOption } from "@/components/FilterBar";
import EventBottomSheet from "@/components/EventBottomSheet";

const OURO_PRETO = { lat: -20.3856, lng: -43.5035 };

const categoryPinColors: Record<EventCategory, { background: string; border: string }> = {
  Samba:     { background: "#F59E0B", border: "#D97706" },
  Pagode:    { background: "#8B5CF6", border: "#7C3AED" },
  MPB:       { background: "#3B82F6", border: "#2563EB" },
  Rock:      { background: "#EF4444", border: "#DC2626" },
  Funk:      { background: "#F97316", border: "#EA580C" },
  Sertanejo: { background: "#10B981", border: "#059669" },
};

function applyFilter(filter: FilterOption): Event[] {
  switch (filter) {
    case "Todos":     return events;
    case "Hoje":      return events.filter((e) => e.isToday);
    case "Grátis":    return events.filter((e) => e.isFree);
    default:          return events.filter((e) => e.category === filter);
  }
}

export default function MapClient() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("Todos");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const filteredEvents = applyFilter(activeFilter);

  const handleFilterChange = useCallback((filter: FilterOption) => {
    setActiveFilter(filter);
    setSelectedEvent(null);
  }, []);

  const handleMarkerClick = useCallback((event: Event) => {
    setSelectedEvent(event);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
      {/* relative container para que FilterBar e BottomSheet se posicionem dentro */}
      <div className="relative h-full w-full">
        <Map
          style={{ width: "100%", height: "100%" }}
          defaultCenter={OURO_PRETO}
          defaultZoom={15}
          mapId="ouro-preto-events"
          disableDefaultUI={false}
          gestureHandling="greedy"
        >
          {filteredEvents.map((event) => {
            const colors = categoryPinColors[event.category];
            return (
              <AdvancedMarker
                key={event.id}
                position={{ lat: event.lat, lng: event.lng }}
                title={event.name}
                onClick={() => handleMarkerClick(event)}
              >
                <Pin
                  background={colors.background}
                  borderColor={colors.border}
                  glyphColor="#fff"
                />
              </AdvancedMarker>
            );
          })}
        </Map>

        <FilterBar activeFilter={activeFilter} onFilterChange={handleFilterChange} />

        {selectedEvent && (
          <EventBottomSheet event={selectedEvent} onClose={handleClose} />
        )}
      </div>
    </APIProvider>
  );
}
