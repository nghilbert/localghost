import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { useAppField } from "#/hooks/use-app-field";
import { cn } from "#/lib/utils";
import { FieldShell } from "./FieldShell";
import type { BaseFieldProps } from "./types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
});

/** Parses a `yyyy-mm-dd` field value into a local `Date`, or `undefined` when empty/invalid. */
function parseValue(value: string): Date | undefined {
	if (!value) return undefined;
	const parsed = new Date(`${value}T00:00:00`);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Serializes a `Date` to a `yyyy-mm-dd` string in local time. */
function toValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

type DateFieldProps = BaseFieldProps & {
	placeholder?: string;
};

export function DateField({
	label,
	description,
	orientation,
	placeholder = "Pick a date",
}: DateFieldProps) {
	const { field, isFieldValid } = useAppField<string>();
	const [open, setOpen] = useState(false);
	const selected = parseValue(field.state.value);

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						id={field.name}
						type="button"
						variant="outline"
						aria-invalid={!isFieldValid}
						onBlur={field.handleBlur}
						className={cn("justify-start font-normal", !selected && "text-muted-foreground")}
					>
						<CalendarIcon />
						{selected ? dateFormatter.format(selected) : placeholder}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={selected}
						onSelect={(date) => {
							field.handleChange(date ? toValue(date) : "");
							setOpen(false);
						}}
						autoFocus
					/>
				</PopoverContent>
			</Popover>
		</FieldShell>
	);
}
