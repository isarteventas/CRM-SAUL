# Plantillas de correo de Supabase

Supabase > Authentication > Emails > Templates. Reemplaza el contenido de estas dos plantillas.

## Invite user (Invitar usuario)

Asunto: `Te invitaron al CRM de seguimiento`

```html
<h2>Te dieron acceso al CRM de seguimiento</h2>
<p>Haz clic en el botón para crear tu contraseña y entrar.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/actualizar-clave" style="background:#1E5A4D;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Crear mi contraseña</a></p>
<p style="color:#5B6E68;font-size:13px">CRM de seguimiento desarrollado por EDAI</p>
```

## Reset password (Recuperar contraseña)

Asunto: `Crea una nueva contraseña`

```html
<h2>Crea una nueva contraseña</h2>
<p>Recibimos un pedido para cambiar tu contraseña del CRM de seguimiento.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/actualizar-clave" style="background:#1E5A4D;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Cambiar contraseña</a></p>
<p style="color:#5B6E68;font-size:13px">Si no fuiste tú, ignora este correo.</p>
```
