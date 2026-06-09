import { create } from "zustand";

type ModalState = {
  activeModal: string | null;
  modalData: unknown;
  open: (id: string, data?: unknown) => void;
  close: () => void;
};

export const useModalStore = create<ModalState>((set) => ({
  activeModal: null,
  modalData: null,
  open: (id, data = null) => set({ activeModal: id, modalData: data }),
  close: () => set({ activeModal: null, modalData: null })
}));
