import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ComingSoonView from '@/views/ComingSoonView';

export default function ClarifyPage() {
  return (
    <RouteScreen view="clarify" authenticated>
      <DashboardShell>
        <ComingSoonView
          type="clarify"
          badge="Phase 3 Preview"
          title="Clarify AI Assistant"
          subtitle="Instant embassy rules lookup, document validation intelligence, and multi-country visa checklist recommendations powered by advanced AI."
        />
      </DashboardShell>
    </RouteScreen>
  );
}
