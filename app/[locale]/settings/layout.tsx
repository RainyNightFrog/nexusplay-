import { AccountSettingsLayout } from "@/components/settings/account-settings-layout";

export default function SettingsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountSettingsLayout>{children}</AccountSettingsLayout>;
}
