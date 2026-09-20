import type { Metadata } from "next";
import DelegateRegistrationForm from "@/components/DelegateRegistrationForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Government Registration",
};

export default function RegisterPage() {
  return <DelegateRegistrationForm />;
}
