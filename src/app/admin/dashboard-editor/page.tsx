import { Copy, Eye, History, Send, Archive, CalendarClock, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminFeatureSnapshot } from '@/server/admin/feature-flags';
import { getDashboardSections } from '@/server/admin/read-preview';
import { DashboardSectionEditor } from '@/components/admin/DashboardSectionEditor';

const actions = [
  ['Edit', Eye],
  ['Preview', Eye],
  ['Duplicate', Copy],
  ['Publish', Send],
  ['Schedule', CalendarClock],
  ['Archive', Archive],
  ['History', History],
] as const;

export default async function DashboardEditorPage() {
  const [sections, flags] = await Promise.all([getDashboardSections(), Promise.resolve(adminFeatureSnapshot())]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Dashboard Editor</h2>
        <p className="text-sm text-vvisa-text-muted">Edit versioned drafts, preview configuration, and publish without redeploying.</p>
      </div>

      {!flags.ADMIN_DASHBOARD_WRITES_ENABLED && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Dashboard writes are disabled. Draft, publish, reorder, schedule, and archive actions are locked in Phase 1.
        </div>
      )}

      <div className="space-y-3">
        {sections.map((section) => (
          <Card key={section.key} className="rounded-lg border-vvisa-border-subtle">
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[auto_1.4fr_1fr_1fr_1.2fr] lg:items-center">
              <GripVertical className="size-4 text-vvisa-text-muted" />
              <div>
                <p className="font-medium">{section.name}</p>
                <p className="text-xs text-vvisa-text-muted">{section.key} - {section.type.replaceAll('_', ' ')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{section.status}</Badge>
                <Badge variant="outline">Order {section.displayOrder}</Badge>
                <Badge variant="outline">{section.isVisible ? 'Visible' : 'Hidden'}</Badge>
              </div>
              <div className="text-xs text-vvisa-text-muted">
                <p>Audience: all partners</p>
                <p>Updated: {section.updatedAt.getTime() ? section.updatedAt.toLocaleDateString('en-IN') : 'Seed fallback'}</p>
                <p>Published: {section.lastPublishedAt?.toLocaleDateString('en-IN') ?? 'Not published'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {flags.ADMIN_DASHBOARD_WRITES_ENABLED && <DashboardSectionEditor section={{ key: section.key, name: section.name, displayOrder: section.displayOrder, isVisible: section.isVisible, config: section.config }} />}
                {actions.filter(([label]) => label !== 'Edit').map(([label, Icon]) => (
                  <Button key={label} size="sm" variant="outline" disabled>
                    <Icon className="mr-1.5 size-3" />
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
