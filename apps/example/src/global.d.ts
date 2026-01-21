declare module 'react-native-config' {
  export interface NativeConfig {
    isAutomotiveApp: string;
    minSdkVersion: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
