import { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl bg-slate-800/80 border border-slate-700 p-6 shadow-soft ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
