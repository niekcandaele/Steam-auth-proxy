import { AuthCodeData, OIDCClient } from "../types";

export const codeStore = new Map<string, AuthCodeData>();
export const clientStore = new Map<string, OIDCClient>();
export const tokenStore = new Map<string, string>(); // Just storing steamId for now
