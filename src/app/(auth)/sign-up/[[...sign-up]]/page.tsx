import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <SignUp />
    </div>
  );
}
