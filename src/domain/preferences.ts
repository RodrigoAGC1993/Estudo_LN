/**
 * Domain Types — User Preferences
 *
 * Visual preferences stored separately from session data.
 * Never mixed with ActiveSessionSnapshot.
 */

export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserPreferences {
  theme: ThemePreference;
  fontScale: number;
}
