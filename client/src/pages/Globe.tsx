import { ArrowLeft, ChevronDown, ExternalLink, Globe2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Link } from "wouter";
import { GLOBE_PROFILES, type GlobeProfile } from "@shared/globeProfiles";
import { trpc } from "@/lib/trpc";

type CountryFeature = {
  type: "Feature";
  properties: {
    name: string;
    shortName: string;
    iso3: string;
    continent: string;
    subregion: string;
    population: number;
    gdp: number;
    centroid: {
      lat: number;
      lon: number;
    };
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type CityLight = {
  name: string;
  country: string;
  population: number;
  lat: number;
  lon: number;
};

type GlobeData = {
  type: "FeatureCollection";
  features: CountryFeature[];
};

type ArcAnimation = {
  line?: THREE.Line;
  mesh?: THREE.Mesh;
  pulseLines?: THREE.Line[];
  curve: THREE.QuadraticBezierCurve3;
  startedAt: number;
  duration: number;
  pulse?: boolean;
};

const GLOBE_RADIUS = 2;
const COUNTRIES_URL = "/globe/countries-110m.json";
const CITY_LIGHTS_URL = "/globe/city-lights-110m.json";
const EARTH_TEXTURE_URL = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
const EARTH_BUMP_URL = "https://threejs.org/examples/textures/planets/earth_bump_2048.jpg";
const EARTH_TEXTURE_LONGITUDE_OFFSET = 0.25;
const PROFILE_CONNECTIONS: Record<string, string[]> = {
  iran: ["china", "soviet-union", "north-korea", "palestine", "lebanon"],
  china: ["north-korea", "soviet-union"],
  "north-korea": ["soviet-union", "china", "iran", "palestine"],
  cuba: ["angola", "china", "soviet-union"],
  europe: ["united-states"],
};
const US_IRAN_CONNECTION = ["united-states", "iran"];
const EUROPE_UKRAINE_CONNECTION = ["europe", "UKR"];
const TERMINAL_BOOT_LINES = [
  "opening world module...",
  "loading countries...",
  "loading statistics...",
  "loading alliances...",
  "simplifying country geometry...",
  "loading revolutionary fronts...",
  "calibrating globe projection...",
  "warming render pipeline...",
  "done",
];

function latLonToVector(lat: number, lon: number, radius = GLOBE_RADIUS) {
  const latRad = THREE.MathUtils.degToRad(lat);
  const lonRad = THREE.MathUtils.degToRad(lon);

  return new THREE.Vector3(
    radius * Math.cos(latRad) * Math.sin(lonRad),
    radius * Math.sin(latRad),
    radius * Math.cos(latRad) * Math.cos(lonRad)
  );
}

function forEachRing(
  geometry: CountryFeature["geometry"],
  callback: (ring: number[][]) => void
) {
  if (geometry.type === "Polygon") {
    (geometry.coordinates as number[][][]).forEach(callback);
    return;
  }

  (geometry.coordinates as number[][][][]).forEach((polygon) => polygon.forEach(callback));
}

function forEachPolygon(
  geometry: CountryFeature["geometry"],
  callback: (polygon: number[][][]) => void
) {
  if (geometry.type === "Polygon") {
    callback(geometry.coordinates as number[][][]);
    return;
  }

  (geometry.coordinates as number[][][][]).forEach(callback);
}

function buildMultiCountryLineGeometry(countries: CountryFeature[], radius: number) {
  const positions: number[] = [];

  countries.forEach((country) => {
    forEachRing(country.geometry, (ring) => {
      for (let index = 0; index < ring.length - 1; index += 1) {
        const [lonA, latA] = ring[index];
        const [lonB, latB] = ring[index + 1];
        const pointA = latLonToVector(latA, lonA, radius);
        const pointB = latLonToVector(latB, lonB, radius);

        positions.push(pointA.x, pointA.y, pointA.z, pointB.x, pointB.y, pointB.z);
      }
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function buildCountryHatchLineGeometry(country: CountryFeature, radius: number) {
  const positions: number[] = [];

  forEachPolygon(country.geometry, (polygon) => {
    const outerRing = polygon[0];
    if (!outerRing) return;

    const lonValues = outerRing.map(([lon]) => lon);
    const latValues = outerRing.map(([, lat]) => lat);
    const minLon = Math.min(...lonValues);
    const maxLon = Math.max(...lonValues);
    const minLat = Math.min(...latValues);
    const maxLat = Math.max(...latValues);
    const lonSpan = Math.max(maxLon - minLon, 0.01);
    const latSpan = Math.max(maxLat - minLat, 0.01);

    for (let lineIndex = -1; lineIndex <= 5; lineIndex += 1) {
      let segmentStart: THREE.Vector3 | null = null;
      let previousPoint: THREE.Vector3 | null = null;

      for (let step = 0; step <= 72; step += 1) {
        const progress = step / 72;
        const lon = minLon + lonSpan * progress;
        const lat = minLat + latSpan * (progress + (lineIndex - 2) / 4.2);
        const inside = pointInPolygon(lon, lat, polygon);

        if (inside) {
          const point = latLonToVector(lat, lon, radius);
          segmentStart ??= point;
          previousPoint = point;
        } else if (segmentStart && previousPoint && segmentStart.distanceTo(previousPoint) > 0.015) {
          positions.push(segmentStart.x, segmentStart.y, segmentStart.z, previousPoint.x, previousPoint.y, previousPoint.z);
          segmentStart = null;
          previousPoint = null;
        }
      }

      if (segmentStart && previousPoint && segmentStart.distanceTo(previousPoint) > 0.015) {
        positions.push(segmentStart.x, segmentStart.y, segmentStart.z, previousPoint.x, previousPoint.y, previousPoint.z);
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function buildAllCountryLines(countries: CountryFeature[], radius: number) {
  const positions: number[] = [];

  countries.forEach((country) => {
    forEachRing(country.geometry, (ring) => {
      for (let index = 0; index < ring.length - 1; index += 1) {
        const [lonA, latA] = ring[index];
        const [lonB, latB] = ring[index + 1];
        const pointA = latLonToVector(latA, lonA, radius);
        const pointB = latLonToVector(latB, lonB, radius);

        positions.push(pointA.x, pointA.y, pointA.z, pointB.x, pointB.y, pointB.z);
      }
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function getProfileCentroid(countries: CountryFeature[]) {
  if (countries.length === 0) return { lat: 18, lon: 20 };

  const center = countries
    .map((country) => latLonToVector(country.properties.centroid.lat, country.properties.centroid.lon, 1))
    .reduce((sum, point) => sum.add(point), new THREE.Vector3())
    .normalize();

  return {
    lat: THREE.MathUtils.radToDeg(Math.asin(center.y)),
    lon: THREE.MathUtils.radToDeg(Math.atan2(center.x, center.z)),
  };
}

function vectorToLatLon(vector: THREE.Vector3) {
  const normalized = vector.clone().normalize();

  return {
    lat: THREE.MathUtils.radToDeg(Math.asin(normalized.y)),
    lon: THREE.MathUtils.radToDeg(Math.atan2(normalized.x, normalized.z)),
  };
}

function pointInRing(lon: number, lat: number, ring: number[][]) {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [lonA, latA] = ring[index];
    const [lonB, latB] = ring[previous];
    const intersects = latA > lat !== latB > lat && lon < ((lonB - lonA) * (lat - latA)) / (latB - latA) + lonA;

    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygon(lon: number, lat: number, polygon: number[][][]) {
  const [outerRing, ...holes] = polygon;
  if (!outerRing || !pointInRing(lon, lat, outerRing)) return false;
  return !holes.some((hole) => pointInRing(lon, lat, hole));
}

function countryContainsLatLon(country: CountryFeature, lat: number, lon: number) {
  let contains = false;

  forEachPolygon(country.geometry, (polygon) => {
    if (!contains && pointInPolygon(lon, lat, polygon)) {
      contains = true;
    }
  });

  return contains;
}

function resolveProfileCountries(
  profile: GlobeProfile,
  countries: CountryFeature[],
  countryByIso3 = new Map(countries.map((country) => [country.properties.iso3, country]))
) {
  const resolvedCountries = new Set<CountryFeature>();

  profile.iso3s.forEach((code) => {
    if (code.startsWith("name:")) {
      const targetName = code.slice("name:".length).trim().toLowerCase();
      const country = countries.find((item) => {
        return (
          item.properties.name.toLowerCase() === targetName ||
          item.properties.shortName.toLowerCase() === targetName
        );
      });

      if (country) resolvedCountries.add(country);
      return;
    }

    const country = countryByIso3.get(code);
    if (country) resolvedCountries.add(country);
  });

  return Array.from(resolvedCountries);
}

function buildArcGeometry(start: { lat: number; lon: number }, end: { lat: number; lon: number }) {
  const curve = buildArcCurve(start, end);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(96));
  return geometry;
}

function buildArcCurve(start: { lat: number; lon: number }, end: { lat: number; lon: number }) {
  const startVector = latLonToVector(start.lat, start.lon, GLOBE_RADIUS * 1.085);
  const endVector = latLonToVector(end.lat, end.lon, GLOBE_RADIUS * 1.085);
  const midVector = startVector
    .clone()
    .add(endVector)
    .normalize()
    .multiplyScalar(GLOBE_RADIUS * 1.26);

  return new THREE.QuadraticBezierCurve3(startVector, midVector, endVector);
}

function buildPolygonSurfaceGeometry(
  polygon: number[][][],
  radius: number,
  flagFocus?: GlobeProfile["flagFocus"]
) {
  const outerRing = polygon[0];
  if (!outerRing || outerRing.length < 4) return null;

  const lonValues = outerRing.map(([lon]) => lon);
  const latValues = outerRing.map(([, lat]) => lat);
  const minLon = Math.min(...lonValues);
  const maxLon = Math.max(...lonValues);
  const minLat = Math.min(...latValues);
  const maxLat = Math.max(...latValues);
  const lonSpan = Math.max(maxLon - minLon, 0.01);
  const latSpan = Math.max(maxLat - minLat, 0.01);

  if (lonSpan > 220) return null;

  const lonSteps = THREE.MathUtils.clamp(Math.ceil(lonSpan * 4.2), 18, 180);
  const latSteps = THREE.MathUtils.clamp(Math.ceil(latSpan * 4.2), 18, 180);
  const positions: number[] = [];
  const uvs: number[] = [];

  const pushVertex = (lon: number, lat: number) => {
    const point = latLonToVector(lat, lon, radius);
    const baseU = (lon - minLon) / lonSpan;
    const baseV = (lat - minLat) / latSpan;
    const focusedU = flagFocus ? (baseU - 0.5) / flagFocus.scale + flagFocus.u : baseU;
    const focusedV = flagFocus ? (baseV - 0.5) / flagFocus.scale + flagFocus.v : baseV;

    positions.push(point.x, point.y, point.z);
    uvs.push(focusedU, focusedV);
  };

  for (let yIndex = 0; yIndex < latSteps; yIndex += 1) {
    const latA = minLat + (latSpan * yIndex) / latSteps;
    const latB = minLat + (latSpan * (yIndex + 1)) / latSteps;

    for (let xIndex = 0; xIndex < lonSteps; xIndex += 1) {
      const lonA = minLon + (lonSpan * xIndex) / lonSteps;
      const lonB = minLon + (lonSpan * (xIndex + 1)) / lonSteps;
      const centerLon = (lonA + lonB) / 2;
      const centerLat = (latA + latB) / 2;

      if (!pointInPolygon(centerLon, centerLat, polygon)) continue;

      pushVertex(lonA, latA);
      pushVertex(lonB, latA);
      pushVertex(lonB, latB);
      pushVertex(lonA, latA);
      pushVertex(lonB, latB);
      pushVertex(lonA, latB);
    }
  }

  if (positions.length === 0) {
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  return geometry;
}

function buildCountrySurfaceGroup(
  countries: CountryFeature[],
  flagTexture: THREE.Texture | null,
  radius: number,
  flagFocus?: GlobeProfile["flagFocus"],
  options?: {
    glowColor?: number;
    glowOpacity?: number;
    flagOpacity?: number;
  }
) {
  const group = new THREE.Group();
  const glowMaterials: THREE.MeshBasicMaterial[] = [];
  const glowColor = options?.glowColor ?? 0xff1235;
  const glowOpacity = options?.glowOpacity ?? 0.2;
  const flagOpacity = options?.flagOpacity ?? 0.36;

  countries.forEach((country) => {
    forEachPolygon(country.geometry, (polygon) => {
      const geometry = buildPolygonSurfaceGeometry(polygon, radius, flagFocus);
      if (!geometry) return;

      const glowMaterial = new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: glowOpacity,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      glowMaterials.push(glowMaterial);

      const glowMesh = new THREE.Mesh(geometry.clone(), glowMaterial);
      group.add(glowMesh);

      if (flagTexture) {
        const flagMaterial = new THREE.MeshBasicMaterial({
          map: flagTexture,
          transparent: true,
          opacity: flagOpacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const flagMesh = new THREE.Mesh(geometry, flagMaterial);
        group.add(flagMesh);
      } else {
        geometry.dispose();
      }
    });
  });

  group.userData.glowMaterials = glowMaterials;
  return group;
}

function buildCountryTintSurfaceGroup(
  countries: CountryFeature[],
  color: number,
  targetOpacity: number,
  radius: number
) {
  const group = new THREE.Group();
  const materials: THREE.MeshBasicMaterial[] = [];

  countries.forEach((country) => {
    forEachPolygon(country.geometry, (polygon) => {
      const geometry = buildPolygonSurfaceGeometry(polygon, radius);
      if (!geometry) return;

      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      materials.push(material);
      group.add(new THREE.Mesh(geometry, material));
    });
  });

  group.userData.tintMaterials = materials;
  group.userData.targetOpacity = targetOpacity;
  return group;
}

function createSurfaceDecal(
  texture: THREE.Texture,
  lat: number,
  lon: number,
  size: number,
  radius: number
) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffe27a,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  const position = latLonToVector(lat, lon, radius);

  sprite.position.copy(position);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 8;

  return sprite;
}

export default function Globe() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const connectorLineRef = useRef<SVGLineElement>(null);
  const infoCardRef = useRef<HTMLDivElement>(null);
  const globeApiRef = useRef<{
    focusProfile: (profile: GlobeProfile | null, selectedCountries: CountryFeature[]) => void;
    dispose: () => void;
  } | null>(null);

  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [cityLights, setCityLights] = useState<CityLight[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>("iran");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryListOpen, setCountryListOpen] = useState(false);
  const [infoCardPosition, setInfoCardPosition] = useState<{ x: number; y: number } | null>(null);
  const [showBootScreen, setShowBootScreen] = useState(true);
  const [bootLineCount, setBootLineCount] = useState(1);
  const { data: globeProfiles = GLOBE_PROFILES } = trpc.world.listProfiles.useQuery();

  useEffect(() => {
    window.requestAnimationFrame(() => {
      infoCardRef.current?.scrollTo({ top: 0 });
    });
  }, [selectedProfileId]);

  useEffect(() => {
    const lineTimer = window.setInterval(() => {
      setBootLineCount((count) => {
        if (count >= TERMINAL_BOOT_LINES.length) {
          window.clearInterval(lineTimer);
          return count;
        }

        return count + 1;
      });
    }, 620);
    const exitTimer = window.setTimeout(() => setShowBootScreen(false), 6200);

    return () => {
      window.clearInterval(lineTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch(COUNTRIES_URL).then((response) => response.json() as Promise<GlobeData>),
      fetch(CITY_LIGHTS_URL).then((response) => response.json() as Promise<CityLight[]>),
    ])
      .then(([countryData, lightsData]) => {
        if (!isMounted) return;
        setCountries(countryData.features);
        setCityLights(lightsData);
      })
      .catch((error) => {
        console.error("[Globe] Failed to load Natural Earth data:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const renderCountries = useMemo(() => countries, [countries]);
  const renderCountryByIso3 = useMemo(
    () => new Map(renderCountries.map((country) => [country.properties.iso3, country])),
    [renderCountries]
  );

  const selectedProfile = useMemo(
    () => globeProfiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [globeProfiles, selectedProfileId]
  );

  const selectedRenderCountries = useMemo(() => {
    if (!selectedProfile) return [];
    return resolveProfileCountries(selectedProfile, renderCountries, renderCountryByIso3);
  }, [renderCountries, renderCountryByIso3, selectedProfile]);

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return globeProfiles;

    return globeProfiles.filter((profile) => {
      return (
        profile.displayName.toLowerCase().includes(query) ||
        profile.officialName.toLowerCase().includes(query) ||
        profile.region.toLowerCase().includes(query) ||
        profile.alliance.toLowerCase().includes(query)
      );
    });
  }, [globeProfiles, searchQuery]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || countries.length === 0 || renderCountries.length === 0) return;
    const isMobileViewport = window.matchMedia("(max-width: 640px)").matches;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileViewport ? 1.25 : 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 6.4);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin("anonymous");
    textureLoader.setCrossOrigin("anonymous");

    const earthTexture = textureLoader.load(EARTH_TEXTURE_URL);
    earthTexture.wrapS = THREE.RepeatWrapping;
    earthTexture.offset.x = EARTH_TEXTURE_LONGITUDE_OFFSET;
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 8;

    const earthBump = textureLoader.load(EARTH_BUMP_URL);
    earthBump.wrapS = THREE.RepeatWrapping;
    earthBump.offset.x = EARTH_TEXTURE_LONGITUDE_OFFSET;

    const globeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, isMobileViewport ? 48 : 64, isMobileViewport ? 48 : 64),
      new THREE.MeshStandardMaterial({
        color: 0x343436,
        map: earthTexture,
        bumpMap: earthBump,
        bumpScale: 0.035,
        roughness: 0.9,
        metalness: 0.02,
        emissive: 0x070707,
        emissiveIntensity: 0.34,
      })
    );
    globeGroup.add(globeMesh);

    const redAtmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.035, isMobileViewport ? 48 : 64, isMobileViewport ? 48 : 64),
      new THREE.MeshBasicMaterial({
        color: 0xff1638,
        transparent: true,
        opacity: 0.065,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
    );
    globeGroup.add(redAtmosphere);

    const borders = new THREE.LineSegments(
      buildAllCountryLines(renderCountries, GLOBE_RADIUS * 1.004),
      new THREE.LineBasicMaterial({
        color: 0xd7d2ca,
        transparent: true,
        opacity: 0.38,
      })
    );
    globeGroup.add(borders);

    const lightStep = isMobileViewport ? 3 : 1;
    const lightPositions = cityLights.flatMap((light, index) => {
      if (index % lightStep !== 0) return [];
      const point = latLonToVector(light.lat, light.lon, GLOBE_RADIUS * 1.012);
      return [point.x, point.y, point.z];
    });
    const lightGeometry = new THREE.BufferGeometry();
    lightGeometry.setAttribute("position", new THREE.Float32BufferAttribute(lightPositions, 3));
    const lightPoints = new THREE.Points(
      lightGeometry,
      new THREE.PointsMaterial({
        color: 0xffdfba,
        size: 0.028,
        transparent: true,
        opacity: 0.66,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    globeGroup.add(lightPoints);

    const starPositions: number[] = [];
    for (let index = 0; index < (isMobileViewport ? 120 : 260); index += 1) {
      const radius = 18 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.03,
        transparent: true,
        opacity: 0.28,
      })
    );
    scene.add(stars);

    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const redLight = new THREE.PointLight(0xff1433, 5.8, 18);
    redLight.position.set(-4, 2.4, 4.8);
    scene.add(redLight);
    const whiteLight = new THREE.PointLight(0xffffff, 2.8, 20);
    whiteLight.position.set(3.2, 2.2, 5);
    scene.add(whiteLight);

    const selectedMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xff1f3d,
        transparent: true,
        opacity: 0.98,
      })
    );
    globeGroup.add(selectedMarker);

    let selectedBorder: THREE.LineSegments | null = null;
    let selectedFillGroup: THREE.Group | null = null;
    let selectedConnectionGroup: THREE.Group | null = null;
    let hoverFillGroup: THREE.Group | null = null;
    let hoverProfileId: string | null = null;
    let connectionAnimations: ArcAnimation[] = [];
    let selectedProfileRef = selectedProfile;
    let selectedCentroid = selectedRenderCountries.length > 0 ? getProfileCentroid(selectedRenderCountries) : null;
    let targetCameraZ = 6.4;
    let currentCameraZ = targetCameraZ;
    let targetRotationX = 0.35;
    let targetRotationY = -1.4;
    let currentRotationX = targetRotationX;
    let currentRotationY = targetRotationY;
    let isDragging = false;
    let hasMovedPointer = false;
    let isTabVisible = !document.hidden;
    let previousPointer = { x: 0, y: 0 };
    let pointerStart = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const localCountryByIso3 = new Map(renderCountries.map((country) => [country.properties.iso3, country]));
    const exactCountryByIso3 = new Map(countries.map((country) => [country.properties.iso3, country]));

    const getCountriesForProfile = (profile: GlobeProfile) => {
      return resolveProfileCountries(profile, renderCountries, localCountryByIso3);
    };

    const getExactCountriesForProfile = (profile: GlobeProfile) => {
      return resolveProfileCountries(profile, countries, exactCountryByIso3);
    };

    const getProfileCenter = (profileId: string) => {
      const profile = globeProfiles.find((item) => item.id === profileId);
      if (!profile) return null;
      const profileCountries = getCountriesForProfile(profile);
      if (profileCountries.length === 0) return null;
      return getProfileCentroid(profileCountries);
    };

    const getCountryCenter = (iso3: string) => {
      const country = localCountryByIso3.get(iso3);
      if (!country) return null;
      return country.properties.centroid;
    };

    const disposeObjectMaterial = (material: THREE.Material | THREE.Material[] | undefined) => {
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material?.dispose?.();
      }
    };

    const createConnectionArc = (
      start: { lat: number; lon: number },
      end: { lat: number; lon: number },
      options: { color: number; opacity: number; duration?: number; pulse?: boolean; thick?: boolean }
    ) => {
      const curve = buildArcCurve(start, end);
      const startedAt = performance.now();

      if (options.thick) {
        const material = new THREE.MeshBasicMaterial({
          color: options.color,
          transparent: true,
          opacity: options.opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 108, 0.014, 8, false), material);
        mesh.geometry.setDrawRange(0, 0);
        mesh.renderOrder = 7;

        const pulseLines = [0.95, 0.55, 0.24].map((opacity, index) => {
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(36).fill(0), 3));
          const pulseLine = new THREE.Line(
            geometry,
            new THREE.LineBasicMaterial({
              color: index === 0 ? 0xff6a78 : 0xb7081f,
              transparent: true,
              opacity,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            })
          );
          pulseLine.renderOrder = 8 + index;
          pulseLine.visible = false;
          return pulseLine;
        });

        connectionAnimations.push({
          mesh,
          pulseLines,
          curve,
          startedAt,
          duration: options.duration ?? 2600,
          pulse: options.pulse,
        });

        return [mesh, ...pulseLines];
      }

      const geometry = buildArcGeometry(start, end);
      const material = new THREE.LineBasicMaterial({
        color: options.color,
        transparent: true,
        opacity: options.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geometry, material);
      line.geometry.setDrawRange(0, 0);
      line.renderOrder = 7;
      connectionAnimations.push({
        line,
        curve,
        startedAt,
        duration: options.duration ?? 2200,
      });

      return [line];
    };

    const clearConnectionMeshes = () => {
      connectionAnimations = [];

      if (selectedConnectionGroup) {
        globeGroup.remove(selectedConnectionGroup);
        selectedConnectionGroup.traverse((object) => {
          const mesh = object as THREE.Mesh | THREE.Line;
          mesh.geometry?.dispose?.();
          disposeObjectMaterial(mesh.material as THREE.Material | THREE.Material[] | undefined);
        });
        selectedConnectionGroup = null;
      }
    };

    const clearHoverMeshes = () => {
      hoverProfileId = null;
      if (!hoverFillGroup) return;

      globeGroup.remove(hoverFillGroup);
      hoverFillGroup.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        disposeObjectMaterial(mesh.material as THREE.Material | THREE.Material[] | undefined);
      });
      hoverFillGroup = null;
    };

    const updateHoverProfile = (profile: GlobeProfile | null) => {
      if (profile?.id === hoverProfileId) return;
      clearHoverMeshes();

      if (!profile || profile.id === selectedProfileRef?.id) return;

      const profileCountries = getCountriesForProfile(profile);
      if (profileCountries.length === 0) return;

      hoverProfileId = profile.id;
      hoverFillGroup = buildCountryTintSurfaceGroup(
        profileCountries,
        0x2a0b12,
        0.16,
        GLOBE_RADIUS * 1.015
      );
      globeGroup.add(hoverFillGroup);
    };

    const clearSelectedMeshes = () => {
      selectedMarker.visible = false;
      clearConnectionMeshes();

      if (selectedBorder) {
        globeGroup.remove(selectedBorder);
        selectedBorder.geometry.dispose();
        disposeObjectMaterial(selectedBorder.material as THREE.Material);
        selectedBorder = null;
      }

      if (selectedFillGroup) {
        globeGroup.remove(selectedFillGroup);
        selectedFillGroup.traverse((object) => {
          const mesh = object as THREE.Mesh;
          mesh.geometry?.dispose?.();
          disposeObjectMaterial(mesh.material as THREE.Material | THREE.Material[] | undefined);
        });
        selectedFillGroup = null;
      }
    };

    const buildSelectedConnections = (profile: GlobeProfile) => {
      const start = selectedCentroid;
      if (!start) return;

      selectedConnectionGroup = new THREE.Group();
      const targetIds = PROFILE_CONNECTIONS[profile.id] ?? [];

      targetIds.forEach((targetId) => {
        const end = getProfileCenter(targetId);
        if (!end) return;
        selectedConnectionGroup?.add(
          ...createConnectionArc(start, end, {
            color: 0xffffff,
            opacity: 0.62,
            duration: 3200,
          })
        );
      });

      if (US_IRAN_CONNECTION.includes(profile.id)) {
        const us = getProfileCenter("united-states");
        const iran = getProfileCenter("iran");
        if (us && iran) {
          selectedConnectionGroup.add(
            ...createConnectionArc(us, iran, {
              color: 0x8e0718,
              opacity: 0.95,
              duration: 3600,
              pulse: true,
              thick: true,
            })
          );
        }
      }

      if (profile.id === EUROPE_UKRAINE_CONNECTION[0]) {
        const ukraine = getCountryCenter(EUROPE_UKRAINE_CONNECTION[1]);
        if (ukraine) {
          selectedConnectionGroup.add(
            ...createConnectionArc(start, ukraine, {
              color: 0x8e0718,
              opacity: 0.95,
              duration: 3600,
              pulse: true,
              thick: true,
            })
          );
        }
      }

      if (selectedConnectionGroup.children.length > 0) {
        globeGroup.add(selectedConnectionGroup);
      } else {
        selectedConnectionGroup = null;
      }
    };

    const findProfileAtLatLon = (lat: number, lon: number) => {
      return (
        globeProfiles.find((profile) => {
          return getExactCountriesForProfile(profile).some((country) => countryContainsLatLon(country, lat, lon));
        }) ?? null
      );
    };

    const getProfileAtPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);

      const [intersection] = raycaster.intersectObject(globeMesh);
      if (!intersection) return null;

      const localPoint = intersection.point.clone();
      globeGroup.worldToLocal(localPoint);
      const { lat, lon } = vectorToLatLon(localPoint);
      return findProfileAtLatLon(lat, lon);
    };

    const selectProfileAtPointer = (event: PointerEvent) => {
      const profile = getProfileAtPointer(event);
      if (profile) {
        setSelectedProfileId(profile.id);
      }
    };

    const updateSelectedProfile = (profile: GlobeProfile | null, profileCountries: CountryFeature[]) => {
      selectedProfileRef = profile;
      selectedCentroid = profileCountries.length > 0 ? getProfileCentroid(profileCountries) : null;
      clearHoverMeshes();
      clearSelectedMeshes();

      if (!profile || profileCountries.length === 0 || !selectedCentroid) return;

      targetRotationX = THREE.MathUtils.degToRad(selectedCentroid.lat);
      targetRotationY = -THREE.MathUtils.degToRad(selectedCentroid.lon);

      selectedBorder = new THREE.LineSegments(
        buildMultiCountryLineGeometry(profileCountries, GLOBE_RADIUS * 1.019),
        new THREE.LineBasicMaterial({
          color: 0xff1f3d,
          transparent: true,
          opacity: 1,
        })
      );
      globeGroup.add(selectedBorder);

      const profileFlagTexture = textureLoader.load(
        profile.flagUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 8;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
        },
        undefined,
        () => {
          if (selectedProfileRef?.id !== profile.id || selectedFillGroup) return;
          selectedFillGroup = buildCountrySurfaceGroup(
            profileCountries,
            null,
            GLOBE_RADIUS * 1.012,
            profile.flagFocus,
            profile.id === "europe"
              ? { glowColor: 0x1f4dff, glowOpacity: 0.1, flagOpacity: 0.62 }
              : undefined
          );
          globeGroup.add(selectedFillGroup);
        }
      );
      profileFlagTexture.colorSpace = THREE.SRGBColorSpace;
      profileFlagTexture.anisotropy = 8;
      profileFlagTexture.generateMipmaps = true;
      profileFlagTexture.minFilter = THREE.LinearMipmapLinearFilter;
      profileFlagTexture.magFilter = THREE.LinearFilter;
      profileFlagTexture.wrapS = THREE.ClampToEdgeWrapping;
      profileFlagTexture.wrapT = THREE.ClampToEdgeWrapping;
      selectedFillGroup = buildCountrySurfaceGroup(
        profileCountries,
        profileFlagTexture,
        GLOBE_RADIUS * 1.012,
        profile.flagFocus,
        profile.id === "europe"
          ? { glowColor: 0x1f4dff, glowOpacity: 0.1, flagOpacity: 0.62 }
          : undefined
      );
      globeGroup.add(selectedFillGroup);

      if (profile.id === "china") {
        const taiwan = localCountryByIso3.get("TWN");
        if (taiwan) {
          const taiwanHatch = new THREE.LineSegments(
            buildCountryHatchLineGeometry(taiwan, GLOBE_RADIUS * 1.024),
            new THREE.LineBasicMaterial({
              color: 0xff1734,
              transparent: true,
              opacity: 0.58,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              linewidth: 3,
            })
          );
          taiwanHatch.renderOrder = 8;
          selectedFillGroup.add(taiwanHatch);
        }
      }

      if (profile.id === "europe") {
        const unitedKingdom = localCountryByIso3.get("GBR");
        if (unitedKingdom) {
          const britainHatch = new THREE.LineSegments(
            buildCountryHatchLineGeometry(unitedKingdom, GLOBE_RADIUS * 1.024),
            new THREE.LineBasicMaterial({
              color: 0xff1734,
              transparent: true,
              opacity: 0.58,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              linewidth: 3,
            })
          );
          britainHatch.renderOrder = 8;
          selectedFillGroup.add(britainHatch);
        }
      }

      if (profile.symbolDecal) {
        const { symbolDecal } = profile;
        const addSymbolDecal = (texture: THREE.Texture) => {
          if (selectedProfileRef?.id !== profile.id || !selectedFillGroup) return;

          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 8;
          selectedFillGroup.add(
            createSurfaceDecal(
              texture,
              symbolDecal.lat,
              symbolDecal.lon,
              symbolDecal.size,
              GLOBE_RADIUS * 1.075
            )
          );
        };

        textureLoader.load(symbolDecal.url, addSymbolDecal);
      }

      const markerPosition = latLonToVector(
        selectedCentroid.lat,
        selectedCentroid.lon,
        GLOBE_RADIUS * 1.045
      );
      selectedMarker.position.copy(markerPosition);
      selectedMarker.visible = true;
      buildSelectedConnections(profile);
    };

    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const onPointerDown = (event: PointerEvent) => {
      isDragging = true;
      hasMovedPointer = false;
      pointerStart = { x: event.clientX, y: event.clientY };
      previousPointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) {
        const profile = getProfileAtPointer(event);
        updateHoverProfile(profile);
        canvas.style.cursor = profile ? "pointer" : "grab";
        return;
      }
      const deltaX = event.clientX - previousPointer.x;
      const deltaY = event.clientY - previousPointer.y;
      previousPointer = { x: event.clientX, y: event.clientY };
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) {
        hasMovedPointer = true;
      }
      targetRotationY += deltaX * 0.006;
      targetRotationX += deltaY * 0.006;
      targetRotationX = THREE.MathUtils.clamp(targetRotationX, -1.35, 1.35);
    };

    const onPointerLeave = () => {
      if (!isDragging) {
        clearHoverMeshes();
        canvas.style.cursor = "grab";
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      isDragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (!hasMovedPointer) {
        selectProfileAtPointer(event);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetCameraZ = THREE.MathUtils.clamp(targetCameraZ + event.deltaY * 0.0032, 4.55, 7.25);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", resize);

    const updateConnector = () => {
      const line = connectorLineRef.current;
      const infoCard = infoCardRef.current;
      if (!line || !infoCard || !selectedProfileRef || !selectedCentroid) {
        line?.setAttribute("opacity", "0");
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const cardRect = infoCard.getBoundingClientRect();
      const selectedPoint = latLonToVector(
        selectedCentroid.lat,
        selectedCentroid.lon,
        GLOBE_RADIUS * 1.06
      )
        .applyMatrix4(globeGroup.matrixWorld)
        .project(camera);

      const x1 = ((selectedPoint.x + 1) / 2) * stageRect.width;
      const y1 = ((-selectedPoint.y + 1) / 2) * stageRect.height;
      const x2 = cardRect.left - stageRect.left + 18;
      const y2 = cardRect.top - stageRect.top + Math.min(cardRect.height * 0.5, 96);

      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
      line.setAttribute("opacity", selectedPoint.z < 1 ? "0.8" : "0");
    };

    let animationFrame = 0;
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      if (!isTabVisible) return;
      currentRotationX = THREE.MathUtils.lerp(currentRotationX, targetRotationX, isDragging ? 0.18 : 0.055);
      currentRotationY = THREE.MathUtils.lerp(currentRotationY, targetRotationY, isDragging ? 0.18 : 0.055);
      currentCameraZ = THREE.MathUtils.lerp(currentCameraZ, targetCameraZ, 0.09);
      camera.position.z = currentCameraZ;
      camera.updateProjectionMatrix();
      globeGroup.rotation.x = currentRotationX;
      globeGroup.rotation.y = currentRotationY;
      if (selectedFillGroup) {
        const glowMaterials = selectedFillGroup.userData.glowMaterials as THREE.MeshBasicMaterial[] | undefined;
        glowMaterials?.forEach((material) => {
          material.opacity = 0.16 + Math.sin(Date.now() * 0.0024) * 0.07;
        });
      }
      if (hoverFillGroup) {
        const tintMaterials = hoverFillGroup.userData.tintMaterials as THREE.MeshBasicMaterial[] | undefined;
        const targetOpacity = (hoverFillGroup.userData.targetOpacity as number | undefined) ?? 0.24;
        tintMaterials?.forEach((material) => {
          material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.045);
        });
      }
      connectionAnimations.forEach((animation) => {
        const elapsed = performance.now() - animation.startedAt;
        const reveal = THREE.MathUtils.smoothstep(Math.min(elapsed / animation.duration, 1), 0, 1);

        if (animation.line) {
          const count = animation.line.geometry.getAttribute("position").count;
          animation.line.geometry.setDrawRange(0, Math.max(2, Math.floor(count * reveal)));
        }

        if (animation.mesh) {
          const count = animation.mesh.geometry.index?.count ?? animation.mesh.geometry.getAttribute("position").count;
          animation.mesh.geometry.setDrawRange(0, Math.max(6, Math.floor(count * reveal)));
          const material = animation.mesh.material as THREE.MeshBasicMaterial;
          if (animation.pulse) {
            material.opacity = 0.72 + Math.sin(performance.now() * 0.0028) * 0.08;
          }
        }

        if (animation.pulseLines && animation.pulse) {
          const pulseProgress = (performance.now() * 0.00013) % 1;
          const segmentLength = 0.2;
          animation.pulseLines.forEach((pulseLine, lineIndex) => {
            const positions: number[] = [];
            const lineLength = segmentLength * (1 - lineIndex * 0.18);
            const offset = lineIndex * 0.045;
            const start = Math.max(0, pulseProgress - lineLength - offset);
            const end = Math.min(1, pulseProgress - offset);
            const isVisible = reveal > 0.45 && end > start;

            if (!isVisible) {
              pulseLine.visible = false;
              return;
            }

            for (let index = 0; index < 12; index += 1) {
              const progress = THREE.MathUtils.lerp(start, end, index / 11);
              const point = animation.curve.getPoint(progress);
              positions.push(point.x, point.y, point.z);
            }

            pulseLine.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            pulseLine.geometry.attributes.position.needsUpdate = true;
            pulseLine.visible = true;
          });
        }
      });
      if (!isMobileViewport) {
        stars.rotation.y += 0.00022;
      }
      updateConnector();
      renderer.render(scene, camera);
    };

    resize();
    updateSelectedProfile(selectedProfile, selectedRenderCountries);
    animate();

    globeApiRef.current = {
      focusProfile: updateSelectedProfile,
      dispose: () => {
        cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        canvas.removeEventListener("wheel", onWheel);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        renderer.dispose();
        scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          mesh.geometry?.dispose?.();
          const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material?.dispose?.();
          }
        });
      },
    };

    return () => {
      globeApiRef.current?.dispose();
      globeApiRef.current = null;
    };
  }, [countries, renderCountries, cityLights, globeProfiles]);

  useEffect(() => {
    globeApiRef.current?.focusProfile(selectedProfile, selectedRenderCountries);
  }, [selectedRenderCountries, selectedProfile]);

  const startInfoCardDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    const card = infoCardRef.current;
    if (!stage || !card) return;

    const stageRect = stage.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const offset = {
      x: event.clientX - cardRect.left,
      y: event.clientY - cardRect.top,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    const moveCard = (moveEvent: PointerEvent) => {
      const nextX = THREE.MathUtils.clamp(
        moveEvent.clientX - stageRect.left - offset.x,
        12,
        Math.max(12, stageRect.width - cardRect.width - 12)
      );
      const nextY = THREE.MathUtils.clamp(
        moveEvent.clientY - stageRect.top - offset.y,
        12,
        Math.max(12, stageRect.height - cardRect.height - 12)
      );

      setInfoCardPosition({ x: nextX, y: nextY });
    };

    const stopDrag = () => {
      window.removeEventListener("pointermove", moveCard);
      window.removeEventListener("pointerup", stopDrag);
    };

    window.addEventListener("pointermove", moveCard);
    window.addEventListener("pointerup", stopDrag, { once: true });
  };

  return (
    <div className="globe-page">
      {showBootScreen && (
        <div className="world-terminal-loader" role="status" aria-live="polite">
          <div className="world-terminal-window">
            <div className="world-terminal-header">
              <span />
              <span />
              <span />
              <strong>RTSG_WORLD_BOOT</strong>
            </div>
            <div className="world-terminal-body">
              <p className="world-terminal-prefix">root@rtsg:/world$ ./initialize-map</p>
              {TERMINAL_BOOT_LINES.slice(0, bootLineCount).map((line, index) => (
                <p key={line} className={line === "done" ? "world-terminal-done" : undefined}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {line}
                </p>
              ))}
              <p className="world-terminal-cursor" aria-hidden="true">
                _
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="container relative z-[2] mx-auto max-w-[94rem] py-10 sm:py-14">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/54 hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div className="mb-8 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full glass-red px-4 py-1.5 text-xs font-medium text-primary">
            <Globe2 className="h-3.5 w-3.5" />
            RTSG Worldview
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Interactive world network
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/64 sm:text-base">
            Select a country or historical territory to rotate the globe, highlight its position, and open a connected
            information panel.
          </p>
        </div>

        <div className="globe-layout">
          <section className="globe-stage" ref={stageRef}>
            <div className="globe-country-tab">
              <button
                type="button"
                className="globe-country-tab-toggle"
                onClick={() => setCountryListOpen((isOpen) => !isOpen)}
                aria-expanded={countryListOpen}
                aria-controls="globe-country-drawer"
              >
                <span>
                  <Globe2 className="h-4 w-4" />
                  Countries
                </span>
                <small>{selectedProfile?.tag ?? selectedProfile?.iso3s[0] ?? "ALL"}</small>
                <ChevronDown className="h-4 w-4" />
              </button>

              {countryListOpen && (
                <div id="globe-country-drawer" className="globe-country-drawer">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-white/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                      placeholder="Search countries"
                    />
                  </div>

                  <div className="globe-country-scroll">
                    {filteredProfiles.map((profile) => {
                      const isSelected = profile.id === selectedProfile?.id;

                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => {
                            setSelectedProfileId(isSelected ? null : profile.id);
                            setCountryListOpen(false);
                          }}
                          className="globe-country-button"
                          data-selected={isSelected ? "true" : undefined}
                        >
                          <span>
                            <strong>{profile.officialName}</strong>
                            <small>{profile.region} · {profile.alliance}</small>
                          </span>
                          <span>{profile.tag ?? (profile.iso3s.length > 1 ? "GROUP" : profile.iso3s[0])}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="globe-country-drawer-note">
                    Natural Earth 110m countries are loaded locally. Flag overlays are fetched from public image sources.
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="globe-canvas" aria-label="Interactive 3D globe" />
            <svg className="globe-connector" aria-hidden="true">
              <line ref={connectorLineRef} />
            </svg>
            {selectedProfile && (
              <div
                className="globe-info-card"
                ref={infoCardRef}
                style={
                  infoCardPosition
                    ? {
                        left: infoCardPosition.x,
                        top: infoCardPosition.y,
                        right: "auto",
                      }
                    : undefined
                }
              >
                <div className="globe-info-card-header flex items-start justify-between gap-4" onPointerDown={startInfoCardDrag}>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">Selected Country</p>
                    <h2 className="mt-2 text-2xl font-bold text-foreground">{selectedProfile.officialName}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProfileId(null)}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="globe-deselect-button"
                    aria-label="Deselect country"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/64">
                  {selectedProfile.description}
                </p>
                <div className="mt-5 space-y-3 text-xs text-white/58">
                  {selectedProfile.researchTitle && selectedProfile.researchUrl && (
                    <div className="globe-info-row globe-info-row-research">
                      <span>Research</span>
                      <a href={selectedProfile.researchUrl} target="_blank" rel="noreferrer">
                        {selectedProfile.researchTitle}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <div className="globe-info-row">
                    <span>Population</span>
                    <strong>{selectedProfile.population}</strong>
                  </div>
                  <div className="globe-info-row">
                    <span>Region</span>
                    <strong>{selectedProfile.region}</strong>
                  </div>
                  <div className="globe-info-row">
                    <span>Alliance</span>
                    <strong>{selectedProfile.alliance}</strong>
                  </div>
                  <div className="globe-info-row">
                    <span>Military strength</span>
                    <strong>{selectedProfile.militaryStrength}</strong>
                  </div>
                  <div className="globe-info-row">
                    <span>Ruling party</span>
                    <strong>{selectedProfile.rulingParty}</strong>
                  </div>
                  {selectedProfile.communistParty && (
                    <div className="globe-info-row">
                      <span>Communist party</span>
                      {selectedProfile.communistPartyUrl ? (
                        <a href={selectedProfile.communistPartyUrl} target="_blank" rel="noreferrer">
                          {selectedProfile.communistParty}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <strong>{selectedProfile.communistParty}</strong>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
