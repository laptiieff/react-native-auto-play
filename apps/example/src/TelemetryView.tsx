import {
  AndroidAutomotiveTelemetryPermissions,
  type AndroidAutoPermissions,
  AndroidAutoTelemetryPermissions,
  useAndroidAutoTelemetry,
} from '@iternio/react-native-auto-play';
import React from 'react';
import { Text } from 'react-native';
import Config from 'react-native-config';

const ANDROID_AUTO_PERMISSIONS: Array<AndroidAutoPermissions> = [
  AndroidAutoTelemetryPermissions.Speed,
  AndroidAutoTelemetryPermissions.Energy,
  AndroidAutoTelemetryPermissions.Odometer,
];

const ANDROID_AUTOMOTIVE_PERMISSIONS = [
  AndroidAutomotiveTelemetryPermissions.Energy,
  AndroidAutomotiveTelemetryPermissions.EnergyPorts,
  AndroidAutomotiveTelemetryPermissions.ExteriorEnvironment,
  AndroidAutomotiveTelemetryPermissions.Info,
  AndroidAutomotiveTelemetryPermissions.Speed,
];

function TelemetryView() {
  const { permissionsGranted, telemetry, error } = useAndroidAutoTelemetry({
    requiredPermissions:
      Config.isAutomotiveApp === 'true' ? ANDROID_AUTOMOTIVE_PERMISSIONS : ANDROID_AUTO_PERMISSIONS,
    automotivePermissionRequest:
      Config.isAutomotiveApp === 'true'
        ? {
            cancelButtonText: 'Cancel',
            grantButtonText: 'Grant',
            message: 'Grant permission for vehicle telemetry access.',
          }
        : undefined,
  });

  return (
    <>
      <Text>telemetry permissions granted: {String(permissionsGranted)}</Text>
      {error ? <Text>error: {error}</Text> : null}
      {telemetry ? <Text>---- last incoming tlm ----</Text> : null}
      {Object.entries(telemetry ?? {}).map(([key, value]) => {
        if (key === 'vehicle' || value == null) {
          return null;
        }

        return (
          <Text key={key}>
            {`${key}: ${'value' in value ? value.value : ''}`}
            {'timestamp' in value ? ` (${value.timestamp})` : ''}
          </Text>
        );
      })}
      {telemetry?.vehicle?.name ? (
        <Text>
          vehicle name: {telemetry.vehicle.name.value} ({telemetry.vehicle.name.timestamp})
        </Text>
      ) : null}
      {telemetry?.vehicle?.year ? (
        <Text>
          vehicle year: {telemetry.vehicle.year.value} ({telemetry.vehicle.year.timestamp})
        </Text>
      ) : null}
      {telemetry?.vehicle?.manufacturer ? (
        <Text>
          vehicle manufacturer: {telemetry.vehicle.manufacturer.value} (
          {telemetry.vehicle.manufacturer.timestamp})
        </Text>
      ) : null}
    </>
  );
}

export default React.memo(TelemetryView);
