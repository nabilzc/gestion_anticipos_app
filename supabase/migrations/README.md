# Migraciones de Supabase

Este directorio contiene las migraciones SQL para la base de datos de Supabase del proyecto **Gestión de Anticipos - FUNDAEC**.

## Convención de nombres

Los archivos siguen el formato:
```
NNN_descripcion_breve.sql
```

Donde `NNN` es un número secuencial de 3 dígitos (001, 002, 003...).

## Migraciones disponibles

| # | Archivo | Descripción |
|---|---------|-------------|
| 001 | `001_create_profiles.sql` | Tabla de perfiles de usuario con RLS, triggers de auto-creación y auto-actualización |

## Cómo ejecutar una migración

1. Ve al **Dashboard de Supabase** → **SQL Editor**
2. Copia y pega el contenido del archivo `.sql`
3. Haz clic en **Run**
4. Verifica en **Table Editor** que la tabla se creó correctamente

## Notas importantes

- **Ejecuta las migraciones en orden numérico.**
- Cada migración es **idempotente** cuando es posible (`IF NOT EXISTS`).
- Las políticas RLS protegen los datos a nivel de fila.
- Los triggers automatizan la creación de registros relacionados.
