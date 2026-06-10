import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

type Props = {
	text: string;
	autoPlay?: boolean;
};

export function SpeakButton({ text, autoPlay = false }: Props) {
	const [speaking, setSpeaking] = useState(false);
	const hasAutoPlayed = useRef(false);
	const supported = typeof window !== "undefined" && "speechSynthesis" in window;

	const speak = useCallback(() => {
		if (!supported) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.onend = () => setSpeaking(false);
		utterance.onerror = () => setSpeaking(false);
		window.speechSynthesis.speak(utterance);
		setSpeaking(true);
	}, [text, supported]);

	useEffect(() => {
		if (autoPlay && !hasAutoPlayed.current && supported && text.trim()) {
			hasAutoPlayed.current = true;
			speak();
		}
	}, [autoPlay, text, supported, speak]);

	useEffect(() => {
		return () => {
			if (speaking) window.speechSynthesis.cancel();
		};
	}, [speaking]);

	function toggle() {
		if (speaking) {
			window.speechSynthesis.cancel();
			setSpeaking(false);
		} else {
			speak();
		}
	}

	if (!supported) return null;

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggle}
			title={speaking ? "Stop speaking" : "Read aloud"}
			className={cn(
				"h-6 w-6 rounded transition-colors",
				speaking
					? "text-primary"
					: "text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-foreground",
			)}
		>
			{speaking ? <VolumeXIcon size={13} /> : <Volume2Icon size={13} />}
			<span className="sr-only">{speaking ? "Stop speaking" : "Read aloud"}</span>
		</Button>
	);
}
