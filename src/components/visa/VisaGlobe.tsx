'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { countriesData, type CountryConfig } from './countries-data';

interface VisaGlobeProps {
  selectedCountry: CountryConfig | null;
  hoveredCountry: CountryConfig | null;
  onSelectCountry: (country: CountryConfig | null) => void;
  onHoverCountry: (country: CountryConfig | null) => void;
}

export default function VisaGlobe({
  selectedCountry,
  hoveredCountry,
  onSelectCountry,
  onHoverCountry,
}: VisaGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Interaction instructions overlay state
  const [interacted, setInteracted] = useState(false);

  // Screen-space label coordinates
  const [labels, setLabels] = useState<{ id: string; name: string; x: number; y: number; visible: boolean; available: boolean }[]>([]);
  const [continentLabels, setContinentLabels] = useState<{ name: string; x: number; y: number; visible: boolean; isOcean?: boolean }[]>([]);

  // Refs to pass state into requestAnimationFrame loop without re-triggering useEffect
  const stateRef = useRef({
    selectedCountry,
    hoveredCountry,
    onSelectCountry,
    onHoverCountry,
    interacted,
    setInteracted,
  });

  useEffect(() => {
    stateRef.current = {
      selectedCountry,
      hoveredCountry,
      onSelectCountry,
      onHoverCountry,
      interacted,
      setInteracted,
    };
  }, [selectedCountry, hoveredCountry, onSelectCountry, onHoverCountry, interacted]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 500;

    // 1. SCENE & CAMERA
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const globeGroup = new THREE.Group();
    // Default camera positioning showing Europe, Africa, Middle East, India
    globeGroup.rotation.y = 1.6; 
    scene.add(globeGroup);

    // 2. PROCEDURAL EARTH TEXTURE (FALLBACK AND GEOJSON RENDERING)
    const mapWidth = 2048;
    const mapHeight = 1024;
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = mapWidth;
    mapCanvas.height = mapHeight;
    const mapCtx = mapCanvas.getContext('2d');

    // Setup globe texture
    const globeTexture = new THREE.CanvasTexture(mapCanvas);

    function drawFallbackContinents(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = '#060919'; // ocean
      ctx.fillRect(0, 0, mapWidth, mapHeight);

      // Draw simple continents in white
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;

      const scaleX = mapWidth / 360;
      const scaleY = mapHeight / 180;

      // Draw simple approximation paths for offline fallback
      const drawApproxPoly = (pts: [number, number][]) => {
        ctx.beginPath();
        pts.forEach(([lng, lat], idx) => {
          const x = (lng + 180) * scaleX;
          const y = (90 - lat) * scaleY;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };

      // North America
      drawApproxPoly([[-168, 65], [-50, 60], [-50, 40], [-90, 15], [-110, 10], [-120, 30]]);
      // South America
      drawApproxPoly([[-80, 10], [-40, -10], [-60, -50], [-75, -50]]);
      // Eurasia
      drawApproxPoly([[10, 60], [170, 70], [160, 20], [100, 5], [75, 10], [40, 30]]);
      // Africa
      drawApproxPoly([[15, 30], [50, 10], [40, -30], [15, -30], [-15, 10]]);
      // Australia
      drawApproxPoly([[113, -20], [153, -15], [150, -38], [115, -35]]);
      // Greenland
      drawApproxPoly([[-60, 70], [-30, 70], [-40, 60]]);
    }

    if (mapCtx) {
      drawFallbackContinents(mapCtx);
      globeTexture.needsUpdate = true;
    }

    // Dynamic high-definition GeoJSON loader for detailed continents + state boundaries
    function drawGeoJson(ctx: CanvasRenderingContext2D, geojson: any) {
      ctx.fillStyle = '#060919'; // Clean deep ocean
      ctx.fillRect(0, 0, mapWidth, mapHeight);

      ctx.fillStyle = '#ffffff'; // Solid white landmasses
      ctx.strokeStyle = '#e2e8f0'; // Very clean, thin white/gray border lines
      ctx.lineWidth = 1.0;

      const scaleX = mapWidth / 360;
      const scaleY = mapHeight / 180;

      geojson.features.forEach((feature: any) => {
        const type = feature.geometry.type;
        const coordinates = feature.geometry.coordinates;

        const drawPolygon = (coords: [number, number][]) => {
          ctx.beginPath();
          coords.forEach((point, idx) => {
            const x = (point[0] + 180) * scaleX;
            const y = (90 - point[1]) * scaleY;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };

        if (type === 'Polygon') {
          drawPolygon(coordinates[0]);
        } else if (type === 'MultiPolygon') {
          coordinates.forEach((poly: any) => {
            drawPolygon(poly[0]);
          });
        }
      });
    }

    // Load lightweight Natural Earth GeoJSON for full country resolution
    fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
      .then((res) => res.json())
      .then((data) => {
        if (mapCtx) {
          drawGeoJson(mapCtx, data);
          globeTexture.needsUpdate = true;
        }
      })
      .catch((err) => {
        console.warn('GeoJSON fetch failed, using fallback continents layout:', err);
      });

    // 3. EARTH SPHERE
    const globeRadius = 5.2;
    const globeGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const globeMat = new THREE.MeshBasicMaterial({
      map: globeTexture,
      transparent: true,
      opacity: 0.95,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    // Subtle atmospheric bloom
    const atmosGeo = new THREE.SphereGeometry(globeRadius * 1.06, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    globeGroup.add(atmosphere);

    // Thin Orbital Connectors
    const orbitGroup = new THREE.Group();
    globeGroup.add(orbitGroup);

    const radius1 = globeRadius * 1.15;
    const ringGeo = new THREE.RingGeometry(radius1, radius1 + 0.005, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.y = 0.35;
    orbitGroup.add(ring);

    // 4. COUNTRY BEACONS & TARGET DOTS
    function latLngToVector3(lat: number, lng: number, r: number) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
        -r * Math.sin(phi) * Math.cos(theta)
      );
    }

    const countryBeacons: { countryId: string; line: THREE.Line; beacon: THREE.Mesh; initialColor: THREE.Color }[] = [];
    const interactionGroup = new THREE.Group();
    globeGroup.add(interactionGroup);

    countriesData.forEach((country) => {
      const pos = latLngToVector3(country.lat, country.lng, globeRadius);
      const direction = pos.clone().normalize();
      const beaconLength = country.available ? 0.7 : 0.4;
      const endPos = pos.clone().add(direction.clone().multiplyScalar(beaconLength));

      const beaconHex = country.available ? 0x10b981 : 0xf59e0b;
      const beaconColor = new THREE.Color(beaconHex);

      // Light-beam indicator line
      const points = [pos, endPos];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: beaconColor,
        transparent: true,
        opacity: 0.45,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      globeGroup.add(line);

      // Pulse Indicator point at tip of beacon
      const indicatorGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const indicatorMat = new THREE.MeshBasicMaterial({
        color: beaconColor,
        transparent: true,
        opacity: 0.9,
      });
      const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
      indicator.position.copy(endPos);
      globeGroup.add(indicator);

      countryBeacons.push({
        countryId: country.id,
        line,
        beacon: indicator,
        initialColor: beaconColor,
      });

      // Hitbox mesh for clicks
      const colliderGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const colliderMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
      });
      const collider = new THREE.Mesh(colliderGeo, colliderMat);
      collider.position.copy(pos);
      collider.userData = { country };
      interactionGroup.add(collider);
    });

    // Background Particle Stars
    const starGeo = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 200; i++) {
      const x = (Math.random() - 0.5) * 80;
      const y = (Math.random() - 0.5) * 80;
      const z = -20 - Math.random() * 20;
      starPositions.push(x, y, z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.25,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 5. INTERACTION ACTIONS
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let dragVelocity = { x: 0, y: 0 };
    const dampingFactor = 0.93;

    let targetRotationY: number | null = null;
    let targetRotationX: number | null = null;
    let autoRotateActive = true;
    let idleTimer: number | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      autoRotateActive = false;
      previousMousePosition = { x: e.clientX, y: e.clientY };
      if (idleTimer) window.clearTimeout(idleTimer);
      if (!stateRef.current.interacted) {
        stateRef.current.setInteracted(true);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        globeGroup.rotation.y += deltaX * 0.005;
        globeGroup.rotation.x += deltaY * 0.005;

        globeGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globeGroup.rotation.x));

        dragVelocity = { x: deltaX * 0.005, y: deltaY * 0.005 };
        previousMousePosition = { x: e.clientX, y: e.clientY };
      } else {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactionGroup.children);
        if (intersects.length > 0) {
          const country = intersects[0].object.userData.country as CountryConfig;
          if (stateRef.current.hoveredCountry?.id !== country.id) {
            stateRef.current.onHoverCountry(country);
            document.body.style.cursor = 'pointer';
          }
        } else {
          if (stateRef.current.hoveredCountry !== null) {
            stateRef.current.onHoverCountry(null);
            document.body.style.cursor = 'default';
          }
        }
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      resetIdleTimer();
    };

    const handleMouseClick = () => {
      if (Math.abs(dragVelocity.x) > 0.01 || Math.abs(dragVelocity.y) > 0.01) return;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactionGroup.children);
      if (intersects.length > 0) {
        const country = intersects[0].object.userData.country as CountryConfig;
        stateRef.current.onSelectCountry(country);
      }
    };

    // Mobile touch
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotateActive = false;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (idleTimer) window.clearTimeout(idleTimer);
        if (!stateRef.current.interacted) {
          stateRef.current.setInteracted(true);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;

        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        globeGroup.rotation.y += deltaX * 0.007;
        globeGroup.rotation.x += deltaY * 0.007;

        globeGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globeGroup.rotation.x));

        dragVelocity = { x: deltaX * 0.007, y: deltaY * 0.007 };
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
      resetIdleTimer();

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactionGroup.children);
      if (intersects.length > 0) {
        const country = intersects[0].object.userData.country as CountryConfig;
        stateRef.current.onSelectCountry(country);
      }
    };

    const resetIdleTimer = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        autoRotateActive = true;
      }, 4000);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.01;
      camera.position.z = Math.max(10, Math.min(22, camera.position.z));
      if (!stateRef.current.interacted) {
        stateRef.current.setInteracted(true);
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('click', handleMouseClick);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    renderer.domElement.addEventListener('touchstart', handleTouchStart);
    renderer.domElement.addEventListener('touchmove', handleTouchMove);
    renderer.domElement.addEventListener('touchend', handleTouchEnd);

    const focusOnCountry = (country: CountryConfig) => {
      const pos = latLngToVector3(country.lat, country.lng, globeRadius);
      const norm = pos.clone().normalize();
      targetRotationY = Math.atan2(norm.x, norm.z);
      targetRotationX = Math.asin(norm.y);
      autoRotateActive = false;
    };

    // Continent & Ocean Label Points
    const geographicLabels = [
      { name: 'EUROPE', lat: 50.0, lng: 15.0, isOcean: false },
      { name: 'AFRICA', lat: 5.0, lng: 20.0, isOcean: false },
      { name: 'ASIA', lat: 45.0, lng: 90.0, isOcean: false },
      { name: 'NORTH AMERICA', lat: 48.0, lng: -100.0, isOcean: false },
      { name: 'SOUTH AMERICA', lat: -15.0, lng: -60.0, isOcean: false },
      { name: 'AUSTRALIA', lat: -25.0, lng: 135.0, isOcean: false },
      // Oceans
      { name: 'North Atlantic Ocean', lat: 30.0, lng: -40.0, isOcean: true },
      { name: 'South Atlantic Ocean', lat: -25.0, lng: -15.0, isOcean: true },
      { name: 'Indian Ocean', lat: -20.0, lng: 80.0, isOcean: true },
    ];

    // 6. TICKER LOOP
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        globeGroup.rotation.y += dragVelocity.x;
        globeGroup.rotation.x += dragVelocity.y;

        dragVelocity.x *= dampingFactor;
        dragVelocity.y *= dampingFactor;
      }

      if (targetRotationY !== null && targetRotationX !== null) {
        const diffY = targetRotationY - globeGroup.rotation.y;
        const diffX = targetRotationX - globeGroup.rotation.x;
        const wrappedDiffY = Math.atan2(Math.sin(diffY), Math.cos(diffY));

        globeGroup.rotation.y += wrappedDiffY * 0.08;
        globeGroup.rotation.x += diffX * 0.08;

        if (Math.abs(wrappedDiffY) < 0.01 && Math.abs(diffX) < 0.01) {
          targetRotationY = null;
          targetRotationX = null;
        }
      } else if (autoRotateActive && !isDragging) {
        globeGroup.rotation.y += 0.0015;
      }

      // Pulse Beacons
      countryBeacons.forEach((item, index) => {
        const pulse = Math.sin(elapsed * 4 + index * 0.5) * 0.5 + 0.5;
        const mat = item.beacon.material as THREE.MeshBasicMaterial;

        const isCurrentHovered = stateRef.current.hoveredCountry?.id === item.countryId;
        const isCurrentSelected = stateRef.current.selectedCountry?.id === item.countryId;

        if (isCurrentSelected) {
          mat.color.setHex(0x10b981);
          item.beacon.scale.setScalar(1.6 + pulse * 0.4);
        } else if (isCurrentHovered) {
          mat.color.setHex(0x10b981);
          item.beacon.scale.setScalar(1.4 + pulse * 0.3);
        } else {
          mat.color.copy(item.initialColor);
          item.beacon.scale.setScalar(0.9 + pulse * 0.25);
        }
      });

      // Project 3D coordinate nodes to 2D labels
      const cameraDir = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);

      const updatedLabels = countriesData.map((country) => {
        const pos = latLngToVector3(country.lat, country.lng, globeRadius);
        pos.applyEuler(globeGroup.rotation);
        const dot = pos.clone().normalize().dot(cameraDir);
        const visible = dot > 0.35;

        pos.project(camera);

        const x = (pos.x * 0.5 + 0.5) * width;
        const y = (-pos.y * 0.5 + 0.5) * height;

        return {
          id: country.id,
          name: country.name,
          x,
          y,
          visible: visible && (country.featured || stateRef.current.selectedCountry?.id === country.id || stateRef.current.hoveredCountry?.id === country.id),
          available: country.available,
        };
      });

      setLabels(updatedLabels);

      // Project Continents & Oceans
      const updatedContinents = geographicLabels.map((item) => {
        const pos = latLngToVector3(item.lat, item.lng, globeRadius);
        pos.applyEuler(globeGroup.rotation);
        const dot = pos.clone().normalize().dot(cameraDir);
        const visible = dot > 0.35;

        pos.project(camera);

        const x = (pos.x * 0.5 + 0.5) * width;
        const y = (-pos.y * 0.5 + 0.5) * height;

        return {
          name: item.name,
          x,
          y,
          visible,
          isOcean: item.isOcean,
        };
      });

      setContinentLabels(updatedContinents);

      renderer.render(scene, camera);
    };

    animate();

    if (selectedCountry) {
      focusOnCountry(selectedCountry);
    }

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('click', handleMouseClick);
      renderer.domElement.removeEventListener('wheel', handleWheel);

      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      renderer.domElement.removeEventListener('touchend', handleTouchEnd);

      if (idleTimer) window.clearTimeout(idleTimer);

      globeGroup.clear();
      scene.clear();
      renderer.dispose();
    };
  }, [selectedCountry]);

  return (
    <div ref={containerRef} className="relative w-full h-[550px] md:h-[650px] overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2D Projected labels overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Country Labels */}
        {labels.map((label) => {
          if (!label.visible) return null;
          const isSelected = selectedCountry?.id === label.id;
          const isHovered = hoveredCountry?.id === label.id;

          return (
            <div
              key={label.id}
              className={`absolute transition-all duration-200 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold backdrop-blur-md shadow-md border ${
                isSelected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 scale-110 z-30'
                  : isHovered
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 scale-105 z-20'
                  : 'bg-slate-900/60 text-slate-200 border-white/5 z-10'
              }`}
              style={{ left: `${label.x}px`, top: `${label.y}px` }}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${label.available ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {label.name}
            </div>
          );
        })}

        {/* Continent and Ocean Labels */}
        {continentLabels.map((label, index) => {
          if (!label.visible) return null;
          return (
            <div
              key={`${label.name}-${index}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 font-bold uppercase pointer-events-none transition-opacity duration-300 ${
                label.isOcean
                  ? 'text-slate-500 italic font-medium tracking-normal text-[10px] sm:text-xs opacity-60'
                  : 'text-slate-400 tracking-[0.25em] text-[11px] sm:text-sm opacity-80'
              }`}
              style={{ left: `${label.x}px`, top: `${label.y}px` }}
            >
              {label.name}
            </div>
          );
        })}
      </div>

      {/* Micro instructions overlay */}
      {!interacted && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-950/70 border border-white/10 backdrop-blur-md text-[11px] text-slate-400 flex items-center gap-3 pointer-events-none transition-opacity duration-500">
          <span className="hidden md:inline">Drag to Rotate</span>
          <span className="md:hidden">Swipe to Rotate</span>
          <span className="text-white/20">•</span>
          <span className="hidden md:inline">Scroll to Zoom</span>
          <span className="md:hidden">Pinch to Zoom</span>
          <span className="text-white/20">•</span>
          <span>Click a Country</span>
        </div>
      )}
    </div>
  );
}
