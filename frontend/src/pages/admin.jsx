import { useEffect, useState } from "react";
import { Search, Users, Edit, Save, X, Shield, User as UserIcon, Settings } from "lucide-react";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ role: "", skills: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const limit = 5;

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/auth/users?page=${page}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setFilteredUsers(data.users);
        setPages(data.pages);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user.email);
    setFormData({
      role: user.role,
      skills: user.skills?.join(", "),
    });
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/auth/update-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: editingUser,
            role: formData.role,
            skills: formData.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || "Failed to update user");
        return;
      }

      setEditingUser(null);
      setFormData({ role: "", skills: "" });
      fetchUsers();
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter users by debounced query
  useEffect(() => {
    const q = debouncedQuery.toLowerCase();
    setFilteredUsers(
      users.filter((u) => u.email.toLowerCase().includes(q))
    );
  }, [debouncedQuery, users]);

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin": return <Shield className="w-4 h-4 text-error" />;
      case "moderator": return <Settings className="w-4 h-4 text-warning" />;
      default: return <UserIcon className="w-4 h-4 text-info" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "badge-error";
      case "moderator": return "badge-warning";
      default: return "badge-info";
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8" />
          Admin Panel
        </h1>
        <p className="text-base-content/70">Manage users and their permissions</p>
      </div>

      {/* Search */}
      <div className="card bg-base-100 shadow-xl border border-base-300 mb-6 animate-fade-in">
        <div className="card-body">
          <div className="form-control">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
              <input
                type="text"
                className="input input-bordered pl-10 input-focus w-full"
                placeholder="Search users by email..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <>
            {filteredUsers.map((user, index) => (
              <div
                key={user._id}
                className="card bg-base-100 shadow-lg border border-base-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10">
                            <span className="text-sm font-bold">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{user.email}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getRoleIcon(user.role)}
                            <span className={`badge ${getRoleColor(user.role)} badge-sm`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-13">
                        <p className="text-sm text-base-content/70 mb-2">
                          <strong>Skills:</strong>{" "}
                          {user.skills && user.skills.length > 0
                            ? user.skills.join(", ")
                            : "No skills assigned"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {editingUser === user.email ? (
                        <div className="space-y-3 min-w-64">
                          <select
                            className="select select-bordered select-sm w-full"
                            value={formData.role}
                            onChange={(e) =>
                              setFormData({ ...formData, role: e.target.value })
                            }
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>

                          <input
                            type="text"
                            placeholder="Comma-separated skills"
                            className="input input-bordered input-sm w-full"
                            value={formData.skills}
                            onChange={(e) =>
                              setFormData({ ...formData, skills: e.target.value })
                            }
                          />

                          <div className="flex gap-2">
                            <button
                              className="btn btn-success btn-sm btn-glow"
                              onClick={handleUpdate}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setEditingUser(null)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm btn-glow"
                          onClick={() => handleEditClick(user)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && !loading && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                <h3 className="text-xl font-semibold mb-2">No users found</h3>
                <p className="text-base-content/70">
                  {searchQuery ? "Try adjusting your search terms" : "No users available"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {page} of {pages}
          </span>
          <button
            className="btn btn-outline btn-sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(p + 1, pages))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
