import { SendingSettingsPage } from "@/components/settings/sending-settings-page";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <SendingSettingsPage workspaceId={workspaceId} />;
}
