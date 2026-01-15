import { useState } from 'react';
import { fetchAllUsers, sendEmail } from './api';
import { UserProfile } from './types';

export function useAdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    loadUsers,
    refreshUsers: loadUsers
  };
}

export function useAdminEmail() {
  const [sending, setSending] = useState(false);

  const sendEmailToUsers = async (subject: string, body: string, recipients: string[]) => {
    setSending(true);
    try {
      return await sendEmail(recipients, subject, body);
    } finally {
      setSending(false);
    }
  };

  return {
    sending,
    sendEmail: sendEmailToUsers
  };
}