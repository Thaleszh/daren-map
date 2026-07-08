import { z } from "zod";
import {
  AreaIdSchema,
  DistrictIdSchema,
  ElevatorIdSchema,
  EventIdSchema,
  FactionIdSchema,
  InitiativeIdSchema,
  LandmarkIdSchema,
  LevelIdSchema,
  NpcIdSchema,
} from "./ids";

/**
 * The canonical data contract for the Daren atlas.
 *
 * This Zod schema is the single source of truth: types are *inferred* from it
 * (`z.infer`), and the same schema validates hand-edited JSON today and
 * form-generated data tomorrow. There is no separate hand-written interface to
 * drift out of sync.
 */

/* ------------------------------------------------------------------ geometry */

/** A point in a level's SVG coordinate space (see Level.viewBox). */
export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof PointSchema>;

/** A closed polygon; the renderer connects the last point back to the first. */
export const PolygonSchema = z.array(PointSchema).min(3, "an area polygon needs at least 3 points");
export type Polygon = z.infer<typeof PolygonSchema>;

/* -------------------------------------------------------------------- levels */

/**
 * A single horizontal slice of Daren. `depth` orders them: surface = 0,
 * each excavated layer below is +1. The renderer sorts by depth.
 */
export const LevelSchema = z.object({
  id: LevelIdSchema,
  name: z.string().min(1),
  depth: z.number().int(),
  /** Path (relative to the site base) of this level's background image. */
  image: z.string().min(1),
  /**
   * The SVG viewBox for this level: "minX minY width height". Area polygons,
   * elevators and the image are all expressed in this coordinate space.
   */
  viewBox: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  blurb: z.string().default(""),
});
export type Level = z.infer<typeof LevelSchema>;

/* ----------------------------------------------------------------- districts */

/**
 * A *bairro* — a named district that may span several levels (e.g. Ala Fungi
 * runs through levels 1–3, Selado through 3–5). A District owns one {@link Area}
 * slice per level it occupies; the tool can report influence per slice AND
 * rolled up across the whole district (see Atlas.districtStandings).
 */
/** A recurring/notable happening tied to a district (from the DLC "Eventos"). */
export const DistrictEventSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
});
export type DistrictEvent = z.infer<typeof DistrictEventSchema>;

/**
 * Ancestry buckets. Daren is ~95% human; the minorities are tracked explicitly
 * and "human" is derived as the remainder of a district's population.
 */
export const RaceSchema = z.enum(["human", "dwarf", "elf", "other"]);
export type Race = z.infer<typeof RaceSchema>;

/** A non-human headcount within a district. */
export const RaceCountSchema = z.object({
  race: RaceSchema,
  count: z.number().int().nonnegative(),
});
export type RaceCount = z.infer<typeof RaceCountSchema>;

/** Social class buckets. */
export const SocialClassSchema = z.enum(["elite", "media", "trabalhadora", "pobre"]);
export type SocialClass = z.infer<typeof SocialClassSchema>;

/** A class's share (0..1) of a district's population. */
export const ClassShareSchema = z.object({
  class: SocialClassSchema,
  share: z.number().min(0).max(1),
});
export type ClassShare = z.infer<typeof ClassShareSchema>;

/** An occupation's share (0..1) of a district's population. Occupation is open. */
export const OccupationShareSchema = z.object({
  occupation: z.string().min(1),
  share: z.number().min(0).max(1),
});
export type OccupationShare = z.infer<typeof OccupationShareSchema>;

export const DistrictSchema = z.object({
  id: DistrictIdSchema,
  name: z.string().min(1),
  /** Short "Resumo" line. */
  description: z.string().default(""),
  /** Optional accent color for the district in cross-level views. */
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "expected a #rrggbb hex color")
    .optional(),
  /** Approximate number of inhabitants. */
  population: z.number().int().nonnegative().optional(),
  /**
   * Non-human headcounts. Humans are the remainder (population − Σ races), so
   * only minorities need listing. Σ races must not exceed population.
   */
  races: z.array(RaceCountSchema).default([]),
  /** Social-class distribution (shares, roughly summing to 1). */
  classes: z.array(ClassShareSchema).default([]),
  /** Occupation distribution (shares, roughly summing to 1). */
  occupations: z.array(OccupationShareSchema).default([]),
  // ---- DLC "por bairro" template (all optional; most bairros are still blank)
  /** Disposição demográfica — industrial, comercial, habitacional… */
  demographics: z.string().default(""),
  /** Qualidade de vida. */
  qualityOfLife: z.string().default(""),
  /** Fatos históricos conhecidos. */
  history: z.array(z.string()).default([]),
  /** Eventos recorrentes/notáveis (distinct from the one-time chronicle). */
  events: z.array(DistrictEventSchema).default([]),
  /** Relação com outros bairros (freeform for now). */
  relations: z.array(z.string()).default([]),
  /** Rumores. */
  rumors: z.array(z.string()).default([]),
});
export type District = z.infer<typeof DistrictSchema>;

