import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { AlertTriangle, AlertCircle } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
}: ConfirmDialogProps) {
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={[
              styles.iconContainer, 
              { backgroundColor: isDanger ? '#ff000015' : theme.primary + '15' }
            ]}>
              {isDanger ? (
                <AlertTriangle size={24} color={theme.destructive} />
              ) : (
                <AlertCircle size={24} color={theme.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.description, { color: theme.mutedForeground }]}>{description}</Text>
            </View>
          </View>
          
          <View style={styles.footer}>
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.btn, styles.cancelBtn, { borderColor: theme.border }]}
            >
              <Text style={[styles.btnText, { color: theme.text }]}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => {
                onConfirm();
                onClose();
              }} 
              style={[
                styles.btn, 
                styles.confirmBtn, 
                { backgroundColor: isDanger ? theme.destructive : theme.primary }
              ]}
            >
              <Text style={[styles.btnText, { color: '#ffffff' }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmBtn: {
    borderWidth: 0,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  }
});
