import SignupView from '@/views/SignupView';
import { RouteScreen } from '@/components/RouteScreen';

export default function RegisterPage() {
  return (
    <RouteScreen view="signup">
      <SignupView />
    </RouteScreen>
  );
}
