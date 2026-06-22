import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/theme';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'alert' | 'confirm';
  isDestructive?: boolean;
}

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  type = 'alert',
  isDestructive = false,
}: ConfirmModalProps) {
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.alertOverlay}>
        <View style={[styles.alertContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.alertTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.alertMessage, { color: theme.muted }]}>{message}</Text>
          
          <View style={styles.alertBtns}>
            {type === 'confirm' ? (
              <TouchableOpacity
                onPress={onClose}
                style={[styles.alertBtn, styles.alertCancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.alertCancelBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => {
                onClose();
                if (type === 'confirm' && onConfirm) {
                  onConfirm();
                }
              }}
              style={[
                styles.alertBtn,
                {
                  backgroundColor: isDestructive ? theme.destructive : theme.primary,
                  flex: type === 'confirm' ? 1 : 0,
                  minWidth: type === 'alert' ? 120 : 0,
                }
              ]}
            >
              <Text style={styles.alertSaveBtnText}>
                {type === 'confirm' ? 'Confirm' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alertContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  alertBtns: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  alertBtn: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  alertCancelBtn: {
    flex: 1,
    borderWidth: 1,
  },
  alertCancelBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
  alertSaveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
