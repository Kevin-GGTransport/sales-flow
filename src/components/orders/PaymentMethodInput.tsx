import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PaymentMethodInput({
  id,
  defaultValue,
  history,
}: {
  id: string;
  defaultValue?: string;
  history: string[];
}) {
  const listId = `${id}-history`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>付款方式 *</Label>
      <Input
        id={id}
        name="paymentMethod"
        list={history.length > 0 ? listId : undefined}
        defaultValue={defaultValue}
        placeholder="例如：现金、微信、银行转账"
        maxLength={100}
        autoComplete="off"
        required
      />
      {history.length > 0 ? (
        <>
          <datalist id={listId}>
            {history.map((method) => (
              <option key={method} value={method} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">
            可直接填写，也可从历史使用记录中选择。
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          首次填写后，后续新建单据可从历史记录中选择。
        </p>
      )}
    </div>
  );
}
