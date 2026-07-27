import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import {
  deleteFormFieldAction,
  toggleFormFieldAction,
  toggleMusicalRoleAction,
} from "@/lib/actions/form-settings";
import type { FormFieldScope, FormFieldType } from "@/lib/domain/enums";
import {
  FORM_FIELD_SCOPE_LABEL,
  FORM_FIELD_TYPE_LABEL,
} from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/utils";
import { FieldForm } from "./field-form";
import { RoleForm } from "./role-form";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Form Ayarları" };

export default async function FormSettingsPage() {
  const [settings, fields, roles] = await Promise.all([
    prisma.applicationSettings.findUnique({ where: { id: "singleton" } }),
    prisma.applicationFormField.findMany({
      orderBy: [{ scope: "asc" }, { order: "asc" }],
    }),
    prisma.musicalRole.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Form Ayarları"
        description="Başvuru formunun açık/kapalı durumu, grup büyüklüğü, ek alanlar ve müzikal roller."
      />

      <SettingsForm settings={settings} />

      <Card>
        <CardHeader
          title="Form alanları"
          description="Başvuru formuna ek alan ekleyin. Sistem alanları silinemez, yalnızca pasife alınabilir."
        />
        <TableWrap>
          <Table className="min-w-[760px]">
            <thead>
              <tr>
                <Th>Alan</Th>
                <Th>Tip</Th>
                <Th>Kapsam</Th>
                <Th>Zorunlu</Th>
                <Th>Seçenekler</Th>
                <Th>Durum</Th>
                <Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 ? (
                <EmptyRow colSpan={7}>Tanımlı alan yok.</EmptyRow>
              ) : (
                fields.map((field) => {
                  const options = parseJson<string[]>(field.optionsJson, []);
                  return (
                    <Tr key={field.id}>
                      <Td>
                        <span className="font-medium">{field.label}</span>
                        <span className="block text-xs text-subtle">
                          {field.key}
                        </span>
                      </Td>
                      <Td className="text-muted">
                        {FORM_FIELD_TYPE_LABEL[field.type as FormFieldType] ??
                          field.type}
                      </Td>
                      <Td className="text-muted">
                        {FORM_FIELD_SCOPE_LABEL[field.scope as FormFieldScope] ??
                          field.scope}
                      </Td>
                      <Td className="text-muted">
                        {field.required ? "Evet" : "Hayır"}
                      </Td>
                      <Td className="max-w-56 truncate text-muted">
                        {options.length > 0 ? options.join(", ") : "—"}
                      </Td>
                      <Td>
                        {field.isSystem ? (
                          <Badge tone="info">Sistem</Badge>
                        ) : field.isActive ? (
                          <Badge tone="success">Aktif</Badge>
                        ) : (
                          <Badge tone="neutral">Pasif</Badge>
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex gap-2">
                          <form action={toggleFormFieldAction}>
                            <input type="hidden" name="id" value={field.id} />
                            <Button type="submit" variant="secondary" size="sm">
                              {field.isActive ? "Pasife al" : "Aktifleştir"}
                            </Button>
                          </form>
                          {!field.isSystem ? (
                            <form action={deleteFormFieldAction}>
                              <input type="hidden" name="id" value={field.id} />
                              <Button type="submit" variant="danger" size="sm">
                                Sil
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Yeni form alanı" />
          <FieldForm />
        </Card>

        <Card>
          <CardHeader
            title="Müzikal roller"
            description="Başvuru formundaki rol listesi. Pasif roller yeni başvurularda görünmez."
          />
          <CardBody className="space-y-4">
            <RoleForm />

            <ul className="flex flex-wrap gap-2">
              {roles.length === 0 ? (
                <li className="text-sm text-muted">Tanımlı rol yok.</li>
              ) : (
                roles.map((role) => (
                  <li key={role.id}>
                    <form action={toggleMusicalRoleAction}>
                      <input type="hidden" name="id" value={role.id} />
                      <button
                        type="submit"
                        title={
                          role.isActive
                            ? "Pasife almak için tıklayın"
                            : "Aktifleştirmek için tıklayın"
                        }
                        className={
                          role.isActive
                            ? "rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                            : "rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-subtle line-through"
                        }
                      >
                        {role.name}
                      </button>
                    </form>
                  </li>
                ))
              )}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
