"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  loading?: boolean;
};

export const SearchInput = forwardRef<HTMLInputElement, Props>(
  function SearchInput({ loading, className = "", ...rest }, ref) {
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type="search"
          autoFocus
          aria-label="Search applications"
          placeholder="Search by name, email, or notes…  (Cmd/Ctrl + K)"
          className={
            "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 " +
            "text-base text-ink shadow-sm outline-none transition " +
            "placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/30 " +
            className
          }
          {...rest}
        />
        {loading ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          >
            <span className="block h-2 w-2 animate-pulse rounded-full bg-accent" />
          </span>
        ) : null}
      </div>
    );
  }
);
