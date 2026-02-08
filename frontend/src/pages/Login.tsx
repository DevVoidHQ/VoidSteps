import { SignIn } from "@clerk/clerk-react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark p-4">
      <SignIn
        routing="path"
        path="/login"
        fallbackRedirectUrl="/"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border border-border shadow-none",
          },
        }}
      />
    </div>
  );
}
