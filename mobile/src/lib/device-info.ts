import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Device info for session tracking.
 *
 * Mobile equivalent of the web's src/lib/device-info.ts. Instead of parsing
 * User-Agent strings, we use expo-device for native-level device information.
 */

export interface DeviceInfo {
  /** Human-readable name, e.g. "Setu Mobile on Android 14 · SM-S908B" */
  deviceName: string;
  /** Always "mobile_app" for the native app. */
  deviceType: 'mobile_app';
  /** null — not a browser. */
  browserName: null;
  /** e.g. "Android 14" or "iOS 17.5" */
  osName: string;
}

export function getDeviceInfo(): DeviceInfo {
  const os = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS;
  const version = Device.osVersion ?? '';
  // Use major version only for cleaner display (e.g. "Android 14" not "Android 14.0.1")
  const majorVersion = version.split('.')[0] || '';
  const osName = majorVersion ? `${os} ${majorVersion}` : os;

  // Build a human-readable device name.
  // On Android: Device.modelName = "SM-S908B", Device.deviceName = "Galaxy S22 Ultra"
  // On iOS:     Device.modelName = "iPhone 15 Pro", Device.deviceName = "John's iPhone"
  const model = Device.modelName ?? '';
  const deviceName = model
    ? `Setu Mobile on ${osName} · ${model}`
    : `Setu Mobile on ${osName}`;

  return {
    deviceName,
    deviceType: 'mobile_app',
    browserName: null,
    osName,
  };
}
