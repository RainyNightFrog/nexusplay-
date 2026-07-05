export function isGamePubliclyLive(record: {
  publish_status: string;
  status?: string | null;
}) {
  const approvalStatus = record.status ?? "approved";
  return record.publish_status === "public" && approvalStatus === "approved";
}