/* ---------------------------------------------------------------------- npcs */

/**
 * A named person ("Pessoas importantes"). Optionally tied to the district they
 * operate in and the faction they belong to. Not placed on the map (yet).
 */
export const NpcSchema = z.object({
  id: NpcIdSchema,
  name: z.string().min(1),
  districtId: DistrictIdSchema.optional(),
  factionId: FactionIdSchema.optional(),
  /** Short role/title, e.g. "Regente de Daren". */
  role: z.string().default(""),
  description: z.string().default(""),
});
export type Npc = z.infer<typeof NpcSchema>;

/* --------------------------------------------------------------------- areas */

export const AreaSchema = z.object({
  id: AreaIdSchema,
  levelId: LevelIdSchema,
  /** The district this area is a per-level slice of, if any. */
  districtId: DistrictIdSchema.optional(),
  name: z.string().min(1),
  description: z.string().default(""),
  /**
   * The clickable region outline. Optional: a freshly-imported area may have
   * only a {@link labelAnchor} (from the PSD) and get its polygon traced later
   * in the annotate tool. An area must have at least one of polygon/labelAnchor.
   */
  polygon: PolygonSchema.optional(),
  /** Anchor for the area's label and marker; defaults to polygon centroid. */
  labelAnchor: PointSchema.optional(),
});
export type Area = z.infer<typeof AreaSchema>;

/* ----------------------------------------------------------------- landmarks */

/** Categories drive the marker icon/color for a point of interest. */
export const LandmarkCategorySchema = z.enum([
  "military", // quartéis, forte, forjas de guerra
  "religious", // templos, céus, cultos
  "civic", // administração, cortes, fóruns, orfanatos
  "commerce", // bazar, lojas, casas de jogo
  "culture", // teatros, escolas, bibliotecas, artes
  "noble", // propriedades e casas das grandes famílias
  "danger", // pontos perigosos ou sinistros
  "other",
]);
export type LandmarkCategory = z.infer<typeof LandmarkCategorySchema>;

/**
 * A named point of interest inside the city — a specific place rather than a
 * whole district (e.g. Teatro de Sanvil, Celestia Maior, O Castelo Central).
 * Placed as a point on a level; optionally tied to the district it sits in.
 */
export const LandmarkSchema = z.object({
  id: LandmarkIdSchema,
  levelId: LevelIdSchema,
  districtId: DistrictIdSchema.optional(),
  name: z.string().min(1),
  category: LandmarkCategorySchema.default("other"),
  position: PointSchema,
  description: z.string().default(""),
  /** Optional faction most associated with this place. */
  factionId: FactionIdSchema.optional(),
});
export type Landmark = z.infer<typeof LandmarkSchema>;

/* ------------------------------------------------------------------ factions */

export const FactionSchema = z.object({
  id: FactionIdSchema,
  name: z.string().min(1),
  /** Short tag shown in tight spaces (map badges, legends). */
  shortName: z.string().default(""),
  /** Hex color used consistently across map fills, bars and legends. */
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/, "expected a #rrggbb hex color"),
  description: z.string().default(""),
  /** Optional link to more about this faction (wiki page, doc, etc.). */
  infoUrl: z.string().url().optional(),
  /** Marks the players' own organization ("Sem Cores"). Exactly one expected. */
  isPlayerOrg: z.boolean().default(false),
});
export type Faction = z.infer<typeof FactionSchema>;

/* ---------------------------------------------------------------- presence */

/**
 * A faction's foothold in one area. Both values are raw integers 1..20.
 *
 * - `influence` is *relative*: a faction's control share of an area is its
 *   influence divided by the sum of all influence in that area (derived, never
 *   stored — see selectors.ts).
 * - `power` is *absolute*: raw strength projected in the area, shown as-is.
 */
