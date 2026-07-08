import { CareersDemoExperience } from '@/components/careers/CareersDemoExperience';
import {
  careersDemoCandidate,
  careersDemoAgents,
  careersDemoApplicationAnswers,
  careersDemoCoverLetter,
  careersDemoEuropeBenefits,
  careersDemoJobs,
  careersDemoMaterials,
  careersDemoMetrics,
  careersDemoRecruiterEmail,
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
      agents={careersDemoAgents}
      jobs={careersDemoJobs}
      metrics={careersDemoMetrics}
      materials={careersDemoMaterials}
      europeBenefits={careersDemoEuropeBenefits}
      coverLetter={careersDemoCoverLetter}
      recruiterEmail={careersDemoRecruiterEmail}
      applicationAnswers={careersDemoApplicationAnswers}
    />
  );
}
