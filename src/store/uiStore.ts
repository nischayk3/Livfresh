import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
    visible: boolean;
    title: string;
    message: string;
    type: AlertType;
    buttons: AlertButton[];
    onClose?: () => void;
}

interface UIStore {
    alert: AlertState;
    showAlert: (params: {
        title: string;
        message: string;
        type?: AlertType;
        buttons?: AlertButton[];
        onClose?: () => void;
    }) => void;
    hideAlert: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    alert: {
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    },
    showAlert: ({ title, message, type = 'info', buttons = [], onClose }) =>
        set({
            alert: {
                visible: true,
                title,
                message,
                type,
                buttons: buttons.length > 0 ? buttons : [{ text: 'OK' }],
                onClose,
            },
        }),
    hideAlert: () =>
        set((state) => {
            if (state.alert.onClose) {
                state.alert.onClose();
            }
            return {
                alert: {
                    ...state.alert,
                    visible: false,
                },
            };
        }),
}));
