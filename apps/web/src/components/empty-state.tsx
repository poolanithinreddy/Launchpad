import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border border-dashed border-slate-200 bg-white shadow-none">
      <CardHeader>
        <CardTitle className="text-xl text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-2xl text-sm text-slate-600">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
