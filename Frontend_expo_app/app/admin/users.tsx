import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Lock,
  Trash2,
  Activity,
  Shield,
  Users,
  ChevronDown,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  researcher: '#8b5cf6',
  lecturer: '#3b82f6',
  student: '#10b981',
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Custom Alert / Confirm Modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'alert' | 'confirm'>('alert');
  const [alertOnConfirm, setAlertOnConfirm] = useState<() => void>(() => {});
  const [alertIsDestructive, setAlertIsDestructive] = useState(false);

  // Role Selection Modal state
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('student');

  const showCustomAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType('alert');
    setAlertOnConfirm(() => {});
    setAlertIsDestructive(false);
    setAlertVisible(true);
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType('confirm');
    setAlertOnConfirm(() => onConfirm);
    setAlertIsDestructive(isDestructive);
    setAlertVisible(true);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const res = await api.get('/users', { params });
      setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
      showCustomAlert(
        'Network Error',
        'Could not load users. Please check that the server is running and accessible.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleToggleStatus = async (userId: string) => {
    setActionId(userId + '-status');
    try {
      const res = await api.put(`/users/${userId}/status`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isActive: res.data.data.isActive } : u))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  };

  const handleChangeRole = (userId: string, currentRole: string) => {
    setSelectedUserId(userId);
    setSelectedRole(currentRole);
    setRoleModalVisible(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUserId) return;
    setRoleModalVisible(false);
    setActionId(selectedUserId + '-role');
    try {
      const res = await api.put(`/users/${selectedUserId}/role`, { role: selectedRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === selectedUserId ? { ...u, role: res.data.data.role } : u))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
      setSelectedUserId(null);
    }
  };

  const handleDelete = (userId: string, name: string) => {
    showCustomConfirm(
      'Delete Account',
      `Are you sure you want to permanently delete "${name}"?`,
      async () => {
        setActionId(userId + '-delete');
        try {
          await api.delete(`/users/${userId}`);
          setUsers((prev) => prev.filter((u) => u._id !== userId));
        } catch (e) {
          console.error(e);
        } finally {
          setActionId(null);
        }
      },
      true
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={18} color={theme.icon} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search users by name or email..."
            placeholderTextColor={theme.muted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centerContainer}>
          <Users size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>No users found.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const roleColor = ROLE_COLORS[item.role] || '#888';
            return (
              <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {/* Info row */}
                <View style={styles.userInfoRow}>
                  <View style={[styles.avatar, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>
                      {item.name ? item.name[0].toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.userEmail, { color: theme.muted }]}>{item.email}</Text>
                  </View>
                </View>

                {/* Badges row */}
                <View style={styles.badgesRow}>
                  <TouchableOpacity
                    onPress={() => handleChangeRole(item._id, item.role)}
                    style={[styles.roleBadge, { borderColor: roleColor + '30', backgroundColor: roleColor + '10' }]}
                  >
                    <Text style={[styles.roleText, { color: roleColor }]}>
                      {item.role.toUpperCase()}
                    </Text>
                    <ChevronDown size={10} color={roleColor} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: item.isActive ? '#10b98115' : '#ef444415',
                        borderColor: item.isActive ? '#10b98130' : '#ef444430',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: item.isActive ? '#10b981' : '#ef4444' },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: item.isActive ? '#10b981' : '#ef4444' }]}>
                      {item.isActive ? 'Active' : 'Blocked'}
                    </Text>
                  </View>
                </View>

                {/* Actions row */}
                <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    onPress={() => handleToggleStatus(item._id)}
                    style={styles.actionBtn}
                  >
                    <Lock size={15} color={item.isActive ? '#fb923c' : '#10b981'} />
                    <Text style={[styles.actionBtnText, { color: item.isActive ? '#fb923c' : '#10b981' }]}>
                      {item.isActive ? 'Block Account' : 'Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(item._id, item.name)}
                    style={styles.actionBtn}
                  >
                    <Trash2 size={15} color={theme.destructive} />
                    <Text style={[styles.actionBtnText, { color: theme.destructive }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Custom Role Selection Modal */}
      <Modal
        visible={roleModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Change User Role</Text>
            <Text style={[styles.modalSubtitle, { color: theme.muted }]}>Select a new role for this user:</Text>
            
            <View style={styles.roleOptionsContainer}>
              {['student', 'researcher', 'lecturer', 'admin'].map((role) => {
                const isSelected = selectedRole === role;
                const roleColor = ROLE_COLORS[role] || '#888';
                return (
                  <TouchableOpacity
                    key={role}
                    onPress={() => setSelectedRole(role)}
                    style={[
                      styles.roleOptionBtn,
                      {
                        borderColor: isSelected ? roleColor : theme.border,
                        backgroundColor: isSelected ? roleColor + '15' : 'transparent',
                      }
                    ]}
                  >
                    <View style={[styles.roleOptionDot, { backgroundColor: isSelected ? roleColor : theme.border }]} />
                    <Text style={[styles.roleOptionText, { color: isSelected ? roleColor : theme.text, fontWeight: isSelected ? 'bold' : 'normal' }]}>
                      {role.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setRoleModalVisible(false)}
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveRole}
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        onConfirm={alertOnConfirm}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        isDestructive={alertIsDestructive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  userCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  roleOptionsContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 20,
  },
  roleOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  roleOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleOptionText: {
    fontSize: 13,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
