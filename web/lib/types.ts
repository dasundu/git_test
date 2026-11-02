export type Role = "BUYER" | "SELLER" | "DEALER" | "ADMIN";
export type ListingStatus = "AVAILABLE" | "RESERVED" | "SOLD";

export interface SpecField {
  key: string; label: string; type: "number" | "text" | "select"; unit?: string; options?: string[]; filterable?: boolean;
}
export interface Category { id: string; slug: string; name: string; count?: number; specSchema?: SpecField[] }
export interface Brand { id: string; slug: string; name: string; count?: number }

export interface DealerLite {
  id: string; name: string; slug: string; logoUrl: string | null; verified: boolean; city: string | null; province: string | null;
  phone: string | null; messengerUrl: string | null; facebookUrl: string | null;
}
export interface Dealership extends DealerLite {
  description: string | null; coverUrl: string | null; address: string | null; websiteUrl: string | null;
  latitude: number | null; longitude: number | null; yearsInBusiness: number | null; featured: boolean; inventoryCount?: number;
}

export interface Listing {
  id: string; title: string; description: string; price: number; negotiable: boolean;
  year: number | null; mileageKm: number | null; condition: "USED" | "JAPAN_SURPLUS" | "REPAIRED";
  province: string | null; city: string | null; specs: Record<string, string | number>;
  status: ListingStatus; availabilityConfirmedAt: string; moderation: "ACTIVE" | "HIDDEN" | "REMOVED";
  views: number; featured: boolean; createdAt: string;
  images: { id: string; url: string }[];
  category: { id: string; slug: string; name: string };
  brand: { id: string; slug: string; name: string } | null;
  dealership: DealerLite | null;
  seller: { id: string; name: string; role: Role; messengerUrl: string | null };
  favorited?: boolean;
  inquiries?: number; offerCount?: number; saves?: number;
}

export interface Me {
  id: string; email: string; name: string; phone: string | null; messengerUrl: string | null; role: Role;
  emailNotify: boolean; dealership: Dealership | null; unreadNotifications: number; unreadMessages: number;
  quota: { limit: number; used: number; remaining: number; mode: string } | null;
}

export interface Notification { id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string }
export interface Message { id: string; conversationId: string; senderId: string; type: "TEXT" | "OFFER" | "SYSTEM"; body: string; offerId: string | null; createdAt: string }
export interface Offer { id: string; conversationId: string; amount: number; note: string | null; status: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "WITHDRAWN"; fromSeller: boolean; createdAt: string; buyerId: string; sellerId: string }
export interface ConversationSummary {
  id: string; role: "buyer" | "seller"; unread: boolean; lastMessageAt: string;
  lastMessage: Message | null;
  listing: { id: string; title: string; price: number; status: ListingStatus; images: { url: string }[] };
  buyer: { id: string; name: string }; seller: { id: string; name: string; messengerUrl: string | null };
}

export interface Paged<T> { total: number; page: number; pageSize: number; items: T[] }
