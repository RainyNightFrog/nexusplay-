import { AccountSettingsLayout } from "@/components/settings/account-settings-layout";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountSettingsLayout>{children}</AccountSettingsLayout>;
}
