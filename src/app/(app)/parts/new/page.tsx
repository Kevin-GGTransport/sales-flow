import { PartForm } from "@/components/parts/PartForm";

export default function NewPartPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">新建配件</h1>
      <PartForm />
    </div>
  );
}
