import AuthLayout from "@/components/layout/AuthLayout";
import SignupWizard from "@/components/auth/SignupWizard";

const Signup = () => {
  return (
    <AuthLayout>
      <SignupWizard />
    </AuthLayout>
  );
};

export default Signup;
