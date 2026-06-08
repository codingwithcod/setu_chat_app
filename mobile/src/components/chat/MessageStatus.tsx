import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import type { MessageStatus as Status } from '@/types';

// rose-400, matching the web's failed state.
const ROSE = '#fb7185';

/**
 * Message delivery status icon — a faithful port of the web's MessageStatus
 * (src/components/chat/MessageStatus.tsx). Circle-based glyphs, inheriting the
 * bubble's text color at 60% opacity:
 *   sending  → spinning dashed ring
 *   sent     → hollow ring
 *   delivered→ ring + small ring
 *   read     → ring + filled dot
 *   failed   → rose ring with "!"
 */
export function MessageStatus({ status, color }: { status: Status; color: string }) {
  if (status === 'sending') return <Spinner color={color} />;

  if (status === 'failed') {
    return (
      <View style={{ opacity: 1 }}>
        <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
          <Circle cx="8" cy="8" r="6" stroke={ROSE} strokeWidth={2} />
          <Line x1="8" y1="5" x2="8" y2="8.5" stroke={ROSE} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx="8" cy="11" r="0.9" fill={ROSE} />
        </Svg>
      </View>
    );
  }

  return (
    <View style={{ opacity: 0.6 }}>
      <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
        <Circle cx="8" cy="8" r="6" stroke={color} strokeWidth={2} />
        {status === 'delivered' && (
          <Circle cx="8" cy="8" r="3" stroke={color} strokeWidth={1.5} />
        )}
        {status === 'read' && <Circle cx="8" cy="8" r="3.5" fill={color} />}
      </Svg>
    </View>
  );
}

function Spinner({ color }: { color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ opacity: 0.6, transform: [{ rotate }] }}>
      <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
        <Circle
          cx="8"
          cy="8"
          r="6"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="28"
          strokeDashoffset="8"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}
