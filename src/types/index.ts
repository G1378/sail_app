export type BoatType = "Feva" | "Pico" | "Topper" | "Optimist";
export type BoatStatus = "ready" | "warn" | "alert" | "idle";
export type Confidence = "High" | "Med" | "Low";
export type SailorRole = "Helm" | "Crew" | "Either";
export type RyaStage = 1 | 2 | 3 | 4;
export type RecType = "ok" | "warn" | "info";

export interface Boat {
  id: string;
  name: string;
  type: BoatType;
  instructor: string | null;
  helm: string | null;
  crew: string | null;
  goal: string;
  capacity: number;
  filled: number;
  status: BoatStatus;
  warning: string | null;
}

export interface Sailor {
  id: string;
  name: string;
  stage: RyaStage;
  confidence: Confidence;
  role: SailorRole;
  skills: string[];
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
