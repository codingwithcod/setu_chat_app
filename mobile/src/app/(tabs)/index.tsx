import { ComingSoon } from '@/components/ComingSoon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen } from '@/components/ui/Screen';

// Chats tab. Phase 2 replaces the placeholder with the live conversation list.
export default function ChatsScreen() {
  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader brand />
      <ComingSoon
        icon="chatbubbles-outline"
        title="Your chats will appear here"
        subtitle="Conversations, unread badges and presence land in the next step."
      />
    </Screen>
  );
}
