import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Appointment,
  Brand,
  Consumer,
  FollowUp,
  Message,
  Purchase,
  Recommendation,
  Sample,
  Store,
  User,
  BaKpiProfile,
} from "@/lib/types";
import {
  SEED_APPOINTMENTS,
  SEED_CONSUMERS,
  SEED_FOLLOWUPS,
  SEED_PURCHASES,
  SEED_RECOMMENDATIONS,
  SEED_SAMPLES,
  SEED_STORES,
  SEED_USERS,
  SEED_BA_KPIS,
} from "@/data/seed";

interface AppState {
  // Auth + brand
  currentUserId: string | null;
  activeBrand: Brand;
  // Data
  users: User[];
  stores: Store[];
  consumers: Consumer[];
  purchases: Purchase[];
  recommendations: Recommendation[];
  appointments: Appointment[];
  followUps: FollowUp[];
  samples: Sample[];
  messages: Message[];
  baKpis: BaKpiProfile[];
  // Actions
  login: (userId: string) => void;
  logout: () => void;
  setActiveBrand: (b: Brand) => void;
  addConsumer: (c: Consumer) => void;
  updateConsumer: (id: string, patch: Partial<Consumer>) => void;
  addPurchase: (p: Purchase) => void;
  addAppointment: (a: Appointment) => void;
  addRecommendation: (r: Recommendation) => void;
  addFollowUp: (f: FollowUp) => void;
  addMessage: (m: Message) => void;
  resetSeed: () => void;
}

const initialData = () => ({
  users: SEED_USERS,
  stores: SEED_STORES,
  consumers: SEED_CONSUMERS,
  purchases: SEED_PURCHASES,
  recommendations: SEED_RECOMMENDATIONS,
  appointments: SEED_APPOINTMENTS,
  followUps: SEED_FOLLOWUPS,
  samples: SEED_SAMPLES,
  messages: [] as Message[],
  baKpis: SEED_BA_KPIS,
});

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      currentUserId: null,
      activeBrand: "lancome",
      ...initialData(),
      login: (userId) => {
        set((s) => {
          const u = s.users.find((x) => x.id === userId);
          return { currentUserId: userId, activeBrand: u?.brand ?? s.activeBrand };
        });
      },
      logout: () => set({ currentUserId: null }),
      setActiveBrand: (b) => set({ activeBrand: b }),
      addConsumer: (c) => set((s) => ({ consumers: [c, ...s.consumers] })),
      updateConsumer: (id, patch) =>
        set((s) => ({
          consumers: s.consumers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      addPurchase: (p) =>
        set((s) => ({
          purchases: [p, ...s.purchases],
          consumers: s.consumers.map((c) =>
            c.id === p.consumerId
              ? { ...c, lastTransactionAt: p.date, lastContactAt: p.date }
              : c,
          ),
        })),
      addAppointment: (a) => set((s) => ({ appointments: [a, ...s.appointments] })),
      addRecommendation: (r) => set((s) => ({ recommendations: [r, ...s.recommendations] })),
      addFollowUp: (f) => set((s) => ({ followUps: [f, ...s.followUps] })),
      addMessage: (m) => set((s) => ({ messages: [m, ...s.messages] })),
      resetSeed: () => set({ ...initialData() }),
    }),
    {
      name: "loreal-luxe-clienteling",
      version: 1,
    },
  ),
);

export const useCurrentUser = () => {
  const { currentUserId, users } = useApp();
  return users.find((u) => u.id === currentUserId) ?? null;
};

export const useCurrentStore = () => {
  const u = useCurrentUser();
  const stores = useApp((s) => s.stores);
  return u ? stores.find((s) => s.id === u.storeId) ?? null : null;
};