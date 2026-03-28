import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="container flex min-h-dvh items-center justify-center py-10">
      <SignIn />
    </div>
  );
}
