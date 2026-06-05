import { ComingSoon } from '@/components/ComingSoon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen } from '@/components/ui/Screen';

// Activity tab. Phase 6 adds the in-app notifications panel.
export default function ActivityScreen() {
  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader title="Activity" />
      <ComingSoon
        icon="notifications-outline"
        title="No activity yet"
        subtitle="Mentions, new messages and group updates will show up here."
      />
    </Screen>
  );
}
