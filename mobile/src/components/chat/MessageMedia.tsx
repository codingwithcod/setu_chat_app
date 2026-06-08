import { View } from 'react-native';

import type { MessageFile } from '@/types';
import { ChatAudio } from './ChatAudio';
import { ChatVideo } from './ChatVideo';
import { FileCard } from './FileCard';
import { ImageGrid } from './ImageGrid';

/** Renders a message's attachments: image collage, video, audio, or file cards. */
export function MessageMedia({ files, onOwn }: { files: MessageFile[]; onOwn: boolean }) {
  if (!files || files.length === 0) return null;
  const images = files.filter((f) => f.file_type === 'image');
  const others = files.filter((f) => f.file_type !== 'image');

  return (
    <View style={{ gap: 4 }}>
      {images.length > 0 && <ImageGrid files={images} />}
      {others.map((f) => {
        if (f.file_type === 'video') return <ChatVideo key={f.id} file={f} />;
        if (f.file_type === 'audio') return <ChatAudio key={f.id} file={f} onOwn={onOwn} />;
        return <FileCard key={f.id} file={f} onOwn={onOwn} />;
      })}
    </View>
  );
}
