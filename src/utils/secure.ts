/**
 * Secure storage for sensitive traveler data (passport numbers, rail-pass
 * numbers). Uses the platform keychain/keystore via expo-secure-store; falls
 * back to AsyncStorage on web, where SecureStore is unavailable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'fabinterrail-secure-v1';

export interface SecureVault {
  /** travelerId -> passport number */
  passports: Record<string, string>;
  /** passId -> pass number */
  passNumbers: Record<string, string>;
}

const EMPTY: SecureVault = { passports: {}, passNumbers: {} };

export async function loadVault(): Promise<SecureVault> {
  try {
    const raw =
      Platform.OS === 'web'
        ? await AsyncStorage.getItem(KEY)
        : await SecureStore.getItemAsync(KEY);
    if (!raw) return { ...EMPTY, passports: {}, passNumbers: {} };
    const parsed = JSON.parse(raw) as Partial<SecureVault>;
    return { passports: parsed.passports ?? {}, passNumbers: parsed.passNumbers ?? {} };
  } catch {
    return { ...EMPTY, passports: {}, passNumbers: {} };
  }
}

export async function saveVault(vault: SecureVault): Promise<void> {
  const raw = JSON.stringify(vault);
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(KEY, raw);
    } else {
      await SecureStore.setItemAsync(KEY, raw);
    }
  } catch {
    // Persisting the vault is best-effort; values remain in memory for the session.
  }
}
