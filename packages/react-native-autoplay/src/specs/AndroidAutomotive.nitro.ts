import type { HybridObject } from 'react-native-nitro-modules';
import type { CleanupCallback } from '../types/Event';

export enum CarUxRestrictions {
  UX_RESTRICTIONS_FULLY_RESTRICTED = 511,
  UX_RESTRICTIONS_LIMIT_CONTENT = 32,
  UX_RESTRICTIONS_LIMIT_STRING_LENGTH = 4,
  UX_RESTRICTIONS_NO_DIALPAD = 1,
  UX_RESTRICTIONS_NO_FILTERING = 2,
  UX_RESTRICTIONS_NO_KEYBOARD = 8,
  UX_RESTRICTIONS_NO_SETUP = 64,
  UX_RESTRICTIONS_NO_TEXT_MESSAGE = 128,
  UX_RESTRICTIONS_NO_VIDEO = 16,
  UX_RESTRICTIONS_NO_VOICE_TRANSCRIPTION = 256,
}

export interface ActiveCarUxRestrictions {
  maxContentDepth: number;
  maxCumulativeContentItems: number;
  maxRestrictedStringLength: number;
  activeRestrictions: Array<CarUxRestrictions>;
}

export interface AppFocusState {
  isFocusOwned?: boolean;
  isFocusActive?: boolean;
}

export interface AndroidAutomotive extends HybridObject<{ android: 'kotlin' }> {
  registerCarUxRestrictionsListener(
    callback: (restrictions: ActiveCarUxRestrictions) => void
  ): CleanupCallback;
  getCarUxRestrictions(): ActiveCarUxRestrictions;
  registerAppFocusListener(callback: (state: AppFocusState) => void): CleanupCallback;
  getAppFocusState(): AppFocusState;
  requestAppFocus(): CleanupCallback;
}
