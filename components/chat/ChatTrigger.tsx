"use client";

import type { ComponentProps } from "react";
import { useChat } from "@/components/chat/ChatProvider";
import { Button } from "@/components/ui/Button";

/**
 * The one client-side island the otherwise-static sections need.
 *
 * Hero and Mission stay server components — only this button ships JavaScript.
 * Marking whole sections "use client" just to attach one onClick is a common
 * and expensive habit in App Router projects.
 */
export function ChatTrigger(props: ComponentProps<typeof Button>) {
  const { open } = useChat();
  return <Button {...props} onClick={open} />;
}
