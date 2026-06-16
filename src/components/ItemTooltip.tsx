import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Item } from '../types';

interface ItemTooltipProps {
  item: Item;
  children: React.ReactNode;
}

export function ItemTooltip({ item, children }: ItemTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            align="center"
            className="z-50 max-w-[300px] bg-background border border-primary/50 shadow-[0_0_15px_rgba(0,242,255,0.2)] rounded-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            sideOffset={5}
          >
            <div className="p-3 border-b border-border-subtle bg-foreground/5">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-sans font-bold text-primary">{item.name}</h3>
                <span className="text-yellow-400 font-mono text-sm">{item.gold?.total || 0}g</span>
              </div>
              <p className="text-xs text-text-secondary italic">{item.plaintext}</p>
            </div>
            
            {(item.description || item.stats) && (
              <div className="p-3 text-sm text-text-primary">
                {item.description ? (
                  <div 
                    className="space-y-2 [&>mainText>stats]:block [&>mainText>stats]:mb-2 [&>mainText>active]:block [&>mainText>active]:mt-2 [&>mainText>passive]:block [&>mainText>passive]:mt-2" 
                    dangerouslySetInnerHTML={{ __html: item.description }} 
                  />
                ) : (
                  <div className="text-success font-mono">
                    {Object.entries(item.stats || {}).map(([key, val]) => (
                      <div key={key}>+{val} {key.replace(/Flat|Mod|Percent/g, '')}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <TooltipPrimitive.Arrow className="fill-primary/50" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
