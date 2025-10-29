"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider@1.2.3";

import { cn } from "./utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  // 슬라이더 값의 퍼센트 계산
  const currentValue = Array.isArray(value) ? value[0] : min;
  const percentage = ((currentValue - min) / (max - min)) * 100;
  
  // Thumb 크기를 고려한 정확한 그라디언트 위치 계산
  // Thumb의 크기가 20px (size-5)이고, 중앙에서 그라디언트가 변경되어야 함
  const thumbSize = 20; // px
  const adjustedPercentage = percentage;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-4 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
        )}
        style={{
          background: `linear-gradient(to right, #3B82F6 ${adjustedPercentage}%, #FFFFFF ${adjustedPercentage}%)`
        }}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
          )}
          style={{ background: 'transparent' }}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="bg-white border-2 border-slate-300 block size-5 shrink-0 rounded-full shadow-lg transition-[box-shadow] hover:shadow-xl hover:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-500/30 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
