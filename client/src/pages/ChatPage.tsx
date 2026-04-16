import { ChatPanel } from '../components/ChatPanel';

export function ChatPage() {
  return (
    <div className="max-w-5xl">
      <ChatPanel heightClass="h-[calc(100vh-180px)]" showDateRange />
    </div>
  );
}
