import { ComingSoon } from '@/components/ComingSoon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen } from '@/components/ui/Screen';

// Contacts tab. Phase 5 adds user search, suggestions and starting chats.
export default function ContactsScreen() {
  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader title="Contacts" />
      <ComingSoon
        icon="people-outline"
        title="Find people to chat with"
        subtitle="Search users, see suggestions and start new conversations or groups."
      />
    </Screen>
  );
}
