// API types — SSoT: docs/for_ai/spec/api_and_rules.md

export type Difficulty = "LOW" | "MEDIUM" | "HIGH";
export type ScheduleStatus = "PENDING" | "COMPLETED" | "OVERDUE";
export type Tendency = "EASY" | "NORMAL" | "HARD";
export type Grade = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type ItemCategory = "CUSTOMIZE" | "DEFENSE" | "PERSONA" | "SUMMON";
export type QuestType = "ADD_PLAN" | "COMPLETE_PLAN" | "VISIT_SHOWCASE";
export type CharacterType = "default" | "tsundere" | "knight";

export interface Title {
  id: string;
  name: string;
  grade: Grade;
  color_hex: string;
  icon_url?: string;
  negative_modifier?: string | null;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  level: number;
  total_exp: number;
  exp_to_next_level: number;
  current_points: number;
  daily_points_earned: number;
  daily_points_cap: number;
  account_status: string;
  persona_character_type: CharacterType | string;
  persona_definition: string;
  persona_name: string;
  persona_tone: string;
  persona_history: string;
  persona_thoughts: string;
  status_message: string;
  persona_tokens: number;
  character_skin: string;
  active_cosmetic: string;
  purchased_cosmetics?: string[];
  summon_tickets: number;
  pity_counter: number;
  defense_tickets: number;
  tendency?: Tendency | string;
  equipped_title: Title | null;
  stats_public: boolean;
  // 휴면/복귀 (FR-DORM-02/04)
  return_buff_until?: string | null;
  needs_reonboarding?: boolean;
  dormant_returned_count?: number;
}

// 복귀 시 1회성으로 발급되는 보너스 패키지 (FR-DORM-03/04/05).
// AuthResponse.return_grant 에만 동봉되며 /me 에서는 다시 내려오지 않는다.
export interface ReturnGrant {
  points_granted: number;
  defense_tickets_granted: number;
  buff_days: number;
  first_time: boolean;
  needs_reonboarding: boolean;
}

export interface Schedule {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  status: ScheduleStatus;
  due_date: string;
  start_time: string | null;
  end_time: string | null;
  google_event_id: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RewardResult {
  exp_gained: number;
  points_gained: number;
  level_up: boolean;
  new_level: number | null;
  new_titles: Title[];
  daily_cap_reached: boolean;
}

export interface CompleteResponse {
  schedule: Schedule;
  reward: RewardResult;
}

export interface Quest {
  quest_type: QuestType;
  completed: boolean;
  claimed: boolean;
  reward_points: number;
}

export interface QuestClaimResult {
  claimed: boolean;
  reward_points: number;
  bonus_points: number;
  streak_mult: number;
  current_points: number;
}

export interface ShopItem {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  description: string;
  effect: string;
}

export interface Purchase {
  id: string;
  item_id: string;
  purchased_at: string;
}

export interface UserTitle {
  id: string;
  title: Title;
  is_equipped: boolean;
  is_displayed: boolean;
  negative_modifier: string | null;
  acquired_at: string;
}

export interface ShowcaseSummary {
  user_id: string;
  display_name: string;
  level: number;
  equipped_title: Title | null;
  character_skin: string;
}

export interface ShowcaseDetail {
  user_id: string;
  display_name: string;
  level: number;
  rating_grade: string;
  equipped_title: Title | null;
  displayed_titles: Title[];
  persona_name: string;
  status_message: string;
  persona_showcase_text: string;
  persona_llm_output: string;
  character_skin: string;
  grass: Record<string, number>;
  // 통계 공개 여부 + 공개일 때만 채워지는 풀 StatsSummary.
  stats_public: boolean;
  summary?: StatsSummary;
}

export interface TitleCatalogEntry {
  title: Title;
  owned: boolean;
  is_equipped: boolean;
  is_displayed: boolean;
  negative_modifier: string | null;
  condition_kind: string;
  progress_current: number;
  progress_threshold: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  return_grant?: ReturnGrant;
}

// ---------- v1.3 additions ----------

export interface QuestCompleteResult {
  completed: boolean;
  reward_points: number;
  bonus_points: number;
  streak_mult: number;
  current_points: number;
}

export interface StatsSummary {
  total_completed: number;
  total_failed: number;
  success_rate: number;
  rating_grade: string;
  current_streak: number;
  longest_streak: number;
  percentile: number;
  next_grade: string;
  next_grade_pct: number;
}

export interface SeriesPoint {
  date: string;
  success: number;
  fail: number;
}

export interface GachaCharacter {
  id: string;
  name: string;
  rarity: Grade;
  sprite_key: string;
  is_pickup: boolean;
}

export interface OwnedCharacter extends GachaCharacter {
  count: number;
  equipped: boolean;
}

export interface SummonInfo {
  rates: Record<string, number>;
  pickup_rates: Record<string, number>;
  cost_single: number;
  cost_multi: number;
  multi_count: number;
  pity_threshold: number;
  pity_counter: number;
  points: number;
  tickets: number;
  ticket_price: number;
}

export interface SummonDraw {
  character: GachaCharacter;
  is_new: boolean;
  refund_points: number;
}

export interface SummonResult {
  draws: SummonDraw[];
  spent_points: number;
  spent_tickets: number;
  refunded_points: number;
  remaining_points: number;
  remaining_tickets: number;
  pity_counter: number;
}

export interface Settings {
  language: string;
  timezone: string;
  week_start: "SUN" | "MON";
  time_format: "H12" | "H24";
  theme: string;
  character_scale: number;
  gcal_sync_enabled: boolean;
  notification_prefs: Record<string, boolean>;
  reminder_minutes: number;
}
