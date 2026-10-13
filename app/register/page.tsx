import type { Metadata } from "next";
import DelegateRegistrationForm from "@/components/DelegateRegistrationForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delegate Registration",
};

export default function RegisterPage() {
  return <DelegateRegistrationForm />;
}
