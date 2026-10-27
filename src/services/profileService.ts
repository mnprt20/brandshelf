import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { StoreProfile } from "../types";

export const DEFAULT_STORE_PROFILE: Omit<StoreProfile, "storeId"> = {
  info: {
    enabled: false,
    address: "",
    mapUrl: "",
    phone: "",
    whatsapp: "",
    hours: {
      Monday: { open: "09:00", close: "21:00", closed: false },
      Tuesday: { open: "09:00", close: "21:00", closed: false },
      Wednesday: { open: "09:00", close: "21:00", closed: false },
      Thursday: { open: "09:00", close: "21:00", closed: false },
      Friday: { open: "09:00", close: "21:00", closed: false },
      Saturday: { open: "09:00", close: "21:00", closed: false },
      Sunday: { open: "10:00", close: "20:00", closed: false }
    },
    holidays: [],
    socials: { instagram: "", facebook: "", youtube: "", website: "" },
    gstin: "",
    fssai: ""
  },
  policies: {
    enabled: false,
    returns: { enabled: true, text: "" },
    shipping: { enabled: true, text: "" },
    privacy: { enabled: true, text: "" }
  },
  announcement: {
    enabled: false,
    text: "",
    tone: "info"
  },
  story: {
    enabled: false,
    ownerPhoto: "",
    about: "",
    certs: []
  }
};

export class ProfileService {
  async getProfile(storeId: string): Promise<StoreProfile> {
    const localKey = `mintshelf_profile_${storeId}`;
    try {
      const snap = await getDoc(doc(db, "stores", storeId, "profile", "main"));
      if (snap.exists()) {
        const data = snap.data() as StoreProfile;
        try {
          localStorage.setItem(localKey, JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn("getProfile network read failed, checking localStorage cache:", err);
    }

    try {
      const cached = localStorage.getItem(localKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    return {
      storeId,
      ...DEFAULT_STORE_PROFILE
    };
  }

  async saveProfile(storeId: string, profile: StoreProfile): Promise<void> {
    const localKey = `mintshelf_profile_${storeId}`;
    const cleanPayload: StoreProfile = {
      ...profile,
      storeId,
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem(localKey, JSON.stringify(cleanPayload));
    } catch {}

    const path = `stores/${storeId}/profile/main`;
    try {
      await setDoc(doc(db, "stores", storeId, "profile", "main"), cleanPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

export const profileService = new ProfileService();
