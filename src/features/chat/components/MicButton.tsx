import { MicIcon, MicOffIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "#/lib/utils";

type Props = {
	onTranscript: (text: string) => void;
	disabled?: boolean;
};

type SpeechRec = {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
	onend: (() => void) | null;
	onerror: (() => void) | null;
	start(): void;
	stop(): void;
	abort(): void;
};

type SpeechRecCtor = new () => SpeechRec;

function getSpeechRecognition(): SpeechRecCtor | null {
	if (typeof window === "undefined") return null;
	const w = window as Window & {
		SpeechRecognition?: SpeechRecCtor;
		webkitSpeechRecognition?: SpeechRecCtor;
	};
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function MicButton({ onTranscript, disabled }: Props) {
	const [listening, setListening] = useState(false);
	const recognitionRef = useRef<SpeechRec | null>(null);
	const supported = getSpeechRecognition() !== null;

	useEffect(() => {
		return () => {
			recognitionRef.current?.abort();
		};
	}, []);

	function toggle() {
		if (listening) {
			recognitionRef.current?.stop();
			setListening(false);
			return;
		}

		const SR = getSpeechRecognition();
		if (!SR) return;

		const rec = new SR();
		rec.continuous = false;
		rec.interimResults = false;
		rec.lang = navigator.language || "en-US";

		rec.onresult = (event) => {
			const transcript = event.results[0]?.[0]?.transcript ?? "";
			if (transcript) onTranscript(transcript);
		};

		rec.onend = () => setListening(false);
		rec.onerror = () => setListening(false);

		recognitionRef.current = rec;
		rec.start();
		setListening(true);
	}

	if (!supported) {
		return (
			<button
				type="button"
				disabled
				title="Speech recognition not supported in this browser"
				className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-muted-foreground/40"
			>
				<MicOffIcon size={15} />
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={toggle}
			disabled={disabled}
			title={listening ? "Stop recording" : "Voice input"}
			className={cn(
				"flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
				listening
					? "animate-pulse bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
					: "text-muted-foreground hover:bg-muted hover:text-foreground",
				disabled && "cursor-not-allowed opacity-40",
			)}
		>
			<MicIcon size={15} />
			<span className="sr-only">{listening ? "Stop recording" : "Voice input"}</span>
		</button>
	);
}
