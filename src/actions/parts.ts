"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { partSchema } from "@/lib/validation";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function parseForm(formData: FormData) {
  return partSchema.safeParse({
    partNumber: formData.get("partNumber") ?? "",
    name: formData.get("name") ?? "",
    brand: formData.get("brand") ?? "",
    description: formData.get("description") ?? "",
    kind: formData.get("kind") ?? "OWNED",
    minQty: formData.get("minQty") ?? "",
    suggestedSalePrice: formData.get("suggestedSalePrice") ?? "",
  });
}

export async function createPart(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
    }
    const { brand, suggestedSalePrice, ...rest } = parsed.data;
    const part = await prisma.part.create({
      data: {
        ...rest,
        brand: brand || null,
        suggestedSalePrice,
        inventory: { create: {} }, // qty=0, avgCost=0
      },
    });
    revalidatePath("/parts");
    revalidatePath("/inventory");
    return { ok: true, id: part.id };
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) {
      return { ok: false, error: "配件号已存在" };
    }
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function updatePart(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
    }
    const { brand, suggestedSalePrice, ...rest } = parsed.data;
    const current = await prisma.part.findUnique({
      where: { id },
      select: {
        kind: true,
        _count: { select: { purchaseLines: true, saleLines: true } },
      },
    });
    if (!current) return { ok: false, error: "配件不存在" };
    if (
      rest.kind !== current.kind &&
      current._count.purchaseLines + current._count.saleLines > 0
    ) {
      return {
        ok: false,
        error: "已有买入或卖出记录的配件不能更改库存类型",
      };
    }
    await prisma.part.update({
      where: { id },
      data: { ...rest, brand: brand || null, suggestedSalePrice },
    });
    revalidatePath("/parts");
    revalidatePath("/inventory");
    revalidatePath(`/parts/${id}`);
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) {
      return { ok: false, error: "配件号已存在" };
    }
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function togglePartActive(id: string, next: boolean): Promise<ActionResult> {
  try {
    await requireUser();
    await prisma.part.update({ where: { id }, data: { isActive: next } });
    revalidatePath("/parts");
    revalidatePath("/inventory");
    revalidatePath(`/parts/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "操作失败" };
  }
}
