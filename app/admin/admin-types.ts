export interface Order {
  id: string;
  referenceId: string | null;
  type: string;
  amount: number;
  rate: number;
  totalValue: number;
  giftCardBrand: string | null;
  giftCardCountry: string | null;
  giftCardSubcategory: string | null;
  giftCardCode: string | null;
  giftCardImage: string | null;
  cryptoAsset: string | null;
  payoutBankName: string | null;
  payoutAccountName: string | null;
  payoutBankAccountNumber: string | null;
  createdAt: string;
  user: { email: string };
}

export interface GiftCardSubcategory {
  id: string;
  label: string;
  country: string | null;
  cardType: string | null;
  nairaPayoutPerUsd: number;
  isActive: boolean;
}

export interface GiftCardRate {
  id: string;
  brand: string;
  code: string | null;
  icon: string | null;
  nairaPayoutPerUsd: number;
  isActive: boolean;
  subcategories: GiftCardSubcategory[];
}

export interface CryptoRate {
  id: string;
  asset: string;
  name: string | null;
  icon: string | null;
  nairaPayoutPerUsd: number;
  isActive: boolean;
}

export interface Pricing {
  usdToNairaRate: number;
  giftCardRates: GiftCardRate[];
  cryptoRates: CryptoRate[];
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  isOnline: boolean;
  tradeCount: number;
  tradeVolume: number;
}

export interface Activity {
  id: string;
  type: string;
  details: string | null;
  createdAt: string;
  user: { email: string };
}

export interface Analytics {
  generatedAt: string;
  onlineWindowMinutes: number;
  stats: {
    totalUsers: number;
    onlineUsers: number;
    totalTrades: number;
    pendingTrades: number;
    successfulTrades: number;
    declinedTrades: number;
    todayTrades: number;
    todayVolume: number;
    pendingGiftCardTrades: number;
    pendingCryptoTrades: number;
  };
  users: UserSummary[];
  topUsers: UserSummary[];
  recentActivities: Activity[];
}

export interface SupportTicketMessage {
  id: string;
  body: string;
  imageData: string | null;
  createdAt: string;
  isOwn: boolean;
  sender: { username: string | null; displayName: string; role: "USER" | "ADMIN" };
}

export interface SupportTicketSummary {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  user: { email: string; username: string | null };
  lastMessage: { id: string; body: string; senderId: string; createdAt: string } | null;
}

export function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}
