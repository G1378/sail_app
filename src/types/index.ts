export type BoatType = "Feva" | "Pico" | "Topper" | "Optimist";
export type BoatStatus = "ready" | "warn" | "alert" | "idle";
export type Confidence = "High" | "Med" | "Low";
export type SailorRole = "Helm" | "Crew" | "Either";
export type RyaStage = 1 | 2 | 3 | 4;
export type RecType = "ok" | "warn" | "info";

export interface Boat {
  id: string;
  /** Underlying fleet catalog boat id. Only set for session-mode boards
   *  (where `id` is the board-instance id, distinct from the physical boat). */
  boatId?: string;
  name: string;
  type: BoatType;
  instructor: string | null;
  /** One entry per seat, length === capacity. null = empty seat. */
  assignedSailors: (string | null)[];
  goal: string;
  capacity: number;
  status: BoatStatus;
  warning: string | null;
}

/** A boat in the club's fleet catalog, not yet necessarily on any board */
export interface FleetBoat {
  id: string;
  name: string;
  type: BoatType;
  capacity: number;
}

export interface Sailor {
  id: string;
  name: string;
  stage: RyaStage;
  confidence: Confidence;
  role: SailorRole;
  skills: string[];
  /** Boat class they asked for at sign-up — only set in session mode, null/undefined otherwise */
  preferredBoatType?: string | null;
}

export interface Recommendation {
  icon: string;
  text: string;
  type: RecType;
}

export interface WeatherData {
  windSpeed: string;
  windDirection: string;
  windDegrees: string;
  tide: string;
  gusts: string;
}

export interface SessionData {
  objective: string;
  date: string;
  weather: WeatherData;
  boats: Boat[];
  sailors: Sailor[];
  instructors: string[];
  recommendations: Recommendation[];
  notes: string;
}
