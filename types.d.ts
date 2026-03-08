declare module 'react-native-config' {
  export interface NativeConfig {
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_REGION?: string;
  }
  
  export const Config: NativeConfig;
  export default Config;
}