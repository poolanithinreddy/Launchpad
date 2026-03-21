import { LoginView } from "@/components/login-view";

type LoginPageProps = {
  searchParams?: {
    error?: string | string[];
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const authError = Array.isArray(searchParams?.error)
    ? searchParams?.error[0]
    : searchParams?.error;

  return <LoginView authError={authError} />;
}
