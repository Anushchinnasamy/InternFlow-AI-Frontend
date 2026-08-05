import { Badge } from "@/components/ui/badge";

export function SkillPills({ skills, max = 3 }: { skills: string[]; max?: number }) {
  const visible = skills.slice(0, max);
  const remaining = skills.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((skill) => (
        <Badge key={skill} variant="secondary" className="text-[11px]">
          {skill}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-[11px]">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}
