# EDAI · CRM de seguimiento

CRM para negocios que venden por suscripción: clientes, planes (incluye grupales 2x1),
vencimientos, recordatorios y mensajes de WhatsApp personalizados. Cada negocio tiene
sus datos separados y EDAI los administra desde un panel maestro.

- **Next.js 14** (App Router) + **Supabase** (Auth, Postgres con RLS)
- Despliegue en **Vercel**
- Desarrollado por **EDAI**

## Rutas

| Ruta | Quién | Qué hace |
|---|---|---|
| `/login` | Todos | Ingreso con correo y contraseña |
| `/crm` | Dueño y vendedores | El CRM del negocio |
| `/admin` | EDAI | Panel maestro: crear negocios, cobrar, suspender, métricas |
| `/auth/confirm` | — | Enlaces de invitación y recuperación |
| `/actualizar-clave` | — | Crear o cambiar contraseña |

## Instalación paso a paso

### 1. Supabase
1. En tu proyecto de Supabase abre **SQL Editor**, pega `supabase/migrations/001_crm_seguimiento.sql` y presiona **Run**.
2. **Authentication > URL Configuration**
   - Site URL: `https://crm.edaisoftware.com` (o el dominio que uses)
   - Redirect URLs: agrega `https://crm.edaisoftware.com/**` y `http://localhost:3000/**`
3. **Authentication > Emails > Templates**: cambia *Invite user* y *Reset password* con lo que está en `supabase/plantillas-correo.md`.
4. **Authentication > Providers > Email**: deja activo *Email*. Si no quieres que cualquiera se registre solo, desactiva *Allow new users to sign up* (las invitaciones siguen funcionando).
5. Recomendado para producción: configura un SMTP propio en **Authentication > Emails > SMTP Settings** (el correo de prueba de Supabase tiene un límite bajo por hora).

### 2. Tu usuario de EDAI (administrador)
1. **Authentication > Users > Add user**: crea tu usuario con tu correo y contraseña.
2. En **SQL Editor** ejecuta (con tu correo):
   ```sql
   insert into public.edai_admins (user_id)
   select id from auth.users where email = 'tu-correo@edaisoftware.com';
   ```

### 3. GitHub
```bash
git init
git add .
git commit -m "CRM de seguimiento EDAI"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/edai-crm.git
git push -u origin main
```

### 4. Vercel
1. **Add New > Project** e importa el repositorio.
2. En **Environment Variables** agrega las 4 variables de `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secreta, nunca en el navegador)
   - `NEXT_PUBLIC_SITE_URL` = `https://crm.edaisoftware.com`
3. **Deploy**.
4. **Settings > Domains**: agrega `crm.edaisoftware.com`. Como tus nameservers ya están en Vercel, se configura solo.

### 5. Primer negocio
1. Entra a `https://crm.edaisoftware.com` con tu usuario. Te lleva a `/admin`.
2. **Nuevo negocio**: nombre, dueño, correo, plan EDAI y fecha de pago.
3. El dueño recibe un correo, crea su contraseña y entra a su CRM.
4. Desde **Vendedores**, el dueño invita a su equipo.

## Desarrollo local
```bash
cp .env.example .env.local   # y completa los valores
npm install
npm run dev                  # http://localhost:3000
```

## Cómo cobra EDAI
- En `/admin` cada negocio tiene **Plan EDAI** y **Pagado hasta**.
- Si la fecha pasa por más de 5 días, o lo marcas **Suspendido**, el negocio queda en
  **solo lectura**: ve sus datos pero no puede hacer cambios hasta que renueve.

## Roles
- **Dueño**: todo su negocio; administra planes, plantillas, vendedores y datos del negocio.
- **Vendedor**: solo sus propios clientes y recordatorios.
- La base de datos aplica estas reglas (RLS); no dependen solo de la pantalla.