export const PresenceSchema = z.object({
  factionId: FactionIdSchema,
  areaId: AreaIdSchema,
  influence: z.number().int().min(0).max(20),
  power: z.number().int().min(0).max(20),
  note: z.string().default(""),
});
export type Presence = z.infer<typeof PresenceSchema>;

/* ----------------------------------------------------------------- elevators */

export const ElevatorSchema = z.object({
  id: ElevatorIdSchema,
  name: z.string().min(1),
  /** Levels this shaft connects, top to bottom. */
  levelIds: z.array(LevelIdSchema).min(2, "an elevator must connect >= 2 levels"),
  /**
   * Fixed position per level in that level's coordinate space. The map shows a
   * marker on every connected level at its position here.
   */
  positions: z.record(z.string(), PointSchema),
  note: z.string().default(""),
});
export type Elevator = z.infer<typeof ElevatorSchema>;

/* --------------------------------------------------------------- initiatives */

export const InitiativeStatusSchema = z.enum([
  "planned",
  "active",
  "completed",
  "failed",
  "abandoned",
]);
export type InitiativeStatus = z.infer<typeof InitiativeStatusSchema>;

/**
 * An undertaking by the guild (the player org) — the second view of the atlas,
 * unrelated to the map's live influence. An initiative affects regions, tracks
 * its own progress toward an outcome, and links to related initiatives and
 * places. The owner is implicitly the guild, so it isn't stored per row.
 */
export const InitiativeSchema = z.object({
  id: InitiativeIdSchema,
  name: z.string().min(1),
  status: InitiativeStatusSchema,
  /** Manual completion estimate, 0..100. Independent of `status`. */
  progress: z.number().int().min(0).max(100).default(0),
  summary: z.string().default(""),
  /** How it turned out; meaningful once the initiative is resolved. */
  outcome: z.string().default(""),
  /** Regions this initiative affects (areas → map cross-highlighting). */
  areaIds: z.array(AreaIdSchema).default([]),
  /** Specific places tied to this initiative. */
  landmarkIds: z.array(LandmarkIdSchema).default([]),
  /** Sibling initiatives worth cross-referencing. */
  relatedInitiativeIds: z.array(InitiativeIdSchema).default([]),
});
export type Initiative = z.infer<typeof InitiativeSchema>;

/* ------------------------------------------------------------- chronicle log */

/**
 * A dated thing that happened. This is the "how the region was affected" record
 * in the hybrid model: current presence values are the live truth, and the
 * chronicle narrates how they got there. `deltas` are optional and descriptive
 * for now (a later phase can replay them to reconstruct past states).
 */
export const InfluenceDeltaSchema = z.object({
  factionId: FactionIdSchema,
  areaId: AreaIdSchema,
  influenceDelta: z.number().int().default(0),
  powerDelta: z.number().int().default(0),
});
export type InfluenceDelta = z.infer<typeof InfluenceDeltaSchema>;

export const ChronicleEventSchema = z.object({
  id: EventIdSchema,
  /** In-world date as a plain string; ordering is by `sortKey`. */
  date: z.string().default(""),
  /** Monotonic ordering key (e.g. session number * 100 + step). */
  sortKey: z.number(),
  title: z.string().min(1),
  body: z.string().default(""),
  factionIds: z.array(FactionIdSchema).default([]),
  areaIds: z.array(AreaIdSchema).default([]),
  deltas: z.array(InfluenceDeltaSchema).default([]),
});
export type ChronicleEvent = z.infer<typeof ChronicleEventSchema>;

/* --------------------------------------------------------------------- world */

export const WorldSchema = z.object({
  meta: z.object({
    city: z.string().default("Daren"),
    playerOrg: z.string().default("Sem Cores"),
  }),
  levels: z.array(LevelSchema).min(1),
  districts: z.array(DistrictSchema).default([]),
  areas: z.array(AreaSchema),
  factions: z.array(FactionSchema),
  npcs: z.array(NpcSchema).default([]),
  presence: z.array(PresenceSchema),
  elevators: z.array(ElevatorSchema).default([]),
  landmarks: z.array(LandmarkSchema).default([]),
  initiatives: z.array(InitiativeSchema).default([]),
  chronicle: z.array(ChronicleEventSchema).default([]),
});

/** The validated, branded world. All consuming code uses this type. */
export type World = z.infer<typeof WorldSchema>;

/** The pre-validation shape, convenient for authoring literals with `satisfies`. */
export type WorldInput = z.input<typeof WorldSchema>;
