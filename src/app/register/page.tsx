import SignupView from '@/views/SignupView';
import { RouteScreen } from '@/components/RouteScreen';

export const metadata = {
  title: 'Register',
  description: 'Create your V-VISA account.',
};

export default function RegisterPage() {
  return (
    <RouteScreen view="signup">
      <SignupView />
    </RouteScreen>
  );
}
