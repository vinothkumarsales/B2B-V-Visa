import { CareersDemoExperience } from '@/components/careers/CareersDemoExperience';
import {
  careersDemoCandidate,
  careersDemoEuropeBenefits,
  careersDemoJobs,
  careersDemoMaterials,
  careersDemoMetrics,
  careersDemoTimeline,
} from '@/server/careers/demo-data';

export const metadata = {
  title: 'Careers Demo Mode | VVisa Careers',
  description: 'Fixture-only VVisa Careers demo journey for presentation.',
};

export default function CareersDemoPage() {
  return (
    <CareersDemoExperience
      candidate={careersDemoCandidate}
      timeline={careersDemoTimeline}
      jobs={careersDemoJobs}
      metrics={careersDemoMetrics}
      materials={careersDemoMaterials}
      europeBenefits={careersDemoEuropeBenefits}
    />
  );
}
