import { BotIcon, UserIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatBubble, type MessageSender } from "#/components/ui/custom/ChatBubble";
import { cn } from "#/lib/utils";

type Props = {
	senderRole: string;
	content: string;
	isStreaming?: boolean;
};

const VALID_SENDERS: MessageSender[] = ["user", "assistant", "system", "tool"];

export function ChatMessage({ senderRole, content, isStreaming }: Props) {
	const isUser = senderRole === "user";
	const safeSender = (
		VALID_SENDERS.includes(senderRole as MessageSender) ? senderRole : "assistant"
	) as MessageSender;

	return (
		<ChatBubble senderRole={safeSender}>
			<div
				aria-hidden
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-full",
					isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
				)}
			>
				{isUser ? <UserIcon size={16} /> : <BotIcon size={16} />}
			</div>

			<div
				className={cn(
					"max-w-[80%] rounded-lg px-4 py-3 text-sm",
					isUser
						? "rounded-tr-none bg-primary text-primary-foreground"
						: "rounded-tl-none bg-muted",
					isStreaming && !isUser && "after:ml-0.5 after:animate-pulse after:content-['▋']",
				)}
			>
				{isUser ? (
					<p className="whitespace-pre-wrap break-words">{content}</p>
				) : (
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						components={{
							code({ className, children, ...props }) {
								const isInline = !className;
								return isInline ? (
									<code
										className="rounded bg-background/50 px-1 py-0.5 font-mono text-xs"
										{...props}
									>
										{children}
									</code>
								) : (
									<pre className="overflow-x-auto rounded bg-background/50 p-3 font-mono text-xs">
										<code {...props}>{children}</code>
									</pre>
								);
							},
							a({ children, href }) {
								return (
									<a
										href={href}
										target="_blank"
										rel="noopener noreferrer"
										className="underline underline-offset-2 opacity-80 hover:opacity-100"
									>
										{children}
									</a>
								);
							},
						}}
					>
						{content}
					</ReactMarkdown>
				)}
			</div>
		</ChatBubble>
	);
}
