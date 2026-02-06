import {
  AndroidAutomotiveTelemetryPermissions,
  type AndroidAutoPermissions,
  AndroidAutoTelemetryPermissions,
  type Telemetry,
  useAndroidAutoTelemetry,
} from '@iternio/react-native-auto-play';
import React, { useEffect, useState } from 'react';
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
    requestTelemetryPermissions: true,
  });

  const [mergedTelemetry, setMergedTelemetry] = useState<Telemetry>();

  useEffect(() => {
    setMergedTelemetry((value) => {
      return {
        ...value,
        ...Object.fromEntries(
          Object.entries(telemetry ?? {}).filter(([_, entry]) => entry != null)
        ),
      };
    });
  }, [telemetry]);

  return (
    <>
      <Text>telemetry permissions granted: {String(permissionsGranted)}</Text>
      {error ? <Text>error: {error}</Text> : null}
      {mergedTelemetry ? <Text>---- latest telemetry ----</Text> : null}
      {Object.entries(mergedTelemetry ?? {}).map(([key, value]) => {
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
      {mergedTelemetry?.vehicle ? <Text>---- vehicle data ----</Text> : null}
      {mergedTelemetry?.vehicle?.name ? (
        <Text>
          vehicle name: {mergedTelemetry.vehicle.name.value} (
          {mergedTelemetry.vehicle.name.timestamp})
        </Text>
      ) : null}
      {mergedTelemetry?.vehicle?.year ? (
        <Text>
          vehicle year: {mergedTelemetry.vehicle.year.value} (
          {mergedTelemetry.vehicle.year.timestamp})
        </Text>
      ) : null}
      {mergedTelemetry?.vehicle?.manufacturer ? (
        <Text>
          vehicle manufacturer: {mergedTelemetry.vehicle.manufacturer.value} (
          {mergedTelemetry.vehicle.manufacturer.timestamp})
        </Text>
      ) : null}
    </>
  );
}

export default React.memo(TelemetryView);
