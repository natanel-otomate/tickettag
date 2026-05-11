import React from "react";

type BadgeStatus = "success" | "failed";

interface BadgeProps {
  status: BadgeStatus;
  label?: string;
}

const Badge: React.FC<BadgeProps> = ({ status, label }) => {
  const isSuccess = status === "success";

  const baseClasses =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-none";

  const colorClasses = isSuccess
    ? "bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20"
    : "bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20";

  const dotClasses = isSuccess ? "bg-green-500" : "bg-red-500";

  const displayLabel = label ?? (isSuccess ? "Success" : "Failed");

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotClasses}`}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
};

export default Badge;