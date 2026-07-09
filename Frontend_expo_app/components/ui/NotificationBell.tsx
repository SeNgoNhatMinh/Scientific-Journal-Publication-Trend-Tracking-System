import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  useColorScheme,
  Alert,
} from 'react-native';
import { Bell, X, Check, Trash2 } from 'lucide-react-native';
import { useSocket } from '../../context/SocketContext';
import { Colors } from '../../constants/theme';
import api from '../../lib/api';

export default function NotificationBell() {
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];
  const { unreadCount, setUnreadCount, notifications, socket } = useSocket();
  const [modalVisible, setModalVisible] = useState(false);
  const [localNotifs, setLocalNotifs] = useState<any[]>([]);

  // Sync notifications from context when opening modal
  const handleOpen = async () => {
    setModalVisible(true);
    setLocalNotifs(notifications);
    
    // Fallback: Fetch from API if socket hasn't received anything but there are unread
    try {
      const res = await api.get('/notifications?limit=10');
      setLocalNotifs(res.data.notifications || []);
    } catch (e) {
      console.log('Failed to fetch notifications', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setLocalNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.log('Error marking all as read', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setLocalNotifs(prev => prev.filter(n => n._id !== id));
      
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.log('Error deleting notification', err);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.notifItem, { borderBottomColor: theme.border, backgroundColor: item.isRead ? 'transparent' : theme.primary + '10' }]}>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.notifMessage, { color: theme.mutedForeground }]} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      <TouchableOpacity onPress={() => deleteNotification(item._id)} style={styles.deleteBtn}>
        <X size={16} color={theme.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <TouchableOpacity style={styles.bellContainer} onPress={handleOpen}>
        <Bell size={24} color={theme.text} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Notifications</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
                    <Check size={14} color={theme.primary} style={{ marginRight: 4 }} />
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>Mark Read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={localNotifs}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Bell size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <Text style={{ color: theme.mutedForeground }}>No notifications</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff', // adjust based on background if needed
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '80%',
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
  },
  closeBtn: {
    padding: 4,
  },
  notifItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  notifContent: {
    flex: 1,
    paddingRight: 12,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  deleteBtn: {
    padding: 8,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  }
});
