// API types — SSoT: docs/for_ai/spec/api_and_rules.md

export type Difficulty = "LOW" | "MEDIUM" | "HIGH";
export type ScheduleStatus = "PENDING" | "COMPLETED" | "OVERDUE";
export type Tendency = "EASY" | "NORMAL" | "HARD";
export type Grade = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type ItemCategory = "CUSTOMIZE" | "DEFENSE" | "PERSONA";
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
  persona_tokens: number;
  tendency?: Tendency | string;
  equipped_title: Title | null;
}

export interface Schedule {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  status: ScheduleStatus;
  due_date: string;
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
  reward_points: number;
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
}

export interface ShowcaseDetail {
  user_id: string;
  display_name: string;
  level: number;
  rating_grade: string;
  equipped_title: Title | null;
  displayed_titles: Title[];
  persona_showcase_text: string;
  persona_llm_output: string;
  grass: Record<string, number>;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}
