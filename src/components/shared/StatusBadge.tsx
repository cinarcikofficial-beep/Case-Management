import { Badge } from "@/components/ui/badge";
import { CASE_STATUSES } from "@/lib/constants";
import type { Tables } from "@/types/database";

type Case = Tables<"cases">;

interface StatusBadgeProps {
  status: Case["status"];
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = CASE_STATUSES[status];

  return (
    <Badge
      variant="outline"
      className={`${config.color} font-medium border ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 pulse-dot" />
      {config.label}
    </Badge>
  );
}
