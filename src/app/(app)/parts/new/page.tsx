import { PartForm } from "@/components/parts/PartForm";
import { PageHeader } from "@/components/ui/page-header";

export default function NewPartPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="新建配件" />
      <PartForm />
    </div>
  );
}
