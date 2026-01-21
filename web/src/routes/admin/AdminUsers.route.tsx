import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Search, ArrowLeft, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";
import { fetchAllUsers, toggleAdminStatus } from "@/features/admin/api";
import { UserProfile } from "@/features/admin/types";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";

export function AdminUsersRoute() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      setLoading(true);

      try {
        console.log("🔄 [ADMIN USERS] Calling fetchAllUsers()...");

        const data = await fetchAllUsers();

        if (!isMounted) return;

        console.log(
          `✅ [ADMIN USERS] Successfully fetched ${data?.length || 0} users`,
        );

        setUsers(data || []);
      } catch (error: unknown) {
        if (!isMounted) return;

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("❌ [ADMIN USERS] Error fetching users:", error);

        toast.error(`Failed to load users: ${errorMessage}`);
        setUsers([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      console.log("🔄 [ADMIN USERS] Toggling admin status:", {
        userId,
        currentStatus,
        targetStatus: !currentStatus,
      });

      const loadingToast = toast.loading("Updating admin status...");

      // Optimistically update UI
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, is_admin: !currentStatus } : u,
        ),
      );

      console.log("🔄 [ADMIN USERS] Calling toggleAdminStatus()...");

      await toggleAdminStatus(userId, !currentStatus);

      toast.dismiss(loadingToast);
      console.log("✅ [ADMIN USERS] Admin status updated successfully");
      toast.success("Admin status updated!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ [ADMIN USERS] Error toggling admin:", error);

      // Revert optimistic update
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, is_admin: currentStatus } : u,
        ),
      );

      toast.error(`Failed to update admin status: ${errorMessage}`);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/events")}
            className="mb-4"
          >
            <ArrowLeft className="size-4 mr-2" />
            Back to Events
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                User Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View and manage all registered users
              </p>
            </div>
            <Badge variant="default" className="h-8">
              {users.length} Total Users
            </Badge>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5" />
              <Input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Loading users...
              </p>
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "No users match your search" : "No users found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((userProfile) => (
              <Card key={userProfile.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <User className="size-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {userProfile.full_name || "No Name"}
                            </h3>
                            {userProfile.is_admin && (
                              <Badge variant="default">Admin</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="size-4" />
                            <span>{userProfile.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pl-15">
                        <div className="flex items-center gap-1">
                          <Calendar className="size-4" />
                          <span>
                            Joined{" "}
                            {new Date(
                              userProfile.created_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            ID: {userProfile.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant={
                          userProfile.is_admin ? "destructive" : "default"
                        }
                        size="sm"
                        onClick={() =>
                          handleToggleAdmin(
                            userProfile.id,
                            userProfile.is_admin,
                          )
                        }
                      >
                        {userProfile.is_admin ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Export Options */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Export User Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Export user emails and data for marketing or administrative
              purposes.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const emails = users.map((u) => u.email).join(", ");
                  navigator.clipboard.writeText(emails);
                  toast.success("All emails copied to clipboard!");
                }}
              >
                Copy All Emails
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const csv = [
                    ["Email", "Name", "Admin", "Created At"].join(","),
                    ...users.map((u) =>
                      [
                        u.email,
                        u.full_name || "",
                        u.is_admin ? "Yes" : "No",
                        new Date(u.created_at).toLocaleDateString(),
                      ].join(","),
                    ),
                  ].join("\n");

                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "visuallyspeaking-users.csv";
                  a.click();
                  toast.success("User data exported!");
                }}
              >
                Export as CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
