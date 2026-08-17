import { Badge } from "@/components/ui/badge";
import { CASE_PRIORITIES } from "@/lib/constants";
import type { Tables } from "@/types/database";

type Case = Tables<"cases">;

interface PriorityBadgeProps {
  priority: Case["priority"];
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = CASE_PRIORITIES[priority];

  return (
    <Badge
      variant="outline"
      className={`${config.color} font-medium border ${className}`}
    >
      {config.label}
    </Badge>
  );
}
