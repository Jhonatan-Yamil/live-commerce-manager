import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { APP_PALETTE } from "../../theme/palette";
import { getBackendOrigin, usersApi } from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

function resolveAvatarSrc(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getBackendOrigin()}${path}`;
}

export default function ProfileDialog({ open, onClose, user, updateUser }) {
  const { notifyError, notifySuccess, notifyWarning } = useNotification();
  const logoInputRef = useRef(null);

  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(user?.full_name || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [open, user?.full_name]);

  const hasLogo = useMemo(() => Boolean(user?.logo_path), [user?.logo_path]);

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const res = await usersApi.uploadLogo(file);
      updateUser({ ...user, ...res.data });
      notifySuccess("Icono actualizado");
    } catch {
      notifyError("No se pudo subir el icono");
    }
  };

  const handleSave = async () => {
    const trimmedName = (fullName || "").trim();
    const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmPassword);

    if (!trimmedName) {
      notifyWarning("El nombre de la tienda es obligatorio");
      return;
    }

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        notifyWarning("Completa los 3 campos de contrasena para cambiarla");
        return;
      }
      if (newPassword !== confirmPassword) {
        notifyWarning("La confirmacion no coincide con la nueva contrasena");
        return;
      }
      if (newPassword.length < 6) {
        notifyWarning("La nueva contrasena debe tener al menos 6 caracteres");
        return;
      }
    }

    setSaving(true);
    try {
      if (trimmedName !== (user?.full_name || "")) {
        const profileRes = await usersApi.updateProfile({ full_name: trimmedName });
        updateUser({ ...user, ...profileRes.data });
      }

      if (wantsPasswordChange) {
        await usersApi.updatePassword({
          current_password: currentPassword,
          new_password: newPassword,
        });
      }

      notifySuccess("Perfil actualizado");
      onClose();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      notifyError(typeof detail === "string" ? detail : "No se pudo actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900, color: APP_PALETTE.text.primary }}>
        Editar perfil
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={resolveAvatarSrc(user?.logo_path)}
              sx={{ width: 58, height: 58, bgcolor: APP_PALETTE.brand.primary, fontWeight: 900 }}
            >
              {!hasLogo ? <PersonRoundedIcon /> : null}
            </Avatar>
            <Box>
              <Typography fontWeight={800} color={APP_PALETTE.text.primary}>
                Icono de la tienda
              </Typography>
              <Typography variant="body2" color={APP_PALETTE.text.secondary}>
                Puedes subir una imagen para tu perfil.
              </Typography>
            </Box>
          </Stack>

          <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />
          <Button
            variant="outlined"
            startIcon={<UploadFileRoundedIcon />}
            onClick={() => logoInputRef.current?.click()}
            sx={{ borderRadius: 999, alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
          >
            Cambiar icono
          </Button>

          <Divider />

          <TextField
            label="Nombre de la tienda"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            fullWidth
          />

          <Typography fontWeight={800} color={APP_PALETTE.text.primary}>
            Cambiar contrasena (opcional)
          </Typography>

          <TextField
            label="Contrasena actual"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            fullWidth
          />
          <TextField
            label="Nueva contrasena"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            fullWidth
          />
          <TextField
            label="Confirmar nueva contrasena"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ borderRadius: 999, textTransform: "none", fontWeight: 700 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 999, textTransform: "none", fontWeight: 800 }}
        >
          Guardar cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
}
