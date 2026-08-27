import LoginView from '@/views/LoginView';
import { RouteScreen } from '@/components/RouteScreen';

export const metadata = {
  title: 'Log In',
  description: 'Log in to your V-VISA travel-agent account.',
};

export default function LoginPage() {
  return (
    <RouteScreen view="login">
      <LoginView />
    </RouteScreen>
  );
}
