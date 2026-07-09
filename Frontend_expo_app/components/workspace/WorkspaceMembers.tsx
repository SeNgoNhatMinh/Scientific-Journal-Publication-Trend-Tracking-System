import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Users, UserPlus, UserMinus, Search } from 'lucide-react-native';
import api from '../../lib/api';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function WorkspaceMembers({
  theme,
  members,
  workspaceId,
  role,
  onMembersUpdated,
}: {
  theme: any;
  members: any[];
  workspaceId: string;
  role: string;
  onMembersUpdated: () => void;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  
  const [memberToKick, setMemberToKick] = useState<any>(null);
  const [isKicking, setIsKicking] = useState(false);

  useEffect(() => {
    if (inviteEmail.trim().length > 2) {
      const delay = setTimeout(async () => {
        setIsSearchingUsers(true);
        try {
          const res = await api.get('/users/search', { params: { keyword: inviteEmail.trim(), limit: 5 } });
          setSuggestedUsers(res.data?.data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearchingUsers(false);
        }
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSuggestedUsers([]);
    }
  }, [inviteEmail]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await api.post(`/workspaces/${workspaceId}/members`, {
        email: inviteEmail.trim(),
        role: 'viewer' // default role
      });
      setInviteEmail('');
      setShowInviteForm(false);
      onMembersUpdated();
      Alert.alert('Success', 'Invitation sent successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not send invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleKickMember = async () => {
    if (!memberToKick) return;
    setIsKicking(true);
    try {
      const targetUserId = memberToKick.userId?.id || memberToKick.userId?._id || memberToKick.userId || memberToKick.user?._id;
      await api.delete(`/workspaces/${workspaceId}/members/${targetUserId}`);
      setMemberToKick(null);
      onMembersUpdated();
      Alert.alert('Success', 'Member removed successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not remove member.');
    } finally {
      setIsKicking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Users size={20} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Workspace Members</Text>
          </View>
          {role === 'owner' && (
            <TouchableOpacity onPress={() => setShowInviteForm(!showInviteForm)} style={[styles.inviteBtn, { backgroundColor: theme.primary + '20' }]}>
              <UserPlus size={16} color={theme.primary} style={{ marginRight: 4 }} />
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>Invite</Text>
            </TouchableOpacity>
          )}
        </View>

        {showInviteForm && (
          <View style={{ marginBottom: 16 }}>
            <View style={[styles.inviteForm, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 0 }]}>
              <TextInput
                style={[styles.inviteInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Enter email address..."
                placeholderTextColor={theme.mutedForeground}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={handleInvite}
                disabled={isInviting || !inviteEmail.trim()}
                style={[styles.sendInviteBtn, { backgroundColor: inviteEmail.trim() ? theme.primary : theme.border }]}
              >
                {isInviting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Send</Text>}
              </TouchableOpacity>
            </View>

            {suggestedUsers.length > 0 && (
              <View style={[styles.suggestionsList, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {suggestedUsers.map((u, idx) => {
                  const existingMember = members.find((m: any) => {
                    const email = m.userId?.email || m.user?.email;
                    return email === u.email;
                  });
                  const isAlreadyMember = !!existingMember;
                  const isPending = existingMember?.status === 'pending';

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                      disabled={isAlreadyMember}
                      onPress={async () => {
                        setInviteEmail(u.email);
                        setSuggestedUsers([]);
                        setIsInviting(true);
                        try {
                          await api.post(`/workspaces/${workspaceId}/members`, { email: u.email, role: 'viewer' });
                          setInviteEmail('');
                          setShowInviteForm(false);
                          onMembersUpdated();
                          Alert.alert('Success', 'Invitation sent successfully!');
                        } catch (err: any) {
                          Alert.alert('Error', err.response?.data?.message || 'Could not send invitation.');
                        } finally {
                          setIsInviting(false);
                        }
                      }}
                    >
                      <View style={[styles.avatar, { width: 28, height: 28, backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.avatarText, { fontSize: 12, color: theme.primary }]}>{u.name?.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '500' }}>{u.name}</Text>
                        <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{u.email}</Text>
                      </View>
                      {isAlreadyMember ? (
                        <View style={{ 
                          paddingHorizontal: 8, 
                          paddingVertical: 4, 
                          backgroundColor: isPending ? '#f59e0b20' : theme.border, 
                          borderRadius: 6,
                          borderWidth: isPending ? 1 : 0,
                          borderColor: isPending ? '#f59e0b50' : 'transparent'
                        }}>
                          <Text style={{ color: isPending ? '#f59e0b' : theme.text, fontSize: 11, fontWeight: '600' }}>
                            {isPending ? 'Pending' : 'Joined'}
                          </Text>
                        </View>
                      ) : (
                        <UserPlus size={16} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {!showInviteForm && (
          !members || members.length === 0 ? (
            <Text style={{ color: theme.mutedForeground, fontSize: 13, textAlign: 'center', marginVertical: 20 }}>
              No members in this workspace.
            </Text>
          ) : (
            members.map((member: any, i: number) => {
              const user = member.userId || member.user || {};
              const displayName = user.name || 'Unknown User';
              const displayEmail = user.email || '';
              const initial = displayName.charAt(0).toUpperCase();

              return (
                <View key={i} style={[styles.memberRow, { borderBottomColor: theme.border }]}>
                  <View style={styles.memberInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: theme.primary }]}>
                        {initial}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>{displayName}</Text>
                      <Text style={[styles.memberEmail, { color: theme.mutedForeground }]} numberOfLines={1}>{displayEmail}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.roleBadge, { backgroundColor: member.role === 'owner' ? theme.primary + '20' : theme.background }]}>
                      <Text style={[styles.roleText, { color: member.role === 'owner' ? theme.primary : theme.text }]}>
                        {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Unknown'}
                      </Text>
                    </View>
                    {member.status === 'pending' && (
                      <View style={[styles.roleBadge, { backgroundColor: '#f59e0b20', borderColor: '#f59e0b50' }]}>
                        <Text style={[styles.roleText, { color: '#f59e0b' }]}>Pending</Text>
                      </View>
                    )}
                    {role === 'owner' && member.role !== 'owner' && (
                      <TouchableOpacity onPress={() => setMemberToKick(member)} style={{ padding: 4, marginLeft: 4 }}>
                        <UserMinus size={18} color={theme.destructive} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )
        )}
      </View>

      <ConfirmDialog
        isOpen={!!memberToKick}
        onClose={() => setMemberToKick(null)}
        onConfirm={handleKickMember}
        title="Remove Member"
        description={`Are you sure you want to remove ${memberToKick?.userId?.name || memberToKick?.user?.name || 'this member'} from the workspace?`}
        confirmText={isKicking ? "Removing..." : "Remove"}
        isDanger={true}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { padding: 20, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  inviteForm: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1 },
  inviteInput: { flex: 1, height: 36, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, marginRight: 8, fontSize: 13 },
  sendInviteBtn: { height: 36, paddingHorizontal: 16, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  suggestionsList: { marginTop: 4, borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
