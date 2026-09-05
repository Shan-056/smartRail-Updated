# Frontend Architecture

This folder organizes the frontend layer of the Mumbai Suburban Railway Intelligent Crowd & Transit Advisory application:

- **Components**:
  - `MapView.tsx`: Interactive Leaflet map with anti-collision station name positioning (Western offset West, Central/Harbour offset East) and smart junction/zoom clustering.
  - `JourneyPlanner.tsx`: Transit route planner with intelligent cross-line transfer logic blocks (e.g. Mumbai Central to Byculla switching at Dadar Junction), departure predictions, and 12-car coach occupancy density.
  - `StationPanel.tsx`: Live platform arrivals, crowd risk metrics, and platform CCTV breakdown.
  - `CorridorFilter.tsx`: Filter by Western, Central, Harbour, and Trans-Harbour corridors.
  - `LoginModal.tsx`: High z-index (z-5000) authentication portal with quick demo access.
  - `ControlRoomModal.tsx`: Real-time system monitoring, CCTV feed simulation, and crowd alerts.
- **Lib**:
  - `network.ts`: Line types, corridors, corridor colors, and station interface definitions.
  - `networkFallback.ts`: 102 Mumbai suburban stations dataset and transit route planning engine.
