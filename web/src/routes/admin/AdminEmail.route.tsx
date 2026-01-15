import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { email, adminOperations } from '@/lib/edge/client';
import { useApp } from '@/app/hooks';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Checkbox } from '@/ui/checkbox';
import { Badge } from '@/ui/badge';
import { ArrowLeft, Mail, CheckCircle, Send } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export function AdminEmailRoute() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadUsers = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      console.log('🔄 [EMAIL PAGE] Starting to fetch users...');
      
      try {
        console.log('🔄 [EMAIL PAGE] Calling adminOperations.getAllUsers()...');
        
        const data = await adminOperations.getAllUsers();
        
        if (!isMounted) return;

        console.log(`✅ [EMAIL PAGE] Successfully fetched ${data?.length || 0} users`);
        
        setUsers(data || []);
        setLoading(false);
      } catch (error: unknown) {
        if (!isMounted) return;
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [EMAIL PAGE] Error in loadUsers:', error);
        
        toast.error(`Failed to load users: ${errorMessage}`);
        setUsers([]);
        setLoading(false);
      }
    };
    
    loadUsers();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleSendEmails = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter an email message');
      return;
    }

    try {
      setSending(true);

      const selectedEmails = users
        .filter(u => selectedUsers.has(u.id))
        .map(u => u.email);

      console.log(`📧 Sending emails to ${selectedEmails.length} recipients...`);
      console.log('Subject:', subject);
      console.log('Recipients:', selectedEmails);

      // Call the Edge Function to send emails
      const result = await email.sendEmail(selectedEmails, subject, message);
      
      console.log(`✅ Successfully sent ${result.emailsSent} emails`);
      
      toast.success(
        `✅ Successfully sent email to ${result.emailsSent} recipient(s)!`,
        { duration: 5000 }
      );
      
      // Clear form
      setSubject('');
      setMessage('');
      setSelectedUsers(new Set());
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : '';
      
      if (errorMessage.includes('AbortError') || errorMessage.includes('aborted') || errorName === 'AbortError') {
        console.log('⚠️ Send emails aborted (component unmounted)');
        return;
      }
      
      console.error('❌ Error sending emails:', error);
      
      // Check if it's a configuration error
      if (errorMessage.includes('not configured') || errorMessage.includes('RESEND_API_KEY')) {
        toast.error(
          '⚠️ Email service not configured. Please deploy the send-email Edge Function and add your RESEND_API_KEY to Supabase secrets.',
          { duration: 8000 }
        );
      } else {
        toast.error(errorMessage || 'Failed to send emails');
      }
    } finally {
      setSending(false);
    }
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600 mb-4">
              Admin access required
            </p>
            <Button onClick={() => navigate('/events')} className="w-full">
              Go to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/events')}
            className="mb-4"
          >
            <ArrowLeft className="size-4 mr-2" />
            Back to Events
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Email Users</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Send emails to your registered users
              </p>
            </div>
            <Badge variant="default" className="h-8">
              <Mail className="size-4 mr-1" />
              {selectedUsers.size} Selected
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Select Recipients</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                >
                  {selectedUsers.size === users.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500 text-center py-4">Loading users...</p>
              ) : users.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No users found</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {users.map((userProfile) => (
                    <div
                      key={userProfile.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => toggleUser(userProfile.id)}
                    >
                      <Checkbox
                        checked={selectedUsers.has(userProfile.id)}
                        onCheckedChange={() => toggleUser(userProfile.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {userProfile.full_name || 'No Name'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {userProfile.email}
                        </p>
                      </div>
                      {selectedUsers.has(userProfile.id) && (
                        <CheckCircle className="size-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Compose */}
          <Card>
            <CardHeader>
              <CardTitle>Compose Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <Input
                  type="text"
                  placeholder="Enter email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <Textarea
                  placeholder="Enter your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={12}
                  className="resize-none"
                />
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleSendEmails}
                  disabled={sending || selectedUsers.size === 0 || !subject.trim() || !message.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Send className="size-4 mr-2" />
                  {sending ? 'Sending...' : `Send to ${selectedUsers.size} User(s)`}
                </Button>
              </div>

              {selectedUsers.size > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Recipients:</strong>{' '}
                    {users
                      .filter(u => selectedUsers.has(u.id))
                      .map(u => u.email)
                      .slice(0, 3)
                      .join(', ')}
                    {selectedUsers.size > 3 && ` +${selectedUsers.size - 3} more`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}