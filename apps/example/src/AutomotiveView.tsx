import {
  type ActiveCarUxRestrictions,
  type AppFocusState,
  HybridAndroidAutomotive,
  useAndroidAutoTelemetry,
} from '@iternio/react-native-auto-play';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import Config from 'react-native-config';

export default function AutomotiveView() {
  if (Platform.OS !== 'android' || !Config.isAutomotiveApp) {
    return null;
  }

  return <Content />;
}

function Content() {
  const { telemetry } = useAndroidAutoTelemetry({ requestTelemetryPermissions: false });

  const [appFocusState, setAppFocusState] = useState<AppFocusState | null>(
    HybridAndroidAutomotive?.getAppFocusState() ?? null
  );
  const [uxRestrictions, setUxRestrictions] = useState<ActiveCarUxRestrictions | null>(
    HybridAndroidAutomotive?.getCarUxRestrictions() ?? null
  );

  useEffect(() => {
    return HybridAndroidAutomotive?.registerAppFocusListener(setAppFocusState);
  }, []);

  useEffect(() => {
    return HybridAndroidAutomotive?.registerCarUxRestrictionsListener(setUxRestrictions);
  }, []);

  useEffect(() => {
    if (telemetry?.parkingBrakeOn?.value) {
      return HybridAndroidAutomotive?.requestAppFocus();
    }
  }, [telemetry?.parkingBrakeOn?.value]);

  return (
    <View>
      <Text>----------- Automotive -----------</Text>
      {Object.entries(appFocusState ?? {}).map(([key, value]) => (
        <Text key={key}>
          appFocusState.{key}: {String(value)}
        </Text>
      ))}
      {Object.entries(uxRestrictions ?? {}).map(([key, value]) => (
        <Text key={key}>
          uxRestrictions.{key}: {String(value)}
        </Text>
      ))}
    </View>
  );
}
