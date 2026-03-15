import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImagePlus, MessageCircle, Send, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Message } from "./backend.d";
import { useGetMessages, usePostMessage } from "./hooks/useQueries";

const queryClient = new QueryClient();

const NAME_KEY = "chat_display_name";

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  const date = new Date(ms);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-[oklch(0.65_0.18_200)]",
  "bg-[oklch(0.65_0.18_145)]",
  "bg-[oklch(0.65_0.18_300)]",
  "bg-[oklch(0.65_0.18_55)]",
  "bg-[oklch(0.65_0.18_25)]",
  "bg-[oklch(0.65_0.18_260)]",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function MessageBubble({
  message,
  isOwn,
  showName,
}: {
  message: Message;
  isOwn: boolean;
  showName: boolean;
}) {
  const imageUrl = message.image?.getDirectURL();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 mb-1 ${
        isOwn ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {!isOwn && (
        <Avatar className="w-7 h-7 shrink-0 mb-1">
          <AvatarFallback
            className={`text-[10px] font-semibold text-white ${getAvatarColor(
              message.senderName,
            )}`}
          >
            {getInitials(message.senderName)}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`flex flex-col max-w-[70%] sm:max-w-[60%] ${
          isOwn ? "items-end" : "items-start"
        }`}
      >
        {showName && !isOwn && (
          <span className="text-xs font-semibold text-muted-foreground mb-1 ml-1">
            {message.senderName}
          </span>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 shadow-bubble ${
            isOwn
              ? "bubble-own rounded-br-sm"
              : "bubble-other border border-border rounded-bl-sm"
          }`}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Shared by user"
              className="rounded-xl max-w-full mb-2 max-h-64 object-cover"
            />
          )}
          {message.content && (
            <p className="text-sm leading-relaxed break-words">
              {message.content}
            </p>
          )}
        </div>

        <span className="text-[10px] text-muted-foreground mt-1 mx-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

function ChatApp({ myName }: { myName: string }) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(0);

  const { data: messages = [], isLoading } = useGetMessages();
  const { mutateAsync: postMessage, isPending } = usePostMessage();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      scrollToBottom();
      prevCountRef.current = messages.length;
    }
  }, [messages.length, scrollToBottom]);

  // Initial scroll
  useEffect(() => {
    if (messages.length > 0 && prevCountRef.current === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      prevCountRef.current = messages.length;
    }
  }, [messages.length]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    if (!text.trim() && !imageFile) return;
    setIsUploading(true);
    try {
      await postMessage({
        senderName: myName,
        content: text.trim(),
        imageFile: imageFile ?? undefined,
      });
      setText("");
      clearImage();
    } catch (err) {
      toast.error("Failed to send message. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isBusy = isPending || isUploading;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 shrink-0 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-base text-foreground leading-tight">
            Public Chat Room
          </h1>
          <p className="text-xs text-muted-foreground">
            Open to everyone — say hello!
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          <Users className="w-3.5 h-3.5" />
          <span>{new Set(messages.map((m) => m.senderName)).size} online</span>
        </div>
      </header>

      {/* Messages */}
      <main
        className="flex-1 overflow-y-auto chat-bg px-3 py-4 space-y-0.5"
        data-ocid="chat.panel"
      >
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-3"
            data-ocid="chat.loading_state"
          >
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            data-ocid="chat.empty_state"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to say something!
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isOwn = msg.senderName === myName;
              const prevMsg = messages[idx - 1];
              const showName =
                !isOwn && (!prevMsg || prevMsg.senderName !== msg.senderName);
              return (
                <MessageBubble
                  key={`${msg.senderName}-${msg.timestamp}-${idx}`}
                  message={msg}
                  isOwn={isOwn}
                  showName={showName}
                />
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input area */}
      <footer className="bg-card border-t border-border px-3 py-3 shrink-0">
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-20 object-cover rounded-xl border border-border"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
              data-ocid="chat.close_button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageSelect}
            className="hidden"
            id="image-upload"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            data-ocid="chat.upload_button"
          >
            <ImagePlus className="w-5 h-5" />
          </Button>

          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={isBusy}
            className="flex-1 rounded-full bg-muted border-transparent focus-visible:ring-1 focus-visible:ring-primary"
            data-ocid="chat.input"
          />

          <Button
            size="icon"
            className="shrink-0 rounded-full"
            onClick={handleSend}
            disabled={isBusy || (!text.trim() && !imageFile)}
            data-ocid="chat.submit_button"
          >
            {isBusy ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function NameModal({ onSetName }: { onSetName: (name: string) => void }) {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = input.trim();
    if (!name) return;
    localStorage.setItem(NAME_KEY, name);
    onSetName(name);
  }

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
        data-ocid="chat.dialog"
      >
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-2">
            <MessageCircle className="w-6 h-6 text-primary-foreground" />
          </div>
          <DialogTitle className="font-display text-center text-xl">
            Welcome to the Chat!
          </DialogTitle>
          <DialogDescription className="text-center">
            Enter your name to start chatting. No account needed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your display name…"
            autoFocus
            maxLength={30}
            data-ocid="chat.input"
          />
          <Button
            type="submit"
            disabled={!input.trim()}
            className="w-full"
            data-ocid="chat.submit_button"
          >
            Join Chat
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Inner() {
  const [myName, setMyName] = useState<string | null>(() =>
    localStorage.getItem(NAME_KEY),
  );

  if (!myName) {
    return <NameModal onSetName={setMyName} />;
  }

  return <ChatApp myName={myName} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Inner />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
