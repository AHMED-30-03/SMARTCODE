export type UserRole = "admin" | "campaign_manager" | "accountant";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  budget: number;
  status: "active" | "completed" | "paused";
  created_by: string;
  created_at: string;
  influencers?: Influencer[];
}

export interface Influencer {
  id: string;
  campaign_id: string;
  name: string;
  amount: number;
  iban: string;
  bank_name: string;
  status: "pending" | "processing" | "paid";
  notes: string;
  added_by: string;
  created_at: string;
  receipt?: Receipt;
}

export interface Receipt {
  id: string;
  influencer_id: string;
  receipt_number: string;
  amount: number;
  transfer_ref: string;
  bank_name: string;
  iban: string;
  notes: string;
  created_by: string;
  created_at: string;
  influencer?: Influencer;
}
