import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { APPLICATION_STATUSES } from "@/lib/domain/enums";
import { APPLICATION_STATUS_LABEL } from "@/lib/domain/labels";

export type ApplicationFilterValues = {
  q: string;
  durum: string;
  sehir: string;
  rol: string;
  minUye: string;
  maxUye: string;
};

/**
 * Düz GET formu: filtreleme durumu URL'de yaşıyor, bu yüzden paylaşılabilir
 * ve Excel dışa aktarımı aynı parametreleri yeniden kullanabiliyor.
 */
export function ApplicationFilters({
  values,
  cities,
  roles,
}: {
  values: ApplicationFilterValues;
  cities: string[];
  roles: { id: string; name: string }[];
}) {
  return (
    <form
      method="get"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
    >
      <Field label="Ara" htmlFor="q" className="sm:col-span-2">
        <Input
          id="q"
          name="q"
          defaultValue={values.q}
          placeholder="Grup adı, referans veya üye adı"
        />
      </Field>

      <Field label="Durum" htmlFor="durum">
        <Select id="durum" name="durum" defaultValue={values.durum}>
          <option value="">Tümü</option>
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {APPLICATION_STATUS_LABEL[status]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Şehir" htmlFor="sehir">
        <Select id="sehir" name="sehir" defaultValue={values.sehir}>
          <option value="">Tümü</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Rol" htmlFor="rol">
        <Select id="rol" name="rol" defaultValue={values.rol}>
          <option value="">Tümü</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Min üye" htmlFor="minUye">
          <Input
            id="minUye"
            name="minUye"
            type="number"
            min={1}
            defaultValue={values.minUye}
          />
        </Field>
        <Field label="Maks üye" htmlFor="maxUye">
          <Input
            id="maxUye"
            name="maxUye"
            type="number"
            min={1}
            defaultValue={values.maxUye}
          />
        </Field>
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-6">
        <Button type="submit" size="sm">
          Filtrele
        </Button>
        <LinkButton href="/panel/basvurular" variant="ghost" size="sm">
          Temizle
        </LinkButton>
      </div>
    </form>
  );
}
