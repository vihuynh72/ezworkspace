import { Landing } from "@/components/landing/landing";
import { SignBand } from "@/components/route";
import { Teach } from "@/components/teach";
import { isDemoEmployer } from "@/lib/demo";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";

export default function App() {
  // Demo mode: judges reach the employer view without an account (the server allows it with DEMO_MODE=1).
  const demo = isDemoEmployer();
  return (
    <>
      <Authenticated>
        <Teach />
      </Authenticated>
      <Unauthenticated>{demo ? <Teach /> : <Landing />}</Unauthenticated>
      <AuthLoading>
        <SignBand />
      </AuthLoading>
    </>
  );
}
