"use client";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function RevealOnScroll({ 
  children, 
  delay = 0, 
  className 
}: { 
  children: React.ReactNode; 
  delay?: number; 
  className?: string 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setIsVisible(true), delay);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-1000 ease-out transform",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16",
        className
      )}
    >
      {children}
    </div>
  );
}
