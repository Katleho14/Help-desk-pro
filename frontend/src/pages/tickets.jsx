import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { TicketsContext } from "../contexts/TicketsContext.jsx";
import { Plus, Filter, Calendar, AlertTriangle, AlertCircle, Info, Eye } from "lucide-react";

export default function Tickets() {
  const {
    tickets,
    page,
    pages,
    loading,
    setPage,
    fetchTickets,
    priority,
    setPriority,
  } = useContext(TicketsContext);

  const [form, setForm] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem("token");

  // fetch on mount and when page or priority changes
  useEffect(() => {
    fetchTickets(page, priority);
  }, [fetchTickets, page, priority]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/tickets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form), // only title & description
        }
      );
      const data = await res.json();
      if (res.ok) {
        setForm({ title: "", description: "" });
        setPage(1);
        fetchTickets(1, priority);
      } else {
        alert(data.message || "Ticket creation failed");
      }
    } catch (err) {
      alert("Error creating ticket");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "text-error bg-error/10 border-error/20";
      case "medium": return "text-warning bg-warning/10 border-warning/20";
      case "low": return "text-info bg-info/10 border-info/20";
      default: return "text-base-content bg-base-200 border-base-300";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high": return <AlertTriangle className="w-4 h-4" />;
      case "medium": return <AlertCircle className="w-4 h-4" />;
      case "low": return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Support Tickets</h1>
        <p className="text-base-content/70">Create and manage your support requests</p>
      </div>

      {/* Create Ticket Form */}
      <div className="card bg-base-100 shadow-xl border border-base-300 mb-8 animate-fade-in">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h2 className="card-title text-2xl">Create New Ticket</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Title</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Brief description of your issue"
                  className="input input-bordered input-focus"
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Description</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Provide detailed information about your request..."
                className="textarea textarea-bordered textarea-lg input-focus"
                rows="4"
                required
              />
            </div>

            <div className="card-actions justify-end">
              <button
                className="btn btn-primary btn-glow"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ticket
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-base-content/70" />
          <span className="font-medium">Filter by Priority:</span>
          <select
            className="select select-bordered select-sm"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="text-sm text-base-content/70">
          {tickets ? `${tickets.length} tickets found` : ""}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <>
            {tickets && tickets.map((ticket, index) => (
              <Link
                key={ticket._id}
                className="card card-hover bg-base-100 shadow-lg border border-base-300 p-6 block animate-slide-up"
                to={`/tickets/${ticket._id}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2 text-primary hover:text-primary-focus transition-colors">
                      {ticket.title}
                    </h3>
                    <p className="text-base-content/80 mb-3 line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-base-content/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`badge badge-outline ${getPriorityColor(ticket.priority)} px-3 py-1`}>
                      <span className="flex items-center gap-1">
                        {getPriorityIcon(ticket.priority)}
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-base-content/60">
                      <Eye className="w-4 h-4" />
                      View Details
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {tickets && tickets.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎫</div>
                <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
                <p className="text-base-content/70">Create your first support ticket above</p>
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
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
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
