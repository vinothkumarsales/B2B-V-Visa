import LoginView from '@/views/LoginView';
import { RouteScreen } from '@/components/RouteScreen';

export default function LoginPage() {
  return (
    <RouteScreen view="login">
      <LoginView />
    </RouteScreen>
  );
}
