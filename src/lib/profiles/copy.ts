import type { Line } from "../attempt";
import type { ProfileErrorCode } from "./validate";

export const profileCopy = {
  title: { id: "Siapa yang mau mengetik?", en: "Who's typing?" },
  hint: {
    id: "Pilih nama, atau tambah anak baru.",
    en: "Pick a name, or add a new kid.",
  },
  empty: {
    id: "Belum ada nama di komputer ini.",
    en: "No names on this computer yet.",
  },
  loading: { id: "Sebentar.", en: "One moment." },
  add: { id: "Tambah anak", en: "Add kid" },
  manage: { id: "Kelola", en: "Manage" },
  done: { id: "Selesai", en: "Done" },
  manageHint: {
    id: "Pilih ubah atau hapus. Hapus perlu persetujuan.",
    en: "Choose edit or delete. Delete asks first.",
  },
  edit: { id: "Ubah", en: "Edit" },
  remove: { id: "Hapus", en: "Delete" },
  back: { id: "Kembali", en: "Back" },
  cancel: { id: "Batal", en: "Cancel" },
  save: { id: "Simpan", en: "Save" },
  name: { id: "Nama", en: "Name" },
  nameHint: { id: "1 sampai 20 huruf.", en: "1 to 20 letters." },
  pickAvatar: { id: "Pilih gambar", en: "Pick a picture" },
  pickColor: { id: "Pilih warna", en: "Pick a colour" },
  last: { id: "Terakhir", en: "Last" },
  switchKid: { id: "Ganti", en: "Switch" },
  createTitle: { id: "Tambah anak", en: "Add kid" },
  deleteYes: { id: "Ya, hapus", en: "Yes, delete" },
  deleteBody: {
    id: "Nama ini akan hilang dari komputer ini.",
    en: "This name will leave this computer.",
  },
  saveFailed: {
    id: "Komputer ini belum bisa menyimpan nama.",
    en: "This computer cannot save names yet.",
  },
  nameRequired: { id: "Tulis nama dulu.", en: "Type a name first." },
  nameTooLong: {
    id: "Nama paling panjang 20 huruf.",
    en: "Use 20 letters or fewer.",
  },
  nameDuplicate: {
    id: "Nama ini sudah ada.",
    en: "That name is already here.",
  },
  choiceInvalid: {
    id: "Pilih gambar dan warna.",
    en: "Pick a picture and a colour.",
  },
  notFound: {
    id: "Nama ini sudah tidak ada.",
    en: "That name is no longer here.",
  },
} as const satisfies Record<string, Line>;

export function editHeading(name: string): Line {
  return { id: `Ubah ${name}`, en: `Edit ${name}` };
}

export function deleteTitle(name: string): Line {
  return { id: `Hapus ${name}?`, en: `Delete ${name}?` };
}

export function profileErrorLine(code: ProfileErrorCode): Line {
  switch (code) {
    case "name-required":
      return profileCopy.nameRequired;
    case "name-too-long":
      return profileCopy.nameTooLong;
    case "name-duplicate":
      return profileCopy.nameDuplicate;
    case "avatar-invalid":
    case "color-invalid":
      return profileCopy.choiceInvalid;
    case "not-found":
      return profileCopy.notFound;
    case "unavailable":
      return profileCopy.saveFailed;
  }
}
