"use client";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings2 } from "lucide-react";

export type CompressionLevel = 'low' | 'medium' | 'high';

interface CompressionOptionsProps {
  value: CompressionLevel;
  onChange: (value: CompressionLevel) => void;
}

export function CompressionOptions({ value, onChange }: CompressionOptionsProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center space-x-2 mb-3">
        <Settings2 className="h-5 w-5 text-primary" />
        <Label htmlFor="compression-group" className="text-base font-semibold">
          Compression Level
        </Label>
      </div>
      <RadioGroup
        id="compression-group"
        value={value}
        onValueChange={(val) => onChange(val as CompressionLevel)}
        className="grid grid-cols-3 gap-4"
      >
        {(['low', 'medium', 'high'] as CompressionLevel[]).map((level) => (
          <div key={level}>
            <RadioGroupItem value={level} id={`compression-${level}`} className="peer sr-only" />
            <Label
              htmlFor={`compression-${level}`}
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <span className="capitalize font-medium">{level}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
