"use client";

import { useTransition } from "react";
import { refreshData } from "@/app/actions";

export default function RefreshButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await refreshData();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title="Reload dashboard data"
      className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.01.75.75 0 1 1-1.3-.75 6 6 0 0 1 9.44-1.347l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.347l-.842-.841v1.273a.75.75 0 0 1-1.5 0V9.818a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H4.18l.84.841a4.5 4.5 0 0 0 7.08-1.01.75.75 0 0 1 1.025-.273Z"
          clipRule="evenodd"
        />
      </svg>
      {isPending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
