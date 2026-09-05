"use client";
// ============================================================
// components/StationMapModal.tsx
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// The "2D/3D station map with heatmap" feature. Fetches
// GET /api/stations/:id/heatmap (one crowd-intensity number per
// physical zone — each platform, the concourse, the entry gate)
// and renders it two ways, switchable with a toggle:
//   - 2D: a flat SVG floor plan, each zone colored on a
//     green -> yellow -> red scale by how crowded it is.
//   - 3D: the same zones as extruded blocks in a Three.js scene,
//     using height AND color together to show intensity, with
//     mouse-drag orbit controls so it can be viewed from any angle.
// ============================================================

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ZoneReading {
  zone: string;
  intensityPercent: number;
  sampled: boolean;
}

interface HeatmapData {
  station: { id: string; code: string; name: string; platformCount: number };
  overallDensityPercent: number;
  zones: ZoneReading[];
  generatedAt: string;
}

function intensityColor(percent: number): string {
  // 0% -> green, 50% -> amber, 100%+ -> red
  const clamped = Math.max(0, Math.min(140, percent));
  const hue = 130 - Math.min(130, (clamped / 100) * 130); // 130=green, 0=red
  return `hsl(${hue}, 75%, 48%)`;
}

export default function StationMapModal({ stationId, stationName, onClose }: { stationId: string; stationName: string; onClose: () => void }) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [data, setData] = useState<HeatmapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/stations/${stationId}/heatmap`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to load heatmap.");
        setData(json);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [stationId]);

  // ---- 3D scene setup, only when mode === "3d" and data is ready ----
  useEffect(() => {
    if (mode !== "3d" || !data || !canvasHostRef.current) return;
    const host = canvasHostRef.current;
    host.innerHTML = "";

    const width = host.clientWidth;
    const height = host.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x11141b);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 9, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.1;

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x1c202b })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const zones = data.zones;
    const spacing = 2.4;
    const startX = -((zones.length - 1) * spacing) / 2;

    zones.forEach((z, i) => {
      const heightScale = Math.max(0.3, Math.min(4, z.intensityPercent / 25));
      const color = new THREE.Color(intensityColor(z.intensityPercent));
      const geometry = new THREE.BoxGeometry(1.6, heightScale, 1.6);
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15 });
      const box = new THREE.Mesh(geometry, material);
      box.position.set(startX + i * spacing, heightScale / 2, 0);
      scene.add(box);
    });

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      host.innerHTML = "";
    };
  }, [mode, data]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold">{stationName} — station map</h2>
            {data && <p className="text-xs text-[rgb(var(--text-muted))]">Overall density: {data.overallDensityPercent}%</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-[rgb(var(--border))] p-0.5 text-xs">
              <button
                onClick={() => setMode("2d")}
                className={`rounded-full px-3 py-1 ${mode === "2d" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))]"}`}
              >
                2D
              </button>
              <button
                onClick={() => setMode("3d")}
                className={`rounded-full px-3 py-1 ${mode === "3d" ? "bg-brand-600 text-white" : "text-[rgb(var(--text-muted))]"}`}
              >
                3D
              </button>
            </div>
            <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]" aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {!error && !data && <p className="text-sm text-[rgb(var(--text-muted))]">Loading heatmap...</p>}

          {data && mode === "2d" && (
            <div className="flex h-full flex-wrap content-start gap-3">
              {data.zones.map((z) => (
                <div
                  key={z.zone}
                  className="flex h-28 w-28 flex-col items-center justify-center rounded-xl text-center text-white shadow-sm"
                  style={{ background: intensityColor(z.intensityPercent) }}
                  title={z.sampled ? "Live camera reading" : "No live reading yet — showing station average"}
                >
                  <span className="text-xs font-medium capitalize opacity-90">{z.zone.replace("-", " ")}</span>
                  <span className="text-lg font-bold">{z.intensityPercent}%</span>
                </div>
              ))}
            </div>
          )}

          {data && mode === "3d" && <div ref={canvasHostRef} className="h-full w-full overflow-hidden rounded-xl" />}
        </div>
      </div>
    </div>
  );
}
