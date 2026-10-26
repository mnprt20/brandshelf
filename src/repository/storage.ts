export { BrowserStorageRepository } from "./baseStorage";
import { FirestoreRepository } from "./firestore";

export const defaultRepository = new FirestoreRepository();
