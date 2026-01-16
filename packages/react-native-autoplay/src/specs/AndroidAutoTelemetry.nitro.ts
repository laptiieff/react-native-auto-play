import type { HybridObject } from 'react-native-nitro-modules';
import type { CleanupCallback } from '../types/Event';
import type { Telemetry } from '../types/Telemetry';

type PermissionRequestResult = {
  granted: Array<string>;
  denied: Array<string>;
};

export interface AndroidAutoTelemetry extends HybridObject<{ android: 'kotlin' }> {
  /**
   * Register a listener for Android Auto telemetry data. Should be registered only after the telemetry permissions are granted otherwise no data will be received.
   * @param callback the callback to receive the telemetry data
   * @param error the error message if the telemetry listener failed to start
   * @returns callback to remove the listener
   * @namespace Android
   */
  registerTelemetryListener(callback: (tlm?: Telemetry) => void): Promise<CleanupCallback>;
  /**
   * Brings up a template to request specified permissions from the user
   * @param permissions some of `AndroidAutoPermissions`
   * @param message text shown on the template
   * @param grantButtonText primary action button text
   * @param cancelButtonText secondary action button text, if not specified button will not be shown
   */
  requestAutomotivePermissions(
    permissions: Array<string>,
    message: string,
    grantButtonText: string,
    cancelButtonText?: string
  ): Promise<PermissionRequestResult>;
}
